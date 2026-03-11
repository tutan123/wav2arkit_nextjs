import { useState, useEffect, useRef, useCallback } from 'react';

/** 将音频重采样到 16kHz（模型要求） */
function resampleTo16k(input: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) return input;
  const outputLength = Math.floor(input.length * 16000 / inputSampleRate);
  const result = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i * inputSampleRate / 16000;
    const j = Math.floor(srcIdx);
    const frac = srcIdx - j;
    result[i] = (1 - frac) * (input[j] ?? 0) + frac * (input[Math.min(j + 1, input.length - 1)] ?? 0);
  }
  return result;
}

interface UseAudioWebSocketReturn {
  isConnected: boolean;
  isRecording: boolean;
  blendshapes: Record<string, number>;
  isSilent: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  error: string | null;
}

export function useAudioWebSocket(url: string): UseAudioWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [blendshapes, setBlendshapes] = useState<Record<string, number>>({});
  const [isSilent, setIsSilent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  // Use a ref for the recording state to avoid stale closure issues inside audio callbacks
  const isRecordingRef = useRef(false);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.blendshapes) {
            setBlendshapes(data.blendshapes);
            // Debug: 每 30 次打印一次非零 blendshape 到控制台
            if (Math.random() < 0.033) {
              const active = Object.entries(data.blendshapes)
                .filter(([, v]) => v > 0.02)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .slice(0, 15);
              console.log('[Debug] Blendshapes 输出:', Object.fromEntries(active));
            }
          }
          if (data.error) {
            console.error('[WS] Backend error:', data.error);
          }
        } catch (e) {
          console.error('[WS] Failed to parse message', e);
        }
      };
      
      ws.onclose = () => {
        console.log('[WS] Disconnected');
        setIsConnected(false);
        setIsRecording(false);
        isRecordingRef.current = false;
      };
      
      ws.onerror = () => {
        setError('WebSocket 连接失败，请确保后端服务已启动 (python server.py)');
      };
      
      wsRef.current = ws;
    };

    connect();
    
    return () => {
      wsRef.current?.close();
    };
  }, [url]);

  const startRecording = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('WebSocket 未连接');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      mediaStreamRef.current = stream;
      
      // Create AudioContext; request 16kHz but note browsers may not honor this
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const actualSampleRate = audioContext.sampleRate;
      if (actualSampleRate !== 16000) {
        console.warn(`[Audio] ⚠️ 采样率 ${actualSampleRate}Hz ≠ 16kHz，将重采样！`);
      } else {
        console.log(`[Audio] ✓ 采样率 16kHz (正确)`);
      }
      
      // Load the AudioWorklet processor
      await audioContext.audioWorklet.addModule('/audio-processor.js');
      
      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');
      
      // Set the ref BEFORE connecting, so the message handler sees it as true
      isRecordingRef.current = true;
      setIsRecording(true);
      
      workletNode.port.onmessage = (event) => {
        // Use ref here, NOT state - avoids stale closure
        if (!isRecordingRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }
        
        const { audioData } = event.data as { audioData: Float32Array };
        
        // Accumulate chunks to build up a ~500ms buffer before sending
        // AudioWorklet sends 128-sample chunks; at 16kHz that's 8ms each
        // We want ~8192 samples (512ms) before sending to the backend for good inference
        accumulatorRef.current.push(audioData);
        
        const totalSamples = accumulatorRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
        
        // 4096 samples at 16kHz = 256ms，给模型更多音素上下文，口型更准确
        if (totalSamples >= 4096) {
          // Merge all accumulated chunks into one buffer
          const merged = new Float32Array(totalSamples);
          let offset = 0;
          for (const chunk of accumulatorRef.current) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }
          accumulatorRef.current = [];
          
          // Frontend silence gate: do NOT send if below threshold
          // This prevents unnecessary WebSocket traffic and backend inference on silence
          // Frontend silence gate: lower threshold to be safe with quiet microphones
          const FRONTEND_SILENCE_THRESHOLD = 0.015;
          let maxAmp = 0;
          for (let i = 0; i < merged.length; i++) {
            const abs = Math.abs(merged[i]);
            if (abs > maxAmp) maxAmp = abs;
          }

          if (Math.random() < 0.2) {
            console.log(`[Audio] amp=${maxAmp.toFixed(4)} ${maxAmp >= FRONTEND_SILENCE_THRESHOLD ? '→ sending' : '→ silent, skip'}`);
          }

          if (maxAmp < FRONTEND_SILENCE_THRESHOLD) {
            setIsSilent(true);
            return;
          }
          
          setIsSilent(false);

          // 模型要求 16kHz，若浏览器不是 16kHz 则需重采样
          let toSend = merged;
          const sampleRate = audioContextRef.current?.sampleRate ?? 16000;
          if (sampleRate !== 16000) {
            toSend = resampleTo16k(merged, sampleRate);
          }
          wsRef.current.send(toSend.buffer);
        }
      };
      
      source.connect(workletNode);
      workletNode.connect(audioContext.destination);
      
      // Store worklet node so we can disconnect it later
      (audioContext as any).__workletNode = workletNode;
      (audioContext as any).__source = source;
      
      setError(null);
    } catch (err) {
      console.error('[Audio] Error starting recording:', err);
      setError(`麦克风访问失败: ${err}`);
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, []);

  // Accumulator buffer ref (lives outside component renders)
  const accumulatorRef = useRef<Float32Array[]>([]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    accumulatorRef.current = [];
    
    const audioContext = audioContextRef.current;
    if (audioContext) {
      const workletNode = (audioContext as any).__workletNode;
      const source = (audioContext as any).__source;
      if (workletNode) workletNode.disconnect();
      if (source) source.disconnect();
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setBlendshapes({});
  }, []);

  return {
    isConnected,
    isRecording,
    blendshapes,
    isSilent,
    startRecording,
    stopRecording,
    error
  };
}
