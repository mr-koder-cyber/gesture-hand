'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
  HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

interface VideoElement extends HTMLVideoElement {
  srcObject: MediaStream | null;
}

export default function GestureApp() {
  const videoRef = useRef<VideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const cameraActiveRef = useRef(false);

  const [message, setMessage] = useState('Tunggu gesture...');
  const [cameraStatus, setCameraStatus] = useState(
    'Klik "Aktifkan Kamera" untuk mulai'
  );
  const [error, setError] = useState('');

  const messages = [
    'Salma Fauziah',
    'kelompok 54 Purwa',
    'npm 257006111020',
    'Informatika',
    'Teknik',
  ];

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    cameraActiveRef.current = false;
    setCameraStatus('Kamera dimatikan');
  }, []);

  const startLandmarker = useCallback(async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      },
      numHands: 1,
      runningMode: 'VIDEO',
    });
  }, []);

  const onResults = useCallback(
    (result: HandLandmarkerResult) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // mirror video
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // overlay teks
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, canvas.height / 2 - 40, canvas.width, 80);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(message, canvas.width / 2, canvas.height / 2);

      // gambar titik-titik jari
      if (result.landmarks && result.landmarks.length > 0) {
        const lm = result.landmarks[0];
        const tips = [4, 8, 12, 16, 20];

        tips.forEach((i) => {
          const x = lm[i].x * canvas.width;
          const y = lm[i].y * canvas.height;
          ctx.beginPath();
          ctx.arc(canvas.width - x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = 'red';
          ctx.fill();
        });

        // hitung jari terangkat
        let count = 0;
        if (lm[4].y < lm[3].y) count++;
        if (lm[8].y < lm[6].y) count++;
        if (lm[12].y < lm[10].y) count++;
        if (lm[16].y < lm[14].y) count++;
        if (lm[20].y < lm[18].y) count++;

        if (count >= 1 && count <= messages.length) {
          setMessage(messages[count - 1]);
        }
      }
    },
    [message, messages]
  );

  const startCamera = async () => {
    try {
      setCameraStatus('Meminta izin kamera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      cameraActiveRef.current = true;
      setCameraStatus('Kamera aktif—Deteksi jari siap');

      await startLandmarker();

      const onFrame = async () => {
        if (!cameraActiveRef.current) return;
        const result = await landmarkerRef.current?.detectForVideo(
          videoRef.current!,
          performance.now()
        );
        if (result) onResults(result);
        requestAnimationFrame(onFrame);
      };
      onFrame();
    } catch (e: any) {
      stopCamera();
      setError(`Error kamera: ${e.message}`);
      setCameraStatus('Error kamera');
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111',
        color: '#fff',
        textAlign: 'center',
        padding: 20,
      }}
    >
      <h1>Gesture Message Detection</h1>
      <div style={{ marginBottom: 10 }}>{message}</div>
      <div style={{ marginBottom: 10 }}>
        <button
          onClick={startCamera}
          disabled={cameraActiveRef.current}
        >
          🎥 Aktifkan Kamera
        </button>
        <button
          onClick={stopCamera}
          disabled={!cameraActiveRef.current}
          style={{ marginLeft: 10 }}
        >
          ⏹ Matikan Kamera
        </button>
      </div>
      <div style={{ marginBottom: 10 }}>Status: {cameraStatus}</div>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '100%',
        }}
      >
        <video
          ref={videoRef}
          style={{
            display: 'none', // disembunyikan karena canvas yang tampil
          }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          style={{
            backgroundColor: cameraActiveRef.current ? 'transparent' : '#333',
            borderRadius: 10,
            maxWidth: '100%',
          }}
        />
      </div>
    </div>
  );
}
