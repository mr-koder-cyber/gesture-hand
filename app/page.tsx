'use client';

import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [message, setMessage] = useState<string>('Tunggu gesture...');
  const [isLoading, setIsLoading] = useState(true);
  const [cameraStatus, setCameraStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string>('');

  const messages: string[] = [
    'Salma Fauziah',
    'kelompok 54 Purwa',
    'npm 257006111020',
    'Informatika',
    'Tehnik',
  ];

  let lastGesture = 0;
  let hands: any = null;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;

    const startCamera = async () => {
      try {
        setCameraStatus('Meminta izin kamera...');

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: 'user',
          },
        });

        if (!videoRef.current) return;

        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            setCameraStatus('Kamera aktif - Loading hand detection...');
            initializeMediaPipe();
          }
        };
      } catch (err: any) {
        console.error('Camera error:', err);
        setError(`Camera Error: ${err.message}`);
        setCameraStatus('Gagal mengakses kamera');
        setIsLoading(false);
      }
    };

    const initializeMediaPipe = async () => {
      try {
        const { Hands } = await import('@mediapipe/hands');
        const drawingUtils = await import('@mediapipe/drawing_utils');

        hands = new Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results: any) => {
          drawResults(results, drawingUtils);
        });

        setCameraStatus('Hand detection aktif!');
        setIsLoading(false);
        processFrame();
      } catch (err: any) {
        console.error('MediaPipe error:', err);
        setError(`MediaPipe Error: ${err.message}`);
        setCameraStatus('Error loading hand detection');
        setIsLoading(false);
      }
    };

    const processFrame = async () => {
      if (!videoRef.current || !hands) return;

      try {
        await hands.send({ image: videoRef.current });
      } catch (err) {
        console.error('Frame processing error:', err);
      }

      animationId = requestAnimationFrame(processFrame);
    };

    const drawResults = (results: any, drawingUtils: any) => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(
        results.image,
        -canvas.width,
        0,
        canvas.width,
        canvas.height
      );
      ctx.restore();

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          if (drawingUtils.HAND_CONNECTIONS) {
            drawingUtils.drawConnectors(
              ctx,
              landmarks,
              drawingUtils.HAND_CONNECTIONS,
              {
                color: '#00FF00',
                lineWidth: 3,
              }
            );
          } else {
            drawHandConnections(ctx, landmarks);
          }

          drawingUtils.drawLandmarks(ctx, landmarks, {
            color: '#FF0000',
            lineWidth: 2,
            radius: 3,
          });

          const gesture = detectGesture(landmarks);
          if (gesture && gesture !== lastGesture) {
            lastGesture = gesture;
            if (gesture >= 1 && gesture <= 5) {
              setMessage(messages[gesture - 1]);
            }
          }
        }
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.lineWidth = 3;
      const text = message;
      const textWidth = ctx.measureText(text).width;
      const x = (canvas.width - textWidth) / 2;
      const y = 50;

      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    };

    const drawHandConnections = (
      ctx: CanvasRenderingContext2D,
      landmarks: any[]
    ) => {
      const connections = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [0, 5],
        [5, 6],
        [6, 7],
        [7, 8],
        [5, 9],
        [9, 10],
        [10, 11],
        [11, 12],
        [9, 13],
        [13, 14],
        [14, 15],
        [15, 16],
        [13, 17],
        [17, 18],
        [18, 19],
        [19, 20],
        [0, 17],
      ];

      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;

      connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];

        ctx.beginPath();
        ctx.moveTo(
          startPoint.x * canvasRef.current!.width,
          startPoint.y * canvasRef.current!.height
        );
        ctx.lineTo(
          endPoint.x * canvasRef.current!.width,
          endPoint.y * canvasRef.current!.height
        );
        ctx.stroke();
      });
    };

    if (typeof window !== 'undefined') {
      startCamera();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  function detectGesture(landmarks: any[]): number {
    let fingersUp = 0;

    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];
    tips.forEach((tip, i) => {
      if (landmarks[tip].y < landmarks[pips[i]].y) {
        fingersUp++;
      }
    });

    if (landmarks[4].x > landmarks[3].x) {
      fingersUp++;
    }

    return fingersUp;
  }

  const handleRetry = () => {
    setError('');
    setIsLoading(true);
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <h1>🎯 Gesture Message</h1>
        <p style={{ fontSize: '18px', margin: '20px 0' }}>{cameraStatus}</p>
        {error && (
          <div
            style={{
              background: '#ffebee',
              color: '#c62828',
              padding: 15,
              borderRadius: 5,
              margin: 20,
              border: '1px solid #ef5350',
            }}
          >
            <p>
              <strong>Error:</strong> {error}
            </p>
            <div style={{ marginTop: 15 }}>
              <h4>Solusi yang bisa dicoba:</h4>
              <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                <li>Pastikan menggunakan HTTPS</li>
                <li>Refresh halaman dan klik "Allow" untuk kamera</li>
                <li>
                  Install dependencies: npm install @mediapipe/hands
                  @mediapipe/drawing_utils
                </li>
                <li>Tutup aplikasi lain yang menggunakan kamera</li>
              </ul>
              <button
                onClick={handleRetry}
                style={{
                  padding: '10px 20px',
                  background: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: 5,
                  cursor: 'pointer',
                  marginTop: 10,
                }}
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}
        <div style={{ fontSize: '14px', color: '#666', marginTop: 20 }}>
          <p>💡 Loading MediaPipe hand detection...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <h1>🎯 Gesture Message</h1>
      <p
        style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#333',
          marginBottom: 20,
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {message}
      </p>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          style={{ display: 'none' }}
          playsInline
          muted
          autoPlay
        />

        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          style={{
            border: '3px solid #2196F3',
            borderRadius: '15px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            background: '#000',
          }}
        />
      </div>

      <div style={{ marginTop: 20, fontSize: '14px', color: '#666' }}>
        <p>
          📹 Status:{' '}
          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
            {cameraStatus}
          </span>
        </p>
        <p>Gesture Guide:</p>
        <div
          style={{ display: 'inline-block', textAlign: 'left', marginTop: 10 }}
        >
          <p>1 jari = Salma Fauziah</p>
          <p>2 jari = kelompok 54 Purwa</p>
          <p>3 jari = npm 257006111020</p>
          <p>4 jari = Informatika</p>
          <p>5 jari = Tehnik</p>
        </div>
      </div>
    </div>
  );
}
