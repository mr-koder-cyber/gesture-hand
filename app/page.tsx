'use client';

import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [message, setMessage] = useState<string>('Tunggu gesture...');
  const [isLoading, setIsLoading] = useState(true);
  const [cameraPermission, setCameraPermission] =
    useState<string>('requesting');

  const messages: string[] = [
    'Salma Fauziah',
    'kelompok 54 Purwa',
    'npm 257006111020',
    'npm 257006111020',
    'Tehnik',
  ];

  let lastGesture = 0;

  useEffect(() => {
    let hands: any = null;
    let camera: any = null;

    const initializeHandDetection = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      try {
        const { Hands } = await import('@mediapipe/hands');
        const { Camera } = await import('@mediapipe/camera_utils');
        const { drawConnectors, drawLandmarks, HAND_CONNECTIONS } =
          await import('@mediapipe/drawing_utils');

        hands = new Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        hands.onResults((results: any) => {
          if (!canvasRef.current) return;
          const canvasCtx = canvasRef.current.getContext('2d');
          if (!canvasCtx) return;

          canvasCtx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          canvasCtx.drawImage(
            results.image,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );

          if (
            results.multiHandLandmarks &&
            results.multiHandLandmarks.length > 0
          ) {
            for (const landmarks of results.multiHandLandmarks) {
              drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                color: '#00FF00',
                lineWidth: 3,
              });
              drawLandmarks(canvasCtx, landmarks, {
                color: '#FF0000',
                lineWidth: 2,
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
        });

        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && hands) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing hand detection:', error);
        setMessage('Error loading hand detection');
        setIsLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      initializeHandDetection();
    }

    return () => {
      if (camera && camera.stop) {
        camera.stop();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  function detectGesture(landmarks: any): number {
    let fingersUp = 0;
    const tips = [8, 12, 16, 20];
    const pip = [6, 10, 14, 18];

    tips.forEach((tip, i) => {
      if (landmarks[tip].y < landmarks[pip[i]].y) fingersUp++;
    });

    if (landmarks[4].x > landmarks[3].x) fingersUp++;

    return fingersUp;
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 20 }}>
        <h1>🎯 Gesture Message</h1>
        <p>
          {cameraPermission === 'requesting'
            ? 'Meminta izin kamera...'
            : cameraPermission === 'denied'
            ? 'Izin kamera ditolak!'
            : 'Loading camera and hand detection...'}
        </p>
        {cameraPermission === 'denied' && (
          <div style={{ marginTop: 20, color: '#666' }}>
            <p>Untuk menggunakan aplikasi ini:</p>
            <ol style={{ textAlign: 'left', display: 'inline-block' }}>
              <li>Refresh halaman ini</li>
              <li>Klik "Allow" saat browser meminta izin kamera</li>
              <li>Pastikan kamera tidak digunakan aplikasi lain</li>
            </ol>
          </div>
        )}
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
        }}
      >
        {message}
      </p>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          style={{ display: 'none' }}
        />
        <canvas
          ref={canvasRef}
          width="640"
          height="480"
          style={{
            border: '2px solid #ccc',
            borderRadius: '10px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          }}
        />
      </div>
      <div style={{ marginTop: 20, fontSize: '14px', color: '#666' }}>
        <p>Tunjukkan 1-5 jari untuk melihat pesan yang berbeda</p>
      </div>
    </div>
  );
}
