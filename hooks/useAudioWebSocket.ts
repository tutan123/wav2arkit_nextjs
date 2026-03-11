import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAudioWebSocketReturn {
  isConnected: boolean;
  isRecording: boolean;
  blendshapes: Record<string, number>;
  startRecording: () => void;
  stopRecording: () => void;
  error: string | null;
}

export function useAudioWebSocket(url: string): UseAudioWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [blendshapes, setBlendshapes] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Initialize WebSocket
  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.blendshapes) {
          setBlendshapes(data.blendshapes);
        }
        if (data.error) {
          console.error('Backend error:', data.error);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setIsRecording(false);
    };
    
    ws.onerror = (e) => {
      console.error('WebSocket error', e);
      setError('WebSocket connection failed');
    };
    
    wsRef.current = ws;
    
    return () => {
      ws.close();
    };
  }, [url]);

  const startRecording = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket is not connected');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      mediaStreamRef.current = stream;
      
      // Create AudioContext with 16kHz sample rate as required by the model
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      
      // Use ScriptProcessorNode for raw PCM data (deprecated but widely supported and simple for this use case)
      // Buffer size 4096 is about 256ms at 16kHz
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!isRecording || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to raw bytes to send over WebSocket
        const buffer = new ArrayBuffer(inputData.length * 4);
        const view = new Float32Array(buffer);
        view.set(inputData);
        
        wsRef.current.send(buffer);
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsRecording(true);
      setError(null);
    } catch (err) {
      console.error('Error accessing microphone', err);
      setError('Could not access microphone');
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    
    if (processorRef.current && audioContextRef.current) {
      processorRef.current.disconnect();
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    
    setBlendshapes({});
  }, []);

  return {
    isConnected,
    isRecording,
    blendshapes,
    startRecording,
    stopRecording,
    error
  };
}
