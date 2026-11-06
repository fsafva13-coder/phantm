import { useEffect, useRef } from "react";

function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`bubble-row ${isUser ? "user" : "bot"}`}>
      <div className="avatar">{isUser ? "U" : "P"}</div>
      <div className="bubble">
        {msg.content}
        {msg.typing && <span className="caret">▋</span>}
      </div>
    </div>
  );
}

export default function Chat({ messages }) {
  const logRef = useRef(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div ref={logRef} className="chat-log" aria-live="polite">
      {messages.map((m) => (
        <Bubble key={m.id} msg={m} />
      ))}
    </div>
  );
}
