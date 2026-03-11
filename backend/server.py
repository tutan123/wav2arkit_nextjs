import json
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load ONNX model
# Assuming the model is in the parent directory or specify the correct path
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../wav2arkit_cpu/wav2arkit_cpu.onnx")

print(f"Loading model from: {MODEL_PATH}")
try:
    session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    print("Model loaded successfully!")
except Exception as e:
    print(f"Failed to load model: {e}")
    session = None

# Blendshape names based on the config.json
BLENDSHAPE_NAMES = [
    "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight",
    "cheekPuff", "cheekSquintLeft", "cheekSquintRight",
    "eyeBlinkLeft", "eyeBlinkRight", "eyeLookDownLeft", "eyeLookDownRight",
    "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight",
    "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight",
    "eyeWideLeft", "eyeWideRight",
    "jawForward", "jawLeft", "jawOpen", "jawRight",
    "mouthClose", "mouthDimpleLeft", "mouthDimpleRight", "mouthFrownLeft", "mouthFrownRight",
    "mouthFunnel", "mouthLeft", "mouthLowerDownLeft", "mouthLowerDownRight",
    "mouthPressLeft", "mouthPressRight", "mouthPucker", "mouthRight",
    "mouthRollLower", "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper",
    "mouthSmileLeft", "mouthSmileRight", "mouthStretchLeft", "mouthStretchRight",
    "mouthUpperUpLeft", "mouthUpperUpRight",
    "noseSneerLeft", "noseSneerRight", "tongueOut"
]

@app.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("Client connected to WebSocket")
    
    try:
        while True:
            # Receive audio data (expecting raw float32 bytes at 16kHz)
            data = await websocket.receive_bytes()
            
            if session is None:
                await websocket.send_json({"error": "Model not loaded"})
                continue
                
            # Convert bytes to numpy array
            audio_data = np.frombuffer(data, dtype=np.float32)
            
            max_amplitude = np.max(np.abs(audio_data))
            
            # Silence detection: skip inference if audio is mostly silent
            # Microphone noise is typically 0.005-0.015, speech is usually 0.05+
            SILENCE_THRESHOLD = 0.04
            if max_amplitude < SILENCE_THRESHOLD:
                # Send zero blendshapes when silent
                zero_shapes = {name: 0.0 for name in BLENDSHAPE_NAMES}
                await websocket.send_json({"blendshapes": zero_shapes})
                continue
            
            if np.random.random() < 0.1:
                print(f"[Audio] {len(audio_data)} samples, max amplitude: {max_amplitude:.4f} -> running inference")
            
            # Reshape to [batch_size, num_samples] -> [1, num_samples]
            audio_input = audio_data.reshape(1, -1)
            
            # Run inference
            # Output shape: [batch_size, num_frames, 52]
            try:
                # Run inference in a thread pool to avoid blocking the event loop
                blendshapes_output = await asyncio.to_thread(
                    session.run, None, {"audio_waveform": audio_input}
                )
                blendshapes = blendshapes_output[0]
                
                # We take the first frame (or average them if multiple)
                # If audio chunk is small (e.g., 1/30s = ~533 samples), it might produce 1 frame
                if blendshapes.shape[1] > 0:
                    # Get the last frame's blendshapes for real-time responsiveness
                    current_blendshapes = blendshapes[0, -1, :].tolist()
                    
                    # Map to dictionary
                    result = {
                        name: float(val) for name, val in zip(BLENDSHAPE_NAMES, current_blendshapes)
                    }
                    
                    await websocket.send_json({"blendshapes": result})
            except Exception as e:
                print(f"Inference error: {e}")
                await websocket.send_json({"error": str(e)})
                
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")

@app.get("/")
def read_root():
    return {"status": "Wav2ARKit Backend is running", "model_loaded": session is not None}

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
