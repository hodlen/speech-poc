import { TTSGenerator } from "@iris-family/speech-sdk.ts";
import React, { useRef, useState } from "react";

export const TextPlayer: React.FC = () => {
  const [text, setText] = useState("");
  const playerRef = useRef(new TTSGenerator());

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {(() => {
        switch (playerRef.current.status) {
          case "init":
            return (
              <button onClick={() => playerRef.current.start(text)}>
                Play
              </button>
            );
          default:
            return (
              <button onClick={() => playerRef.current.stop()}>Stop</button>
            );
        }
      })()}
    </div>
  );
};
