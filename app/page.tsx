'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface VideoElement extends HTMLVideoElement {
  srcObject: MediaStream | null;
}

export default function GestureApp() {
  const videoRef = useRef<VideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const [message, setMessage] = useState<string>('Tunggu gesture...');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<string>(
    'Klik "Aktifkan Kamera" untuk mulai'
  );
  const [error, setError] = useState<string>('');
  const [fingerCount, setFingerCount] = useState<number>(0);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  const messages: string[] = [
    'Salma Fauziah',
    'kelompok 54 Purwa',
    'npm 257006111020',
    'Informatika',
    'Tehnik',
  ];

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log('Camera track stopped:', track.label);
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }

    setCameraActive(false);
    setCameraStatus('Kamera dimatikan');
  }, []);

  const startVideoProcessing = useCallback(() => {
    const processFrame = () => {
      if (
        videoRef.current &&
        canvasRef.current &&
        !videoRef.current.paused &&
        cameraActive
      ) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const video = videoRef.current;

        if (ctx && video && video.readyState >= 2) {
          // Set canvas size to match video
          if (
            canvas.width !== video.videoWidth ||
            canvas.height !== video.videoHeight
          ) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
          }

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw mirrored video
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();

          // Draw overlay
          drawOverlay(ctx, canvas);
        }
      }

      if (cameraActive) {
        animationRef.current = requestAnimationFrame(processFrame);
      }
    };

    processFrame();
  }, [cameraActive, message, fingerCount]);

  const drawOverlay = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    // Message overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, 70);

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.font = 'bold 28px Arial';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';

    const x = canvas.width / 2;
    const y = 45;

    ctx.strokeText(message, x, y);
    ctx.fillText(message, x, y);

    // Finger count indicator
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Fingers: ${fingerCount}`, 20, canvas.height - 25);

    // Hand simulation
    if (fingerCount > 0) {
      drawHandSimulation(ctx, canvas);
    }

    // Instructions
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - 100, canvas.width, 70);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Gunakan tombol di bawah untuk test gesture',
      canvas.width / 2,
      canvas.height - 60
    );
    ctx.fillText(
      'Tunjukkan 1-5 jari untuk menampilkan pesan',
      canvas.width / 2,
      canvas.height - 40
    );
  };

  const drawHandSimulation = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 50;

    // Hand base
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(centerX - 60, centerY - 30, 120, 60);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(centerX - 60, centerY - 30, 120, 60);

    // Fingers
    ctx.fillStyle = '#4CAF50';
    ctx.strokeStyle = '#2E7D32';
    for (let i = 0; i < fingerCount; i++) {
      const fingerX = centerX - 50 + i * 25;
      ctx.fillRect(fingerX, centerY - 80, 20, 50);
      ctx.strokeRect(fingerX, centerY - 80, 20, 50);

      // Finger tip
      ctx.beginPath();
      ctx.arc(fingerX + 10, centerY - 80, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError('');
      setCameraStatus('Meminta izin kamera...');

      // Stop any existing stream first
      stopCamera();

      console.log('Requesting camera access...');

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      console.log(
        'Camera stream obtained:',
        stream.getVideoTracks()[0]?.getSettings()
      );

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }

          const video = videoRef.current;

          const onLoadedData = () => {
            console.log(
              'Video loaded, dimensions:',
              video.videoWidth,
              'x',
              video.videoHeight
            );
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('error', onError);
            resolve();
          };

          const onError = (e: Event) => {
            console.error('Video error:', e);
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('error', onError);
            reject(new Error('Video failed to load'));
          };

          video.addEventListener('loadeddata', onLoadedData);
          video.addEventListener('error', onError);

          // If already loaded
          if (video.readyState >= 2) {
            onLoadedData();
          }
        });

        // Play video
        await videoRef.current.play();

        setCameraActive(true);
        setPermissionGranted(true);
        setCameraStatus('Kamera aktif - Siap untuk deteksi gesture');
        setIsLoading(false);

        // Start processing
        startVideoProcessing();
      }
    } catch (err: unknown) {
      console.error('Camera error:', err);
      stopCamera();
      setIsLoading(false);

      let errorMessage = 'Unknown error';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      if (
        errorMessage.includes('Permission denied') ||
        errorMessage.includes('NotAllowedError')
      ) {
        setError(
          'Izin kamera ditolak. Silakan refresh halaman dan klik "Allow" saat diminta.'
        );
        setCameraStatus('Izin kamera ditolak');
      } else if (
        errorMessage.includes('NotFoundError') ||
        errorMessage.includes('DevicesNotFoundError')
      ) {
        setError('Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.');
        setCameraStatus('Kamera tidak tersedia');
      } else if (
        errorMessage.includes('NotReadableError') ||
        errorMessage.includes('TrackStartError')
      ) {
        setError(
          'Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain yang menggunakan kamera.'
        );
        setCameraStatus('Kamera sedang digunakan');
      } else {
        setError(`Error: ${errorMessage}`);
        setCameraStatus('Error kamera');
      }
    }
  };

  const handleGestureTest = (gestureNum: number) => {
    setFingerCount(gestureNum);
    if (gestureNum >= 1 && gestureNum <= 5) {
      setMessage(messages[gestureNum - 1]);
    } else {
      setMessage('Tunggu gesture...');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Check if getUserMedia is available
  const isGetUserMediaSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  if (!isGetUserMediaSupported()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-4">
            Browser Tidak Didukung
          </h1>
          <p className="text-red-700 mb-4">
            Browser Anda tidak mendukung akses kamera. Silakan gunakan browser
            modern seperti Chrome, Firefox, atau Safari.
          </p>
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

        {/* Current Message Display */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600 min-h-12 flex items-center justify-center">
              {message}
            </p>
          </div>
        </div>

        {/* Camera Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Kontrol Kamera
            </h2>

            {!cameraActive && !isLoading && (
              <button
                onClick={startCamera}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors mr-4"
              >
                🎥 Aktifkan Kamera
              </button>
            )}

            {cameraActive && (
              <button
                onClick={stopCamera}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors mr-4"
              >
                ⏹️ Matikan Kamera
              </button>
            )}

            {isLoading && (
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-blue-600">Loading...</span>
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Status:{' '}
              <span
                className={`font-semibold ${
                  cameraActive ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {cameraStatus}
              </span>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-red-800 mb-2">Error:</h3>
              <p className="text-red-700 mb-3">{error}</p>

              <div className="text-sm text-red-600 mb-4">
                <h4 className="font-semibold mb-2">Cara mengatasi:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Pastikan menggunakan browser modern (Chrome/Firefox/Safari)
                  </li>
                  <li>Klik ikon kamera di address bar dan pilih "Allow"</li>
                  <li>Refresh halaman dan coba lagi</li>
                  <li>Tutup aplikasi lain yang menggunakan kamera</li>
                  <li>Periksa pengaturan privacy browser</li>
                </ul>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Refresh Halaman
              </button>
            </div>
          )}
        </div>

        {/* Video Canvas */}
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
              style={{
                maxWidth: '100%',
                maxHeight: '500px',
                minHeight: '300px',
                backgroundColor: cameraActive ? 'black' : '#f3f4f6',
              }}
              width="640"
              height="480"
            />
          </div>

          {!cameraActive && (
            <div className="text-center mt-4">
              <p className="text-gray-500">
                Kamera belum aktif. Klik tombol "Aktifkan Kamera" di atas.
              </p>
            </div>
          )}
        </div>

        {/* Gesture Test Buttons */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
            Test Gesture (Simulasi)
          </h3>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => handleGestureTest(num)}
                className={`py-3 px-4 rounded-lg font-semibold transition-colors ${
                  fingerCount === num
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                {num} Jari
              </button>
            ))}
          </div>

          <button
            onClick={() => handleGestureTest(0)}
            className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
              fingerCount === 0
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            Reset
          </button>
        </div>

        {/* Guide */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
            Panduan Gesture
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>
                <span className="text-gray-700 font-medium">{msg}</span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Cara Penggunaan:</strong>
            </p>
            <ol className="text-sm text-blue-700 mt-2 space-y-1">
              <li>1. Klik "Aktifkan Kamera" dan berikan izin akses</li>
              <li>2. Tunjukkan 1-5 jari di depan kamera</li>
              <li>3. Atau gunakan tombol simulasi untuk testing</li>
              <li>4. Pesan akan berubah sesuai jumlah jari yang terdeteksi</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
