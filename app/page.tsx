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
    'Tehnik',
  ];

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

  const startLandmarker = useCallback(async () => {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: 'hand_landmarker.task' },
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
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Gambar overlay teks
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, canvas.width, 70);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(message, canvas.width / 2, 45);

      // Gambar titik ujung jari
      if (result.landmarks && result.landmarks.length > 0) {
        const lm = result.landmarks[0];
        const tips = [4, 8, 12, 16, 20]; // ujung jari
        tips.forEach((i) => {
          const x = lm[i].x * canvas.width;
          const y = lm[i].y * canvas.height;
          ctx.beginPath();
          ctx.arc(canvas.width - x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = 'red';
          ctx.fill();
        });
        const count = tips.filter((i) => lm[i].visibility ?? 0 > 0.5).length;
        if (count >= 1 && count <= 5) setMessage(messages[count - 1]);
      }

      ctx.restore();
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
      videoRef.current!.srcObject = stream;
      await videoRef.current!.play();
      setCameraActive(true);
      setCameraStatus('Kamera aktif—Deteksi jari siap');

      await startLandmarker();
      // Mulai loop streaming
      const onFrame = async () => {
        const result = await landmarkerRef.current?.detectForVideo(
          videoRef.current!,
          performance.now()
        );
        if (result) onResults(result);
        if (cameraActive) requestAnimationFrame(onFrame);
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
    <div className="...">
      <h1>Gesture Message Detection</h1>
      <div>{message}</div>
      <button
        onClick={startCamera}
        disabled={cameraActive}
      >
        🎥 Aktifkan Kamera
      </button>
      <button
        onClick={stopCamera}
        disabled={!cameraActive}
      >
        ⏹️ Matikan Kamera
      </button>
      <div>Status: {cameraStatus}</div>
      {error && <div>Error: {error}</div>}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="..."
        style={{ backgroundColor: cameraActive ? 'transparent' : '#ccc' }}
      />
    </div>
  );
}
