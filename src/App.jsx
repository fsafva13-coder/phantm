import { useCallback, useEffect, useRef, useState } from "react";
import NeuralCanvas from "./components/NeuralCanvas.jsx";
import Robot from "./components/Robot.jsx";
import Telemetry from "./components/Telemetry.jsx";
import Chat from "./components/Chat.jsx";

const STATUS = {
  idle: "Move your cursor to activate nodes",
  listening: "Listening — speak now",
  thinking: "Processing through neural layers",
  speaking: "Transmitting response",
};
const TICKER = [
  "NEURAL TRACKING",
  "VOICE INTERFACE",
  "GPT-OSS 120B VIA GROQ",
  "MIC-REACTIVE NODES",
  "SERVERLESS API",
  "CURSOR INTELLIGENCE",
  "EMOTION-STATE AVATAR",
  "PHANTM v1.0",
];

const SpeechRecognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function App() {
  const [booted, setBooted] = useState(false);
  const [bootPct, setBootPct] = useState(0);
  const [mode, setMode] = useState("idle");
  const [soundOn, setSoundOn] = useState(true);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: "assistant",
      content: "Neural sync complete. 72 perception nodes online. I am PHANTM. Speak or type, and I will answer.",
    },
  ]);

  const modeRef = useRef("idle");
  const pointerRef = useRef({ x: window.innerWidth * 0.7, y: window.innerHeight * 0.4 });
  const amplitudeRef = useRef(0);
  const pulseRef = useRef(0);
  const historyRef = useRef([]);
  const idRef = useRef(1);
  const recognitionRef = useRef(null);
  const micRef = useRef({ stream: null, ctx: null, analyser: null, data: null });
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const soundRef = useRef(true);

  const busy = mode === "thinking" || mode === "speaking";

  const changeMode = useCallback((m) => {
    modeRef.current = m;
    setMode(m);
  }, []);

  // ── boot sequence ──────────────────────────────────────────────
  useEffect(() => {
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 7 + 3;
      setBootPct(Math.min(100, p));
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(() => setBooted(true), 250);
      }
    }, 55);
    return () => clearInterval(iv);
  }, []);

  // ── pointer tracking + smooth custom cursor (no React re-renders) ──
  useEffect(() => {
    const target = { x: -100, y: -100 };
    const ring = { x: -100, y: -100 };
    const onMove = (e) => {
      pointerRef.current = { x: e.clientX, y: e.clientY };
      target.x = e.clientX;
      target.y = e.clientY;
      if (dotRef.current) dotRef.current.style.transform = `translate(${e.clientX - 3}px, ${e.clientY - 3}px)`;
    };
    window.addEventListener("pointermove", onMove);
    let raf;
    const loop = () => {
      ring.x += (target.x - ring.x) * 0.22;
      ring.y += (target.y - ring.y) * 0.22;
      if (ringRef.current) ringRef.current.style.transform = `translate(${ring.x - 16}px, ${ring.y - 16}px)`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  // ── amplitude: real mic level while listening, synthetic envelope while speaking ──
  useEffect(() => {
    let raf;
    const tick = () => {
      const m = modeRef.current;
      const mic = micRef.current;
      let target = 0;
      if (m === "listening" && mic.analyser) {
        mic.analyser.getByteFrequencyData(mic.data);
        let sum = 0;
        for (let i = 0; i < mic.data.length; i++) sum += mic.data[i];
        target = Math.min(1, sum / mic.data.length / 70);
      } else if (m === "speaking") {
        pulseRef.current *= 0.93;
        target = 0.3 + 0.5 * pulseRef.current + 0.15 * Math.abs(Math.sin(performance.now() / 110));
      } else if (m === "thinking") {
        target = 0.45;
      }
      amplitudeRef.current += (target - amplitudeRef.current) * 0.25;
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    soundRef.current = soundOn;
    if (!soundOn) window.speechSynthesis?.cancel();
  }, [soundOn]);

  // ── mic helpers ────────────────────────────────────────────────
  const startMeter = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      micRef.current = { stream, ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount) };
    } catch {
      /* meter is cosmetic — recognition can still work */
    }
  };

  const stopMeter = () => {
    const { stream, ctx } = micRef.current;
    stream?.getTracks().forEach((t) => t.stop());
    ctx?.close().catch(() => {});
    micRef.current = { stream: null, ctx: null, analyser: null, data: null };
  };

  // ── speech out ─────────────────────────────────────────────────
  const speak = (text) =>
    new Promise((resolve) => {
      const synth = window.speechSynthesis;
      if (!synth || !soundRef.current) return setTimeout(resolve, Math.min(2500, 300 + text.length * 22));
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const pick =
        voices.find((v) => /daniel|google uk english male|alex/i.test(v.name)) ||
        voices.find((v) => v.lang?.startsWith("en")) ||
        voices[0];
      if (pick) u.voice = pick;
      u.rate = 0.92;
      u.pitch = 0.75;
      u.onboundary = () => {
        pulseRef.current = 1;
      };
      u.onend = resolve;
      u.onerror = resolve;
      synth.speak(u);
    });

  // ── send a message to PHANTM ───────────────────────────────────
  const send = async (text) => {
    const clean = text.trim();
    if (!clean || modeRef.current === "thinking" || modeRef.current === "speaking") return;
    setNotice("");
    setMessages((m) => [...m, { id: idRef.current++, role: "user", content: clean }]);
    historyRef.current = [...historyRef.current, { role: "user", content: clean }];
    changeMode("thinking");

    const typingId = idRef.current++;
    setMessages((m) => [...m, { id: typingId, role: "assistant", content: "", typing: true }]);

    let reply = "Neural signal lost. Recalibrating.";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyRef.current }),
      });
      const data = await res.json();
      reply = data.reply || reply;
    } catch {
      reply = "I cannot reach my core. Check the connection and try again.";
    }

    historyRef.current = [...historyRef.current, { role: "assistant", content: reply }];
    setMessages((m) => m.map((x) => (x.id === typingId ? { ...x, content: reply, typing: false } : x)));
    changeMode("speaking");
    await speak(reply);
    changeMode("idle");
  };

  // ── voice input ────────────────────────────────────────────────
  const toggleListen = async () => {
    if (!SpeechRecognition) return;
    if (modeRef.current === "listening") {
      recognitionRef.current?.stop();
      return;
    }
    if (busy) return;
    window.speechSynthesis?.cancel();
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    recognitionRef.current = rec;
    let heard = false;
    rec.onresult = (e) => {
      heard = true;
      stopMeter();
      send(e.results[0][0].transcript);
    };
    rec.onerror = (e) => {
      stopMeter();
      changeMode("idle");
      setNotice(e.error === "not-allowed" ? "Microphone blocked. Allow access in your browser, or type instead." : "I did not catch that. Try again or type.");
    };
    rec.onend = () => {
      if (!heard && modeRef.current === "listening") {
        stopMeter();
        changeMode("idle");
      }
    };
    changeMode("listening");
    rec.start();
    startMeter();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send(input);
    setInput("");
  };

  return (
    <div className={`app mode-${mode}`}>
      {!booted && (
        <div className="boot">
          <div className="boot-title">PHANTM</div>
          <div className="boot-sub">INITIALIZING NEURAL ARCHITECTURE</div>
          <div className="boot-bar">
            <div style={{ width: `${bootPct}%` }} />
          </div>
          <div className="boot-pct">{Math.floor(bootPct)}% — LOADING PERCEPTION CORE</div>
        </div>
      )}

      <div ref={ringRef} className="cursor-ring" />
      <div ref={dotRef} className="cursor-dot" />

      <div className="bg" aria-hidden="true">
        <div className="bg-grid" />
        <div className="bg-scan" />
        <div className="bg-vignette" />
      </div>

      <div className="shell">
        <nav className="nav">
          <div className="brand">
            <svg width="20" height="20" viewBox="0 0 22 22">
              <polygon points="11,1 21,6 21,16 11,21 1,16 1,6" fill="none" stroke="var(--pink)" strokeWidth="1.2" />
              <polygon points="11,5 17,8 17,14 11,17 5,14 5,8" fill="var(--pink)" opacity=".2" />
              <circle cx="11" cy="11" r="2.5" fill="var(--pink)">
                <animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite" />
              </circle>
            </svg>
            <span className="brand-name">PHANTM</span>
            <span className="brand-tag">ADAPTIVE PERCEPTION ENGINE</span>
          </div>
          <div className="status">
            <i className="dot" />
            {STATUS[mode].toUpperCase()}
          </div>
          <div className="nav-links">
            <a href="https://github.com/fsafva13-coder" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </nav>

        <main className="hero">
          <NeuralCanvas pointerRef={pointerRef} amplitudeRef={amplitudeRef} modeRef={modeRef} />

          <section className="left">
            <div className="eyebrow">
              <i className="dot" /> PROJECT :: ADAPTIVE-PERCEPTION-ENGINE
            </div>
            <h1 className="title" data-text="PHANTM">
              PHANTM
            </h1>
            <div className="acronym">PERCEPTUAL · HEURISTIC · ADAPTIVE · NEURAL · TRACKING · MACHINE</div>
            <div className="rule" />

            <Chat messages={messages} />

            {notice && <div className="notice">{notice}</div>}

            <form className="composer" onSubmit={onSubmit}>
              {SpeechRecognition && (
                <button
                  type="button"
                  className={`btn mic ${mode === "listening" ? "live" : ""}`}
                  onClick={toggleListen}
                  disabled={busy}
                  aria-label={mode === "listening" ? "Stop listening" : "Speak to PHANTM"}
                >
                  {mode === "listening" ? "◉ STOP" : "◎ SPEAK"}
                </button>
              )}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Transmit a message to PHANTM..."
                disabled={busy || mode === "listening"}
                maxLength={500}
                aria-label="Message"
              />
              <button type="submit" className="btn send" disabled={busy || !input.trim()}>
                SEND ▶
              </button>
              <button
                type="button"
                className={`btn ghost ${soundOn ? "" : "off"}`}
                onClick={() => setSoundOn((s) => !s)}
                aria-pressed={soundOn}
                title="Toggle spoken replies"
              >
                {soundOn ? "SOUND ON" : "SOUND OFF"}
              </button>
            </form>
          </section>

          <section className="right">
            <Telemetry amplitudeRef={amplitudeRef} modeRef={modeRef} />
            <div className="robot-wrap">
              <div className="orbit orbit-a" />
              <div className="orbit orbit-b" />
              <Robot mode={mode} pointerRef={pointerRef} amplitudeRef={amplitudeRef} />
            </div>
            <div className="caption">◈ PHANTM PERCEPTION CORE ◈</div>
          </section>
        </main>

        <div className="ticker" aria-hidden="true">
          <div className="ticker-track">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i}>✦ {t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
