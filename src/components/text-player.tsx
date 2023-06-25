import { IFlyTekStreamConsumerSpeechSynthesizer } from "@iris-family/speech-sdk";
import React, { useRef, useState } from "react";
import { IFLYTEK_CREDS } from "../constants";

export const TextPlayer: React.FC = () => {
  const [text, setText] = useState("");
  const playerRef = useRef(
    new IFlyTekStreamConsumerSpeechSynthesizer(IFLYTEK_CREDS)
  );

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        onClick={() => {
          playerRef.current.updateText(text);
        }}
      >
        Play Text
      </button>
      <button
        onClick={() => {
          playerRef.current.stopPlaying();
        }}
      >
        Stop Playing
      </button>
      <button
        onClick={() => {
          playerRef.current
            .waitForPlaying()
            .then(() => alert("Playing finished"));
        }}
      >
        Wait for Playing
      </button>
    </div>
  );
};
