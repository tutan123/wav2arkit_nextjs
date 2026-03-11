class AudioCaptureProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0 && input[0].length > 0) {
      // Make a copy of the data before transferring (buffer gets detached otherwise)
      const channelData = new Float32Array(input[0]);
      this.port.postMessage({ audioData: channelData });
    }
    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
