# Wav2ARKit 实时 3D 数字人驱动系统

## 快速开始

### 1. 安装 Python 依赖
后端推理服务需要 Python 环境。请在终端中运行以下命令安装依赖：
```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动前端项目
回到项目根目录，安装 Node 依赖并启动 Next.js 开发服务器：
```bash
npm install
npm run dev
```

### 3. 使用说明
1. 打开浏览器访问 `http://localhost:3000`
2. 点击右上角的 **"一键启动后端服务"**，这会在后台启动 Python WebSocket 服务器 (监听 8000 端口)。
3. 在右侧面板点击 **"上传数字人模型"**，选择一个包含 52 个标准 ARKit Blendshapes 的 `.glb` 或 `.gltf` 文件。
4. 点击 **"开始实时驱动"**，允许浏览器访问麦克风。对着麦克风说话，即可看到 3D 数字人的表情实时变化！

## 目录结构
- `app/page.tsx`: 主页面 UI
- `components/Avatar.tsx`: 基于 React Three Fiber 的 3D 模型渲染组件
- `hooks/useAudioWebSocket.ts`: 麦克风音频采集与 WebSocket 通信逻辑
- `backend/server.py`: 基于 FastAPI 和 ONNX Runtime 的推理服务
