"use client";

import { useState, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Bounds, useBounds } from '@react-three/drei';
import { Avatar } from '@/components/Avatar';
import { useAudioWebSocket } from '@/hooks/useAudioWebSocket';
import { Mic, MicOff, Upload, Play, Server, AlertCircle } from 'lucide-react';

export default function Home() {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelType, setModelType] = useState<'gltf' | 'fbx' | null>(null);
  const [serverStatus, setServerStatus] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Connect to the Python WebSocket server
  const { 
    isConnected, 
    isRecording, 
    blendshapes,
    isSilent,
    startRecording, 
    stopRecording,
    error: wsError 
  } = useAudioWebSocket('ws://localhost:8000/ws/audio');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
      
      // 判断文件类型
      if (file.name.toLowerCase().endsWith('.fbx')) {
        setModelType('fbx');
      } else {
        setModelType('gltf');
      }
    }
  };

  const startBackendServer = async () => {
    setServerStatus('starting');
    try {
      const res = await fetch('/api/start-backend', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setServerStatus('running');
      } else {
        setServerStatus('error');
        console.error(data.error);
      }
    } catch (err) {
      setServerStatus('error');
      console.error(err);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-4 flex justify-between items-center bg-gray-900">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="bg-blue-600 p-1.5 rounded-lg">🤖</span> 
          Wav2ARKit 实时数字人
        </h1>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {isConnected ? 'WebSocket 已连接' : 'WebSocket 未连接'}
          </div>
          
          <button 
            onClick={startBackendServer}
            disabled={serverStatus === 'starting' || serverStatus === 'running'}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-sm transition-colors disabled:opacity-50"
          >
            <Server size={16} />
            {serverStatus === 'idle' && '一键启动后端服务'}
            {serverStatus === 'starting' && '启动中...'}
            {serverStatus === 'running' && '服务运行中'}
            {serverStatus === 'error' && '启动失败'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: 3D Viewport */}
        <div className="flex-1 relative border-r border-gray-800">
          {modelUrl ? (
            <Canvas camera={{ position: [0, 0, 1.5], fov: 45 }}>
              <color attach="background" args={['#111827']} />
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 10]} intensity={1} />
              <Environment preset="city" />
              <ContactShadows opacity={0.4} scale={10} blur={2} far={4} />
              <Bounds fit clip observe margin={1.2}>
                <Suspense fallback={null}>
                  <Avatar url={modelUrl} type={modelType!} blendshapes={blendshapes} isSilent={isSilent} />
                </Suspense>
              </Bounds>
              <OrbitControls makeDefault />
            </Canvas>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <div className="w-24 h-24 mb-4 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">
                <Upload size={32} />
              </div>
              <p>请在右侧上传 3D 模型 (.glb / .gltf / .fbx)</p>
            </div>
          )}
        </div>

        {/* Right Panel: Controls */}
        <div className="w-80 bg-gray-900 p-6 flex flex-col gap-8">
          {/* Model Upload */}
          <section>
            <h2 className="text-lg font-semibold mb-4 border-b border-gray-800 pb-2">1. 模型设置</h2>
            <input 
              type="file" 
              accept=".glb,.gltf,.fbx" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
            >
              <Upload size={18} />
              上传数字人模型
            </button>
            <p className="text-xs text-gray-500 mt-2">
              * 模型需要包含 52 个标准 ARKit Blendshapes
            </p>
          </section>

          {/* Audio Controls */}
          <section>
            <h2 className="text-lg font-semibold mb-4 border-b border-gray-800 pb-2">2. 麦克风驱动</h2>
            
            {wsError && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-800 rounded-lg text-red-200 text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{wsError}</p>
              </div>
            )}

            <button 
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!isConnected}
              className={`w-full py-4 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium text-lg ${
                !isConnected 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : isRecording 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff size={24} />
                  停止驱动
                </>
              ) : (
                <>
                  <Mic size={24} />
                  开始实时驱动
                </>
              )}
            </button>

            {isRecording && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                <span className="text-sm text-red-400">正在录音并发送数据...</span>
              </div>
            )}
          </section>

          {/* Debug Info */}
          <section className="mt-auto">
            <h2 className="text-sm font-semibold mb-2 text-gray-400">Debug Info (原始值)</h2>
            <div className="bg-gray-950 p-3 rounded-lg text-xs font-mono text-gray-500 h-32 overflow-y-auto">
              {Object.keys(blendshapes).length > 0 ? (
                Object.entries(blendshapes)
                  .filter(([_, val]) => val > 0.01)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, val]) => (
                    <div key={name} className="flex justify-between gap-2">
                      <span className="truncate">{name}:</span>
                      <span className={val > 0.3 ? 'text-yellow-400' : 'text-green-400'}>
                        {val.toFixed(3)}
                      </span>
                    </div>
                  ))
              ) : (
                <p>等待数据... {isRecording ? "(正在录音...)" : "(请点击开始驱动)"}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
