import React, { useEffect, useRef, useState } from "react";
import { SpeechRecognizor } from "@iris-family/speech-sdk.ts";
import { IFLYTEK_CREDS } from "../constants";

export const SpeechRecognizorInput: React.FC = () => {
  const recognizor = useRef<SpeechRecognizor>(
    new SpeechRecognizor(IFLYTEK_CREDS)
  );
  const [recResult, setRecResult] = useState("");
  const [resStatus, setRecStatus] = useState(recognizor.current.status);

  useEffect(() => {
    recognizor.current.subscribeStreamRecUpdate(setRecResult);
    recognizor.current.subscribeStatusChange(setRecStatus);
  }, []);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div style={{ display: "flex" }}>
        <em
          style={{
            minWidth: "30em",
            background: "#888",
            opacity: 0.5,
            borderRadius: "6px",
          }}
        >
          {recResult}
        </em>

        {(() => {
          switch (resStatus) {
            case "IDLE":
              return (
                <button
                  onClick={() =>
                    recognizor.current
                      .record()
                      .then(() => console.log("started recording"))
                  }
                >
                  Start
                </button>
              );
            case "PAUSED":
              //   case "RECOGNIZING":
              return (
                <button onClick={() => recognizor.current.record()}>
                  Resume
                </button>
              );
            case "RECORDING":
              return (
                <button onClick={() => recognizor.current.pause()}>
                  Pause
                </button>
              );
          }
        })()}
      </div>
      <code>Recognizor status: {resStatus}</code>
    </div>
  );
};
