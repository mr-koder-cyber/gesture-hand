'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface VideoElement extends HTMLVideoElement {
  srcObject: MediaStream | null;
}

export default function GestureApp() {
  const videoRef = useRef<VideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraActiveRef = useRef(false);

  const [message, setMessage] = useState('Tunggu gesture...');
  const [cameraStatus, setCameraStatus] = useState(
    'Klik "Aktifkan Kamera" untuk mulai'
  );
  const [error, setError] = useState('');

  const messages = [
    'Salma Fauziah',
    'Kelompok 54 Purwa',
    'NPM 257006111020',
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

  // Simulasi deteksi MediaPipe yang sederhana
  const detectHands = useCallback(async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !cameraActiveRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror video
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Overlay untuk pesan
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height - 40);

    // Simulasi deteksi jari dengan mouse/touch untuk demo
    // Dalam implementasi asli, ini akan menggunakan MediaPipe

    requestAnimationFrame(detectHands);
  }, [message]);

  // Simulasi gesture berdasarkan keyboard untuk demo
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!cameraActiveRef.current) return;

      const num = parseInt(e.key);
      if (num >= 1 && num <= 5) {
        setMessage(messages[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [messages]);

  const startCamera = async () => {
    try {
      setCameraStatus('Meminta izin kamera...');
      setError('');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (!videoRef.current) return;

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      cameraActiveRef.current = true;
      setCameraStatus('Kamera aktif - Tekan angka 1-5 untuk demo');

      // Start detection loop
      detectHands();
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

      <div style={{ marginBottom: 15 }}>
        <button
          onClick={startCamera}
          disabled={cameraActiveRef.current}
          style={{
            padding: '10px 20px',
            marginRight: 10,
            fontSize: '16px',
            backgroundColor: cameraActiveRef.current ? '#666' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: cameraActiveRef.current ? 'not-allowed' : 'pointer',
          }}
        >
          🎥 Aktifkan Kamera
        </button>

        <button
          onClick={stopCamera}
          disabled={!cameraActiveRef.current}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: !cameraActiveRef.current ? '#666' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: !cameraActiveRef.current ? 'not-allowed' : 'pointer',
          }}
        >
          ⏹ Matikan Kamera
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>Status: {cameraStatus}</div>

      {error && (
        <div style={{ color: 'red', marginBottom: 10 }}>Error: {error}</div>
      )}

      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          style={{ display: 'none' }}
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          style={{
            backgroundColor: cameraActiveRef.current ? 'transparent' : '#333',
            borderRadius: '10px',
            maxWidth: '100%',
            border: '2px solid #444',
          }}
          width={640}
          height={480}
        />
      </div>

      {cameraActiveRef.current && (
        <div
          style={{
            marginTop: 15,
            padding: '10px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '5px',
          }}
        >
          Demo: Tekan angka 1-5 di keyboard untuk mengganti pesan
        </div>
      )}
    </div>
  );
}
