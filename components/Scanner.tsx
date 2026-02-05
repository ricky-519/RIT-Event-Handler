import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface ScannerProps {
  onScan: (data: string) => void;
  mockData?: string;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, mockData }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setPermissionGranted(true);
      setScanning(true);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setPermissionGranted(false);
      setScanning(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDismissedError') {
         setError("Camera permission was denied. Please allow camera access in your browser settings to scan QR codes.");
      } else if (err.name === 'NotFoundError') {
         setError("No camera device found.");
      } else {
         setError("Failed to access camera. Please try again.");
      }
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleSimulateScan = () => {
    setScanning(false);
    setFeedback('success');
    setTimeout(() => {
        // Use provided mockData or fallback to a demo ID (which might be pending/invalid if not handled upstream)
        const payload = mockData || JSON.stringify({ odId: 'od_demo_1', sid: 'u1', eid: 'e1' });
        onScan(payload);
        setFeedback(null);
        setScanning(true);
    }, 1500);
  };

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden aspect-[3/4] md:aspect-video shadow-lg max-w-md mx-auto">
      {!permissionGranted ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gray-900 p-6 text-center">
            <div className="bg-gray-800 p-4 rounded-full mb-4">
                <Camera size={32} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Scanner</h3>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
                {error || "Camera access is needed to scan student QR codes for attendance verification."}
            </p>
            <button 
                onClick={startCamera}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-medium transition-colors flex items-center"
            >
                {error ? <RefreshCw size={18} className="mr-2" /> : <Camera size={18} className="mr-2" />}
                {error ? "Retry Camera" : "Enable Camera"}
            </button>
        </div>
      ) : (
        <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className={`w-full h-full object-cover opacity-80 ${!scanning ? 'blur-sm' : ''}`} 
            />
            
            {/* Overlay UI */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {scanning && (
                    <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1"></div>
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/50 animate-pulse"></div>
                    </div>
                )}
                
                {feedback === 'success' && (
                    <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
                        <CheckCircle size={64} className="text-green-400 mb-2" />
                        <span className="text-white font-bold text-xl">Verified!</span>
                    </div>
                )}
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-auto">
                <button 
                    onClick={handleSimulateScan}
                    disabled={!scanning}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center"
                >
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                    Capture Scan
                </button>
            </div>
        </>
      )}
    </div>
  );
};