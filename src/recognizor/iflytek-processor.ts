import CryptoJS from "crypto-js";
import {
  AudioData,
  IFlyTekApiCredentials,
  StreamAudioProcessor,
  Unsubscribe,
} from "./base";
import { Pubsub } from "../utils/pub-sub";

type Result = {
  finished: boolean;
  recResult: string;
};

export const createIFlyTekSpeechRecognitionProcessor = async (
  credentials: IFlyTekApiCredentials
): Promise<StreamAudioProcessor<Result>> => {
  const wsUrl = await getWebSocketUrl(credentials);
  return new IFlyTekSpeechRecognitionProcessor(credentials, wsUrl);
};

class IFlyTekSpeechRecognitionProcessor
  implements StreamAudioProcessor<Result>
{
  private wsConn: WebSocket;
  private resultSubs = new Pubsub<Result>();
  private status: "CONNECTING" | "OPENED" | "CONTINUING" | "CLOSED" =
    "CONNECTING";
  private recognitionBuffer: Array<{
    text: string;
    deleted: boolean;
  }> = [];
  private audioBuffer: number[] = [];

  constructor(private credentials: IFlyTekApiCredentials, wsUrl: string) {
    this.wsConn = new WebSocket(wsUrl);
    this.wsConn.onopen = () => {
      this.status = "OPENED";
    };
    this.wsConn.onmessage = (e) => {
      this.processResponse(e.data);
    };
    this.wsConn.onerror = console.error;
  }

  public processAudio(audioWaves: number[]) {
    this.audioBuffer = [...this.audioBuffer, ...audioWaves];
    switch (this.status) {
      case "CONNECTING":
        setTimeout(() => {
          this.processAudio(audioWaves);
        }, 50);
        return;
      case "CONTINUING":
      case "OPENED": {
        while (this.audioBuffer.length >= 1280) {
          const audioSlice = this.audioBuffer.splice(0, 1280);
          const request = this.makePayload(audioSlice);
          this.wsConn.send(JSON.stringify(request));
          this.status = "CONTINUING";
        }
        return;
      }
      case "CLOSED":
        throw Error("Connection is closed");
    }
  }

  public subscribeResults(cb: (result: Result) => void): Unsubscribe {
    return this.resultSubs.subscribe(cb);
  }

  public terminate(): void {
    if (this.recognitionBuffer) {
      this.submitResult();
    }
    // Send termination frame
    this.wsConn.send(
      JSON.stringify({
        data: {
          status: 2,
          format: "audio/L16;rate=16000",
          encoding: "raw",
          audio: "",
        },
      })
    );
  }

  private processResponse(result: string) {
    const resultObj = JSON.parse(result);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recStr = Array.from<any>(resultObj.data.result.ws)
      .map((w) => w.cw[0].w)
      .join("");
    const dataObj = resultObj.data.result;
    if (dataObj.pgs === "rpl") {
      const replaceStart = Number(dataObj.rg[0] - 1); // sn to index
      const replaceEnd = Number(dataObj.rg[1] - 1);
      this.recognitionBuffer
        .slice(replaceStart, replaceEnd + 1)
        .forEach((w) => {
          w.deleted = true;
        });
    }
    this.recognitionBuffer.push({
      text: recStr,
      deleted: false,
    });
    this.submitResult();
    // TODO: Server may close the connection prematurely if it detects silence
    if (
      (resultObj.code === 0 && resultObj.data.status === 2) ||
      resultObj.code !== 0
    ) {
      this.wsConn.close();
      this.status = "CLOSED";
      if (resultObj.code != 0) {
        console.error(`${resultObj.code}:${resultObj.message}`);
      }
    }
  }

  private getRecString() {
    return this.recognitionBuffer
      .filter((w) => !w.deleted)
      .map((w) => w.text)
      .join("");
  }

  private submitResult() {
    this.resultSubs.publish({
      finished: this.status === "CLOSED",
      recResult: this.getRecString(),
    });
  }

  private makePayload(audioSlice: number[]) {
    const encodedAudio = encodeAudioToBase64(audioSlice);
    const payloadData = {
      format: "audio/L16;rate=16000",
      encoding: "raw",
      audio: encodedAudio,
    };
    const payload =
      this.status === "OPENED"
        ? {
            ...getRequestMetaParams(this.credentials.appId),
            data: {
              status: 0, // opening frame
              ...payloadData,
            },
          }
        : {
            data: {
              status: 1, // continue frame
              ...payloadData,
            },
          };
    return payload;
  }
}

// TODO: The API endpoint may vary from this one.
const getWebSocketUrl = async (credentials: IFlyTekApiCredentials) => {
  const url = "wss://iat-api.xfyun.cn/v2/iat";
  const host = "iat-api.xfyun.cn";
  const apiKey = credentials.apiKey;
  const apiSecret = credentials.apiSecret;
  const date = new Date().toUTCString();
  const algorithm = "hmac-sha256";
  const headers = "host date request-line";
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
  const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, apiSecret);
  const signature = CryptoJS.enc.Base64.stringify(signatureSha);
  const authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
  const authorization = btoa(authorizationOrigin);
  return `${url}?authorization=${authorization}&date=${date}&host=${host}`;
};

const getRequestMetaParams = (appId: string) => ({
  common: {
    app_id: appId,
  },
  business: {
    language: "zh_cn", //小语种可在控制台--语音听写（流式）--方言/语种处添加试用
    domain: "iat",
    accent: "mandarin", //中文方言可在控制台--语音听写（流式）--方言/语种处添加试用
    vad_eos: 5000,
    dwa: "wpgs", //为使该功能生效，需到控制台开通动态修正功能（该功能免费）
  },
});

const encodeAudioToBase64 = (audioWaves: AudioData): string => {
  let binary = "";
  const bytes = new Uint8Array(audioWaves);
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return window.btoa(binary);
};

export type StreamingRecognizor = Awaited<
  ReturnType<typeof createIFlyTekSpeechRecognitionProcessor>
>;
