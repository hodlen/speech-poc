export type AudioData = Array<number>;

export type AudioStreamListener = (audio: AudioData) => void;

export type Unsubscribe = () => void;

export type StreamingAudioRecorder = {
  startOrResume(): void;
  pause(): void;
  stop(): void;
  subscribeStreamingAudio(cb: AudioStreamListener): Unsubscribe;
};

export type StreamAudioProcessor<ResultType> = {
  processAudio(audioWaves: number[]): void;
  subscribeResults: (cb: (result: ResultType) => void) => Unsubscribe;
  terminate(): void;
};

export type IFlyTekApiCredentials = {
  appId: string;
  apiSecret: string;
  apiKey: string;
};
