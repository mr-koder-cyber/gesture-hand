import React, { useEffect, useRef, useState } from 'react';

interface VideoElement extends HTMLVideoElement {
  srcObject: MediaStream | null;
}

export default function GestureApp() {
  const videoRef = useRef<VideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [message, setMessage] = useState<string>('Tunggu gesture...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [cameraStatus, setCameraStatus] = useState<string>('Initializing...');
  const [error, setError] = useState<string>('');
  const [fingerCount, setFingerCount] = useState<number>(0);

  const messages: string[] = [
    'Salma Fauziah',
    'kelompok 54 Purwa',
    'npm 257006111020',
    'Informatika',
    'Tehnik',
  ];

  const [simulatedGesture, setSimulatedGesture] = useState<number>(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;

    const startCamera = async () => {
      try {
        setCameraStatus('Meminta izin kamera...');

        const constraints: MediaStreamConstraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current
                .play()
                .then(() => {
                  setCameraStatus(
                    'Kamera aktif - Gunakan tombol untuk test gesture'
                  );
                  setIsLoading(false);
                  startVideoProcessing();
                })
                .catch((err) => {
                  const errorMessage =
                    err instanceof Error ? err.message : 'Unknown error';
                  console.error('Play error:', err);
                  setError(`Video play error: ${errorMessage}`);
                });
            }
          };
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        console.error('Camera error:', err);
        setError(`Camera Error: ${errorMessage}`);
        setCameraStatus('Gagal mengakses kamera');
        setIsLoading(false);
      }
    };

    const startVideoProcessing = () => {
      const processFrame = () => {
        if (videoRef.current && canvasRef.current && !videoRef.current.paused) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          const video = videoRef.current;

          if (!ctx || !video) return;

          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;

          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();

          drawOverlay(ctx, canvas);
        }
        animationId = requestAnimationFrame(processFrame);
      };

      processFrame();
    };

    const drawOverlay = (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement
    ) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, 60);

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.lineWidth = 2;

      const text = message;
      const textWidth = ctx.measureText(text).width;
      const x = (canvas.width - textWidth) / 2;
      const y = 40;

      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);

      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`Fingers: ${fingerCount}`, 20, canvas.height - 20);

      if (fingerCount > 0) {
        drawHandSimulation(ctx, canvas);
      }
    };

    const drawHandSimulation = (
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement
    ) => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(centerX - 50, centerY - 20, 100, 80);

      ctx.fillStyle = 'rgba(0, 255, 0, 0.6)';
      for (let i = 0; i < fingerCount; i++) {
        const fingerX = centerX - 40 + i * 20;
        ctx.fillRect(fingerX, centerY - 60, 15, 40);
      }
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
  }, [message, fingerCount]);

  const handleGestureTest = (gestureNum: number) => {
    setFingerCount(gestureNum);
    if (gestureNum >= 1 && gestureNum <= 5) {
      setMessage(messages[gestureNum - 1]);
    } else {
      setMessage('Tunggu gesture...');
    }
  };

  const handleRetry = () => {
    setError('');
    setIsLoading(true);
    setCameraStatus('Initializing...');
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Gesture Message
          </h1>

          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg mb-4 text-gray-700">{cameraStatus}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
              <p className="text-red-700 mb-3">{error}</p>

              <div className="text-sm text-red-600 mb-4">
                <h4 className="font-semibold mb-2">Solusi yang bisa dicoba:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Pastikan menggunakan HTTPS atau localhost</li>
                  <li>Refresh halaman dan klik "Allow" untuk kamera</li>
                  <li>Tutup aplikasi lain yang menggunakan kamera</li>
                  <li>Coba browser yang berbeda (Chrome/Firefox)</li>
                </ul>
              </div>

              <button
                onClick={handleRetry}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Gesture Message Detection
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600 min-h-12 flex items-center justify-center">
              {message}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="relative flex justify-center">
            <video
              ref={videoRef}
              className="hidden"
              playsInline
              muted
              autoPlay
            />

            <canvas
              ref={canvasRef}
              className="border-4 border-blue-400 rounded-xl shadow-lg bg-black max-w-full h-auto"
              style={{ maxWidth: '640px', maxHeight: '480px' }}
            />
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Status:{' '}
              <span className="text-green-600 font-semibold">
                {cameraStatus}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
            Test Gesture (Klik untuk simulasi)
          </h3>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => handleGestureTest(num)}
                className={`py-3 px-4 rounded-lg font-semibold transition-colors ${
                  fingerCount === num
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                {num} Jari
              </button>
            ))}
          </div>

          <button
            onClick={() => handleGestureTest(0)}
            className={`w-full mt-3 py-2 px-4 rounded-lg font-semibold transition-colors ${
              fingerCount === 0
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            Reset
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
            Panduan Gesture
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold">
                  {index + 1}
                </div>
                <span className="text-gray-700">{msg}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Catatan:</strong> Ini adalah versi demo. Gunakan tombol di
              atas untuk mensimulasikan deteksi gesture. Untuk implementasi
              MediaPipe yang sesungguhnya, diperlukan setup server yang lebih
              kompleks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
