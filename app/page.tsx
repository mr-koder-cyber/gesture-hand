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
  const [fingerCount, setFingerCount] = useState(0);

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
    setMessage('Tunggu gesture...');
    setFingerCount(0);
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

  const isFingerUp = useCallback(
    (landmarks: any[], tipIndex: number, pipIndex: number, isThumb = false) => {
      if (isThumb) {
        return landmarks[tipIndex].x > landmarks[pipIndex].x;
      } else {
        return landmarks[tipIndex].y < landmarks[pipIndex].y;
      }
    },
    []
  );

  const countFingers = useCallback(
    (landmarks: any[]) => {
      let count = 0;

      if (isFingerUp(landmarks, 4, 3, true)) count++;
      if (isFingerUp(landmarks, 8, 6)) count++;
      if (isFingerUp(landmarks, 12, 10)) count++;
      if (isFingerUp(landmarks, 16, 14)) count++;
      if (isFingerUp(landmarks, 20, 18)) count++;

      return count;
    },
    [isFingerUp]
  );

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

      if (result.landmarks && result.landmarks.length > 0) {
        const lm = result.landmarks[0];
        const count = countFingers(lm);
        setFingerCount(count);

        const tips = [4, 8, 12, 16, 20];

        tips.forEach((i, index) => {
          const x = lm[i].x * canvas.width;
          const y = lm[i].y * canvas.height;

          const isUp =
            index === 0
              ? isFingerUp(lm, i, i - 1, true)
              : isFingerUp(lm, i, i - 2);

          if (isUp) {
            ctx.beginPath();
            ctx.arc(canvas.width - x, y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#00ff00';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        });

        if (count >= 1 && count <= messages.length) {
          setMessage(messages[count - 1]);
        } else if (count === 0) {
          setMessage('Angkat jari untuk menampilkan pesan');
        } else {
          setMessage('Terlalu banyak jari');
        }
      } else {
        setMessage('Tunjukkan tangan Anda');
        setFingerCount(0);
      }
    },
    [messages, countFingers, isFingerUp]
  );

  const startCamera = async () => {
    try {
      setCameraStatus('Meminta izin kamera...');
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      cameraActiveRef.current = true;
      setCameraStatus('Kamera aktif - Deteksi jari siap');

      await startLandmarker();

      const onFrame = async () => {
        if (
          !cameraActiveRef.current ||
          !landmarkerRef.current ||
          !videoRef.current
        )
          return;

        try {
          const result = await landmarkerRef.current.detectForVideo(
            videoRef.current,
            performance.now()
          );
          if (result) onResults(result);
        } catch (err) {
          console.error('Detection error:', err);
        }

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
        background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
        color: '#fff',
        textAlign: 'center',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1
        style={{
          marginBottom: 20,
          fontSize: '2.5rem',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        Gesture Message Detection
      </h1>

      <div
        style={{
          marginBottom: 15,
          padding: '15px 25px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '15px',
          backdropFilter: 'blur(10px)',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {message}
      </div>

      <div
        style={{
          marginBottom: 15,
          fontSize: '1.2rem',
          color: '#64b5f6',
        }}
      >
        Jari terangkat: {fingerCount}
      </div>

      <div
        style={{
          marginBottom: 15,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={startCamera}
          disabled={cameraActiveRef.current}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '8px',
            background: cameraActiveRef.current
              ? 'linear-gradient(45deg, #666, #888)'
              : 'linear-gradient(45deg, #4CAF50, #45a049)',
            color: 'white',
            cursor: cameraActiveRef.current ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          }}
        >
          🎥 Aktifkan Kamera
        </button>

        <button
          onClick={stopCamera}
          disabled={!cameraActiveRef.current}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '8px',
            background: !cameraActiveRef.current
              ? 'linear-gradient(45deg, #666, #888)'
              : 'linear-gradient(45deg, #f44336, #da190b)',
            color: 'white',
            cursor: !cameraActiveRef.current ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          }}
        >
          ⏹ Matikan Kamera
        </button>
      </div>

      <div
        style={{
          marginBottom: 10,
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
          fontSize: '14px',
        }}
      >
        Status: {cameraStatus}
      </div>

      {error && (
        <div
          style={{
            color: '#ff6b6b',
            marginBottom: 10,
            padding: '8px 16px',
            background: 'rgba(255,107,107,0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(255,107,107,0.3)',
          }}
        >
          Error: {error}
        </div>
      )}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          maxWidth: '100%',
          borderRadius: '15px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <video
          ref={videoRef}
          style={{
            display: 'none',
          }}
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          style={{
            backgroundColor: cameraActiveRef.current
              ? 'transparent'
              : 'rgba(255,255,255,0.1)',
            borderRadius: '15px',
            maxWidth: '100%',
            maxHeight: '60vh',
            border: '2px solid rgba(255,255,255,0.2)',
          }}
        />

        {!cameraActiveRef.current && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '18px',
            }}
          >
            Kamera belum aktif
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 15,
          padding: '10px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '10px',
          backdropFilter: 'blur(10px)',
          fontSize: '14px',
          maxWidth: '600px',
        }}
      >
        <div>
          💡 <strong>Petunjuk:</strong>
        </div>
        <div>
          1️⃣ {messages[0]} | 2️⃣ {messages[1]} | 3️⃣ {messages[2]}
        </div>
        <div>
          4️⃣ {messages[3]} | 5️⃣ {messages[4]}
        </div>
      </div>
    </div>
  );
}
