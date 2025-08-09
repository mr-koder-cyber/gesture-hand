'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Mock MediaPipe interfaces untuk demo
interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface HandLandmarkerResult {
  landmarks?: Landmark[][];
}

interface HandLandmarker {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => Promise<HandLandmarkerResult>;
}

interface VideoElement extends HTMLVideoElement {
  srcObject: MediaStream | null;
}

export default function GestureApp() {
  const videoRef = useRef<VideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const cameraActiveRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  const [message, setMessage] = useState('Tunggu gesture...');
  const [cameraStatus, setCameraStatus] = useState(
    'Klik "Aktifkan Kamera" untuk mulai'
  );
  const [error, setError] = useState('');
  const [fingerCount, setFingerCount] = useState(0);

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
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    cameraActiveRef.current = false;
    setCameraStatus('Kamera dimatikan');
    setMessage('Tunggu gesture...');
    setFingerCount(0);
  }, []);

  // Mock landmarker untuk demo
  const startLandmarker = useCallback(async () => {
    // Simulasi loading MediaPipe
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock hand landmarker
    landmarkerRef.current = {
      detectForVideo: async (video: HTMLVideoElement, timestamp: number) => {
        // Mock detection - dalam implementasi nyata ini akan menggunakan MediaPipe
        const mockLandmarks: Landmark[] = [];

        // Generate mock landmarks untuk 21 titik tangan
        for (let i = 0; i < 21; i++) {
          mockLandmarks.push({
            x: Math.random() * 0.6 + 0.2, // Random position dalam canvas
            y: Math.random() * 0.6 + 0.2,
            z: 0,
          });
        }

        return {
          landmarks: [mockLandmarks],
        };
      },
    };
  }, []);

  const drawConnections = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: Landmark[],
      canvas: HTMLCanvasElement
    ) => {
      // Koneksi antar titik tangan
      const connections = [
        // Thumb
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        // Index
        [0, 5],
        [5, 6],
        [6, 7],
        [7, 8],
        // Middle
        [0, 9],
        [9, 10],
        [10, 11],
        [11, 12],
        // Ring
        [0, 13],
        [13, 14],
        [14, 15],
        [15, 16],
        // Pinky
        [0, 17],
        [17, 18],
        [18, 19],
        [19, 20],
        // Palm
        [5, 9],
        [9, 13],
        [13, 17],
      ];

      ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
      ctx.lineWidth = 2;

      connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];

        if (startPoint && endPoint) {
          ctx.beginPath();
          ctx.moveTo(
            canvas.width - startPoint.x * canvas.width,
            startPoint.y * canvas.height
          );
          ctx.lineTo(
            canvas.width - endPoint.x * canvas.width,
            endPoint.y * canvas.height
          );
          ctx.stroke();
        }
      });
    },
    []
  );

  const drawLandmarks = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: Landmark[],
      canvas: HTMLCanvasElement
    ) => {
      landmarks.forEach((landmark, index) => {
        const x = canvas.width - landmark.x * canvas.width;
        const y = landmark.y * canvas.height;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);

        // Warna berbeda untuk titik ujung jari
        const fingerTips = [4, 8, 12, 16, 20];
        if (fingerTips.includes(index)) {
          ctx.fillStyle = '#ff4444';
          ctx.shadowColor = '#ff4444';
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = '#44ff44';
          ctx.shadowColor = '#44ff44';
          ctx.shadowBlur = 5;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      });
    },
    []
  );

  const countFingers = useCallback((landmarks: Landmark[]) => {
    let count = 0;

    // Thumb (berbeda karena orientasi horizontal)
    if (landmarks[4].x > landmarks[3].x) count++;

    // Jari lainnya (vertikal)
    const fingers = [
      [8, 6], // Index
      [12, 10], // Middle
      [16, 14], // Ring
      [20, 18], // Pinky
    ];

    fingers.forEach(([tip, pip]) => {
      if (landmarks[tip].y < landmarks[pip].y) count++;
    });

    return count;
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

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mirror video
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Gambar overlay gelap untuk teks
      const overlayHeight = 120;
      const overlayY = canvas.height - overlayHeight;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, overlayY, canvas.width, overlayHeight);

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];

        // Gambar koneksi tangan
        drawConnections(ctx, landmarks, canvas);

        // Gambar titik-titik landmark
        drawLandmarks(ctx, landmarks, canvas);

        // Hitung jari yang terangkat
        const count = countFingers(landmarks);
        setFingerCount(count);

        // Update pesan berdasarkan jumlah jari
        if (count >= 1 && count <= messages.length) {
          setMessage(messages[count - 1]);
        } else if (count === 0) {
          setMessage('Angkat jari untuk menampilkan pesan');
        } else {
          setMessage('Terlalu banyak jari terangkat');
        }

        // Tampilkan counter jari di pojok kanan atas
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`Jari: ${count}`, canvas.width - 20, 40);
      } else {
        setMessage('Tunjukkan tangan Anda');
        setFingerCount(0);
      }

      // Tampilkan pesan utama
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(message, canvas.width / 2, canvas.height - 60);

      // Tampilkan instruksi
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '16px Arial';
      ctx.fillText(
        'Angkat 1-5 jari untuk menampilkan pesan',
        canvas.width / 2,
        canvas.height - 25
      );
    },
    [message, messages, drawConnections, drawLandmarks, countFingers]
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
      setCameraStatus('Kamera aktif - Deteksi gesture siap');

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

          animationFrameRef.current = requestAnimationFrame(onFrame);
        } catch (err) {
          console.error('Detection error:', err);
        }
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
          background: 'linear-gradient(45deg, #fff, #64b5f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        Gesture Message Detection
      </h1>

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
          width={640}
          height={480}
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
