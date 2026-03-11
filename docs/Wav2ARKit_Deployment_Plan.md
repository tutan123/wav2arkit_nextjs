# Wav2ARKit 实时 3D 数字人驱动系统技术方案

本方案旨在利用 `wav2arkit_cpu` 模型，通过 Next.js 构建一个实时语音驱动 3D 数字人的 Web 系统。

## 1. 核心架构

系统采用 **前后端分离 + WebSocket 实时通信** 的架构：

- **前端 (Next.js + Three.js)**:
  - 负责麦克风音频采集（16kHz）。
  - 通过 WebSocket 发送音频流到后端。
  - 渲染 3D 数字人模型（GLTF/GLB 格式，包含 ARKit Blendshapes）。
  - 接收后端返回的 Blendshape 权重，实时更新模型表情。
- **后端 (Python + FastAPI/WebSockets)**:
  - 运行 `wav2arkit_cpu.onnx` 模型进行推理。
  - 接收前端音频流，进行必要的预处理。
  - 推理生成 52 个 ARKit Blendshape 权重，并通过 WebSocket 返回给前端。

## 2. 部署方案 (wav2arkit_cpu)

### 环境要求
- Python 3.9+
- `onnxruntime` (CPU 版本)
- `numpy`, `fastapi`, `uvicorn`, `websockets`

### 部署步骤
1. **安装依赖**:
   ```bash
   pip install onnxruntime numpy fastapi uvicorn websockets librosa
   ```
2. **推理服务端实现**:
   创建一个 Python 脚本 `server.py`，加载 `wav2arkit_cpu.onnx`，并启动 WebSocket 服务。

## 3. 前端实现 (Next.js)

### 3D 渲染 (React Three Fiber)
- 使用 `@react-three/fiber` 和 `@react-three/drei` 加载模型。
- 通过 `useFrame` 钩子，每一帧根据收到的权重更新 `mesh.morphTargetInfluences`。

### 音频采集与传输
- 使用 `Web Audio API` (AudioContext) 采集麦克风音频。
- 使用 `ScriptProcessorNode` 或 `AudioWorklet` 将音频数据重采样为 16kHz。
- 通过 WebSocket 二进制流发送音频切片。

## 4. 交互界面设计

- **一键启动按钮**: 触发后端 Python 服务的启动（如果尚未运行）。
- **模型上传**: 支持用户上传自定义的 GLB 模型。
- **实时预览**: 左侧显示 3D 数字人，右侧显示音频波形和连接状态。
- **麦克风开关**: 控制实时驱动的开启与关闭。

## 5. 关键技术点

- **低延迟处理**: 采用流式音频处理，推理时间约 45ms/s，完全满足实时性要求。
- **ARKit 映射**: 确保 3D 模型的 Blendshape 名称与 ARKit 标准（52个）一致，或建立映射表。
- **跨平台兼容**: 使用 ONNX CPU 推理，无需 GPU，部署门槛低。

---

**下一步计划**:
1. 编写后端 Python WebSocket 推理服务代码。
2. 编写前端 Next.js 基础框架及 3D 渲染组件。
3. 实现音频采集与 WebSocket 通信逻辑。
