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

  const [message, setMessage] = useState<string>('Tunggu gesture...');
  const [cameraStatus, setCameraStatus] = useState<string>(
    'Klik "Aktifkan Kamera" untuk mulai'
  );
  const [error, setError] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);

  const messages = [
    'Salma Fauziah',
    'kelompok 54 Purwa',
    'npm 257006111020',
    'Informatika',
    'Teknik',
  ];

  /** Stop kamera */
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStatus('Kamera dimatikan');
  }, []);

  /** Load model HandLandmarker */
  const startLandmarker = useCallback(async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: 'hand_landmarker.task' },
      numHands: 1,
      runningMode: 'VIDEO', // tetap VIDEO walau dari webcam
    });
  }, []);

  /** Render hasil */
  const onResults = useCallback(
    (result: HandLandmarkerResult) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // mirror
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // overlay teks
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, 70);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(message, canvas.width / 2, 45);

      // titik ujung jari
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

        // hitung jari terangkat (pakai posisi, bukan cuma visibility)
        let count = 0;
        if (lm[4].y < lm[3].y) count++; // ibu jari
        if (lm[8].y < lm[6].y) count++; // telunjuk
        if (lm[12].y < lm[10].y) count++;
        if (lm[16].y < lm[14].y) count++;
        if (lm[20].y < lm[18].y) count++;

        if (count >= 1 && count <= 5) setMessage(messages[count - 1]);
      }
    },
    [message, messages]
  );

  /** Start kamera */
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

      setCameraActive(true);
      setCameraStatus('Kamera aktif—Deteksi jari siap');

      await startLandmarker();

      // loop deteksi
      const onFrame = async () => {
        if (!cameraActive) return;
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

  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <h1>Gesture Message Detection</h1>
      <div>{message}</div>
      <div style={{ marginTop: 10 }}>
        <button
          onClick={startCamera}
          disabled={cameraActive}
        >
          Aktifkan Kamera
        </button>
        <button
          onClick={stopCamera}
          disabled={!cameraActive}
        >
          ⏹ Matikan Kamera
        </button>
      </div>
      <div>Status: {cameraStatus}</div>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        style={{
          marginTop: 10,
          backgroundColor: cameraActive ? 'transparent' : '#ccc',
          maxWidth: '100%',
        }}
      />
    </div>
  );
}
