import "./App.css";
import reactLogo from "./assets/react.svg";
import { AiChat } from "./components/ai-chat";
import { SpeechRecognizorInput } from "./components/recorder-input";
import viteLogo from "/vite.svg";

function App() {
  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>流式语音识别 POC</h1>
      <div className="card">
        <SpeechRecognizorInput />
      </div>
      <div>
        Chat with ChatGPT!
        <AiChat />
      </div>
    </>
  );
}

export default App;
