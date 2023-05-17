import invariant from "tiny-invariant";
import { PubsubStore } from "../utils/pub-sub";
import {
  IFlyTekApiCredentials,
  StreamingAudioRecorder,
  Unsubscribe,
} from "./base";
import { createBrowserStreamingRecorder } from "./browser-recorder";
import {
  StreamingRecognizor,
  createIFlyTekSpeechRecognitionProcessor,
} from "./iflytek-processor";

type SpeechRecognizorStatus = "IDLE" | "RECORDING" | "PAUSED";

type RecognitionResult = {
  kind: "DETERMINED" | "INTERMEDIATE";
  result: string;
};

/**
 * StreamSpeechRecognizor是讯飞语音识别的类。
 * 该类操作音频录制及识别，返回实时和最终的转写结果。*/
export class IFlyTekStreamSpeechRecognizor {
  public get status(): SpeechRecognizorStatus {
    return this.statusStore.value;
  }
  /**
   * streamingRecResult 是在识别过程中实时更新的转写结果。*/
  public get streamingRecResult(): string {
    return this.streamingResultStore.value.result;
  }

  // TODO: should be an array of appending results
  private streamingResultStore = new PubsubStore<RecognitionResult>({
    kind: "INTERMEDIATE",
    result: "",
  });
  private statusStore = new PubsubStore<SpeechRecognizorStatus>("IDLE");
  private audioRecorder: StreamingAudioRecorder | undefined;
  private recProcessor: StreamingRecognizor | undefined;
  // A mutable function to be replaced when installing processor
  private cleanupProcessor: (() => void) | undefined;

  /**
   * 使用讯飞账户API信息初始化类
   * @param apiCredentials 讯飞账户API信息，包含appID和API密钥 */
  constructor(private apiCredentials: IFlyTekApiCredentials) {}

  /**
   * 启动录音及继续录音。
   * 过程中可能向用户请求浏览器录音权限等。
   * 如果权限不足或硬件不支持，返回rejected promise。
   * @returns 承诺实例，当录音已经开始或继续时被解决 */
  public async record(): Promise<void> {
    if (!this.audioRecorder) {
      try {
        this.audioRecorder = await createBrowserStreamingRecorder();
      } catch (e) {
        alert("Cannot initiate browser's recording capability");
        throw e;
      }
    }
    if (!this.recProcessor) {
      try {
        await this.installProcessor();
      } catch (e) {
        alert("Cannot initiate iFlyTek speech recognition processor");
        throw e;
      }
    }
    this.audioRecorder.startOrResume();
    this.updateStatus("RECORDING");
  }

  /** 暂停录音。 */
  public pause(): void {
    invariant(this.audioRecorder, "recorder not initiated");
    this.audioRecorder.pause();
    this.removeProcessor();
    this.updateStatus("PAUSED");
  }

  /**停止录音。 */
  public stop(): void {
    this.audioRecorder?.stop();
    this.removeProcessor();
    this.updateStatus("IDLE");
  }

  /**
   * 回调式流式识别提交接口。
   * 每次流式识别API成功返回后调用callback，参数为更新后的全量文本。
   * @param callback 回调函数，参数为更新后的全量文本 */
  public subscribeStreamRecUpdate(
    callback: (updatedBuffer: string) => void
  ): Unsubscribe {
    // TODO: support subscribe to streaming update
    return this.streamingResultStore.subscribe(({ result }) =>
      callback(result)
    );
  }

  /**
   * 回调式状态更新接口。
   * @param callback 回调函数，参数为更新后的状态 */
  public subscribeStatusChange(
    callback: (status: SpeechRecognizorStatus) => void
  ): Unsubscribe {
    return this.statusStore.subscribe(callback);
  }

  /**
   * 当录音暂停或停止后，等待识别结果。
   * 返回的结果等同于完成识别后的fullRecResult。
   * @returns 承诺实例，在获得全量文本时被解决 */
  public waitForRecognition(): Promise<string> {
    throw Error("Not implemented");
  }

  private updateStatus(status: SpeechRecognizorStatus) {
    this.statusStore.publish(status);
  }

  private async installProcessor() {
    invariant(this.audioRecorder && !this.recProcessor);
    this.recProcessor = await createIFlyTekSpeechRecognitionProcessor(
      this.apiCredentials
    );
    const disconnectAudio = this.audioRecorder.subscribeStreamingAudio(
      (audioSlice) => {
        this.recProcessor!.processAudio(audioSlice);
      }
    );
    // TODO: deal with the callback after processor has been removed
    this.recProcessor.subscribeResults(({ finished, recResult }) => {
      this.streamingResultStore.publish({
        kind: finished ? "DETERMINED" : "INTERMEDIATE",
        result: recResult,
      });
    });
    this.cleanupProcessor = () => {
      this.recProcessor?.terminate();
      disconnectAudio();
      // disconnectResult();
    };
  }

  private removeProcessor() {
    this.cleanupProcessor?.();
    this.recProcessor = undefined;
  }
}
