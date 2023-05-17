import { Pubsub } from "../utils/pub-sub";
import { AudioData, StreamingAudioRecorder } from "./base";
import { transcode } from "./transcode-audio";

export const createBrowserStreamingRecorder =
  async (): Promise<StreamingAudioRecorder> => {
    const audioContext = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const sourceNode = audioContext.createMediaStreamSource(stream);
    const scriptProcessor = audioContext.createScriptProcessor(0, 1, 1);

    let audioSubs = new Pubsub<AudioData>();
    scriptProcessor.onaudioprocess = (e) => {
      const audioWaves = e.inputBuffer.getChannelData(0);
      const transcodedAudio = transcode(audioWaves);
      audioSubs.publish(transcodedAudio);
    };

    sourceNode.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    return {
      startOrResume() {
        audioContext.resume();
      },
      pause() {
        audioContext.suspend();
      },
      stop() {
        audioContext.suspend();
        audioSubs = new Pubsub<AudioData>();
      },
      subscribeStreamingAudio(cb) {
        return audioSubs.subscribe(cb);
      },
    };
  };
