import { useEffect, useRef, useState } from "react";

const PINK = "#ff2a6d";
const CYAN = "#05d9e8";
const YELLOW = "#f5c542";
const BG = "#040408";
const PANEL = "#080612";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const EYE_COLOR = { idle: CYAN, listening: PINK, thinking: YELLOW, speaking: CYAN };
const BADGE = { listening: "◉ LISTENING", thinking: "◈ PROCESSING", speaking: "▶ TRANSMITTING", idle: "" };

export default function Robot({ mode, pointerRef, amplitudeRef }) {
  const rootRef = useRef(null);
  const modeRef = useRef(mode);
  const [blink, setBlink] = useState(false);
  const [a, setA] = useState({ ex: 0, ey: 0, tilt: 0, bars: [2, 2, 2, 2, 2, 2, 2] });

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (modeRef.current === "thinking") return;
      setBlink(true);
      setTimeout(() => setBlink(false), 110);
    }, 3000 + Math.random() * 1500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let raf;
    let t = 0;
    const cur = { ex: 0, ey: 0, tilt: 0 };
    const loop = () => {
      t++;
      const m = modeRef.current;
      const amp = amplitudeRef.current;
      let tx = 0;
      let ty = 0;
      let tt = 0;
      if (m === "thinking") {
        tx = Math.cos(t * 0.05) * 3.5;
        ty = Math.sin(t * 0.035) * 2.5;
        tt = Math.sin(t * 0.02) * 8;
      } else if (rootRef.current) {
        const r = rootRef.current.getBoundingClientRect();
        const dx = pointerRef.current.x - (r.left + r.width / 2);
        const dy = pointerRef.current.y - (r.top + r.height / 3);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(4.5, d / 28);
        tx = (dx / d) * k;
        ty = (dy / d) * k;
        tt = clamp(dx / 32, -15, 15);
      }
      cur.ex += (tx - cur.ex) * 0.18;
      cur.ey += (ty - cur.ey) * 0.18;
      cur.tilt += (tt - cur.tilt) * 0.14;

      const bars = Array.from({ length: 7 }, (_, i) => {
        if (m === "speaking") return Math.max(2, Math.abs(Math.sin(t * 0.3 + i * 1.1)) * (3 + amp * 9));
        if (m === "thinking") return Math.max(2, Math.abs(Math.sin(t * 0.12 + i * 0.8)) * 7);
        if (m === "listening") return Math.max(2, amp * 10 * Math.abs(Math.sin(t * 0.2 + i)));
        return i < 3 ? 6 : 2;
      });
      setA({ ex: cur.ex, ey: cur.ey, tilt: cur.tilt, bars });
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [pointerRef, amplitudeRef]);

  const eyeCol = EYE_COLOR[mode] || CYAN;
  const stroke = mode === "speaking" ? CYAN : PINK;
  const glow =
    mode === "thinking" ? "rgba(245,197,66,0.45)" : mode === "listening" ? "rgba(255,42,109,0.5)" : "rgba(5,217,232,0.4)";
  const eyeR = mode === "listening" ? 11 : 10;
  const eyeRy = blink ? 0.3 : eyeR;
  const { ex, ey } = a;

  return (
    <div ref={rootRef} className="robot" aria-label="PHANTM robot avatar" role="img">
      <div className="robot-aura" style={{ background: `radial-gradient(circle, ${glow.replace(/[\d.]+\)$/, "0.1)")} 0%, transparent 60%)` }} />
      <div className="robot-badge" style={{ color: eyeCol, opacity: mode === "idle" ? 0 : 1 }}>
        {BADGE[mode]}
      </div>

      <svg width="190" height="275" viewBox="0 0 190 275" style={{ filter: `drop-shadow(0 0 15px ${glow})`, transition: "filter .5s" }}>
        {/* legs */}
        <rect x="59" y="200" width="27" height="60" rx="12" fill={BG} stroke={stroke} strokeWidth=".9" opacity=".85" />
        <rect x="104" y="200" width="27" height="60" rx="12" fill={BG} stroke={stroke} strokeWidth=".9" opacity=".85" />
        <ellipse cx="72.5" cy="262" rx="20" ry="8.5" fill={BG} stroke={stroke} strokeWidth=".7" opacity=".6" />
        <ellipse cx="117.5" cy="262" rx="20" ry="8.5" fill={BG} stroke={stroke} strokeWidth=".7" opacity=".6" />

        {/* body */}
        <rect x="38" y="114" width="114" height="90" rx="18" fill={BG} stroke={stroke} strokeWidth="1.2" />
        <line x1="38" y1="144" x2="152" y2="144" stroke={PINK} strokeWidth=".4" opacity=".15" />
        <line x1="38" y1="168" x2="152" y2="168" stroke={PINK} strokeWidth=".4" opacity=".15" />
        <rect x="58" y="124" width="74" height="50" rx="9" fill={PANEL} stroke="rgba(255,42,109,0.2)" strokeWidth=".7" />
        <polygon points="95,131 105,137 105,149 95,155 85,149 85,137" fill="none" stroke={eyeCol} strokeWidth="1.3" style={{ transition: "stroke .5s" }} />
        <polygon points="95,135 102,139 102,147 95,151 88,147 88,139" fill={eyeCol} fillOpacity=".15" stroke={eyeCol} strokeWidth=".6">
          <animate attributeName="opacity" values="1;.25;1" dur={mode === "thinking" ? ".8s" : "2s"} repeatCount="indefinite" />
        </polygon>
        <circle cx="95" cy="143" r="3.5" fill={eyeCol}>
          <animate attributeName="opacity" values=".9;.15;.9" dur={mode === "thinking" ? ".6s" : "1.8s"} repeatCount="indefinite" />
        </circle>
        {[0, 1, 2, 3].map((i) => (
          <rect key={"l" + i} x="59" y={128 + i * 9} width="7" height="2.5" rx="1" fill={PINK} opacity=".28" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={"r" + i} x="124" y={128 + i * 9} width="7" height="2.5" rx="1" fill={PINK} opacity=".28" />
        ))}
        {[0, 1, 2].map((i) => (
          <rect key={"p" + i} x={70 + i * 14} y="172" width="9" height="5" rx="2.5" fill={PINK} opacity=".3" />
        ))}

        {/* shoulders + arms */}
        <ellipse cx="29" cy="127" rx="16" ry="14" fill={BG} stroke={stroke} strokeWidth="1" />
        <ellipse cx="161" cy="127" rx="16" ry="14" fill={BG} stroke={stroke} strokeWidth="1" />
        <rect x="10" y="134" width="23" height="58" rx="11" fill={BG} stroke={stroke} strokeWidth=".9" />
        <rect x="157" y="134" width="23" height="58" rx="11" fill={BG} stroke={stroke} strokeWidth=".9" />
        <ellipse cx="21.5" cy="200" rx="14" ry="9.5" fill={BG} stroke={stroke} strokeWidth=".7" />
        <ellipse cx="168.5" cy="200" rx="14" ry="9.5" fill={BG} stroke={stroke} strokeWidth=".7" />

        {/* neck */}
        <rect x="80" y="97" width="30" height="21" rx="6" fill={BG} stroke={stroke} strokeWidth=".8" />

        {/* head */}
        <g style={{ transform: `rotate(${a.tilt}deg)`, transformOrigin: "95px 56px" }}>
          <rect x="44" y="14" width="102" height="86" rx="26" fill={BG} stroke={stroke} strokeWidth="1.5" />
          <rect x="64" y="14" width="62" height="5" rx="2.5" fill={stroke} opacity=".28" />
          <rect x="44" y="42" width="9" height="28" rx="3.5" fill={PANEL} stroke={stroke} strokeWidth=".5" opacity=".65" />
          <rect x="137" y="42" width="9" height="28" rx="3.5" fill={PANEL} stroke={stroke} strokeWidth=".5" opacity=".65" />

          {/* antenna */}
          <line x1="95" y1="14" x2="95" y2="-1" stroke={eyeCol} strokeWidth="2.2" />
          <circle cx="95" cy="-1" r="4.5" fill={eyeCol}>
            <animate attributeName="opacity" values="1;.1;1" dur={mode === "thinking" ? ".5s" : mode === "listening" ? ".7s" : "1.3s"} repeatCount="indefinite" />
          </circle>
          <circle cx="95" cy="-1" r="7" fill="none" stroke={eyeCol} strokeWidth=".6">
            <animate attributeName="r" values="7;18;7" dur="1.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values=".4;0;.4" dur="1.2s" repeatCount="indefinite" />
          </circle>

          {/* sockets */}
          <rect x="50" y="32" width="32" height="26" rx="8" fill="#020106" />
          <rect x="108" y="32" width="32" height="26" rx="8" fill="#020106" />
          <rect x="50" y="32" width="32" height="26" rx="8" fill="none" stroke={eyeCol} strokeWidth=".6" opacity=".45" />
          <rect x="108" y="32" width="32" height="26" rx="8" fill="none" stroke={eyeCol} strokeWidth=".6" opacity=".45" />

          {/* eyes */}
          {[66, 124].map((cx) => (
            <g key={cx}>
              <ellipse cx={cx + ex} cy={45 + ey} rx={eyeR} ry={eyeRy} fill={eyeCol} opacity=".92" style={{ transition: "fill .4s" }}>
                <animate attributeName="opacity" values=".92;.55;.92" dur={mode === "thinking" ? ".7s" : "2.5s"} repeatCount="indefinite" />
              </ellipse>
              <circle cx={cx + ex * 1.8} cy={45 + ey * 1.8} r={blink ? 0.3 : 4} fill={BG} />
              <circle cx={cx + 4 + ex} cy={40 + ey} r={blink ? 0 : 2.2} fill="#fff" opacity=".7" />
            </g>
          ))}

          {/* mouth */}
          <rect x="66" y="76" width="58" height="12" rx="6" fill="#020106" />
          {a.bars.map((h, i) => (
            <rect key={i} x={68 + i * 7} y={76 + (12 - h) / 2} width="5" height={h} rx="2.5" fill={h > 2.5 ? eyeCol : "rgba(255,42,109,0.18)"} />
          ))}
        </g>

        <ellipse cx="95" cy="272" rx="60" ry="7" fill="rgba(255,42,109,0.05)" />
      </svg>
    </div>
  );
}
