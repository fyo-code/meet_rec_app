import { useState, useRef, useCallback, useEffect } from 'react';

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

export function useAudioRecorder() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get the best supported mime type across browsers (Chrome prefers webm, Safari mp4)
  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4', // Safari
      'audio/aac',
      'audio/ogg;codecs=opus'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // Default to browser's choice if none specifically match
  };

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;
      
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = []; // reset chunks

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Collect data every 1 second so we have chunks in memory
      mediaRecorder.start(1000); 
      setStatus('recording');
      setElapsedTime(0);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setError(err.name === 'NotAllowedError' 
        ? 'Microphone permission denied. Please allow access.' 
        : 'Failed to access microphone. Ensure it is not being used by another app.');
      setStatus('idle');
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
    }
  }, [status]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && status === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');
    }
  }, [status]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || status === 'idle' || status === 'stopped') {
        resolve(null);
        return;
      }

      // When stop is called, the 'stop' event fires after the final 'dataavailable'
      mediaRecorderRef.current.onstop = () => {
        const mimeType = getSupportedMimeType() || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setStatus('stopped');
        
        // Stop all tracks to release mic hardware
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  }, [status]);

  // Timer effect to track elapsed recording seconds
  useEffect(() => {
    if (status === 'recording') {
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [status]);

  // Cleanup on unmount to prevent memory/mic leaks
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  return {
    status,
    elapsedTime,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
}
