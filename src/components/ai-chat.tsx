import React, { useEffect, useRef, useState } from "react";
import { IrisClient } from "@iris-family/client";

export const AiChat: React.FC = () => {
  const clientRef = useRef(
    new IrisClient({
      endpoint: "ws://ec2-34-213-84-192.us-west-2.compute.amazonaws.com:8765",
      token: "",
    })
  );
  const [message, setMessage] = useState("");
  const [thinking, setThinking] = useState("");
  const [control, setControl] = useState("");
  const [input, setInput] = useState("");
  const [dialogue, setDialogue] = useState("[]");
  useEffect(() => {
    const client = clientRef.current;
    client.subscribeToStreamingResponse((response) => {
      setMessage(response?.message ?? "");
      setThinking(response?.thinking ?? "");
      setControl(response?.controlInstructions ?? "");
    });
    client.subscribeToChatHistory((history) =>
      setDialogue(JSON.stringify(history, null, 2))
    );
  }, []);

  return (
    <div>
      <div>{message}</div>
      <div>{thinking}</div>
      <div>{control}</div>
      <div>{dialogue}</div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={() => clientRef.current.sendMessage(input)}>Send</button>
    </div>
  );
};
