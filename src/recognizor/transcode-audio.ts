export const transcode = (audioData: ArrayLike<number>): number[] => {
  const audio16k = to16kHz(audioData);
  const audio16bit = to16BitPCM(audio16k);
  const audioUint8 = Array.from(new Uint8Array(audio16bit.buffer));
  return audioUint8;
};

const to16kHz = (audioData: ArrayLike<number>): Float32Array => {
  const data = new Float32Array(audioData);
  const fitCount = Math.round(data.length * (16000 / 44100));
  const newData = new Float32Array(fitCount);
  const springFactor = (data.length - 1) / (fitCount - 1);
  newData[0] = data[0];
  for (let i = 1; i < fitCount - 1; i++) {
    const tmp = i * springFactor;
    const before = Math.floor(tmp);
    const after = Math.ceil(tmp);
    const atPoint = tmp - Number(before);
    newData[i] = data[before] + (data[after] - data[before]) * atPoint;
  }
  newData[fitCount - 1] = data[data.length - 1];
  return newData;
};

const to16BitPCM = (input: Float32Array): DataView => {
  const dataLength = input.length * (16 / 8);
  const dataBuffer = new ArrayBuffer(dataLength);
  const dataView = new DataView(dataBuffer);
  let offset = 0;
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return dataView;
};
