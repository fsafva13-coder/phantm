import { useEffect, useRef, useState } from "react";

const TARGETS = {
  idle: { consciousness: 0.31, sync: 0.45 },
  listening: { consciousness: 0.62, sync: 0.95 },
  thinking: { consciousness: 0.92, sync: 0.8 },
  speaking: { consciousness: 0.74, sync: 0.9 },
};

export default function Telemetry({ amplitudeRef, modeRef }) {
  const [v, setV] = useState({ activity: 0.02, consciousness: 0.31, sync: 0.45 });
  const smooth = useRef({ consciousness: 0.31, sync: 0.45 });

  useEffect(() => {
    const iv = setInterval(() => {
      const t = TARGETS[modeRef.current] || TARGETS.idle;
      smooth.current.consciousness += (t.consciousness - smooth.current.consciousness) * 0.25;
      smooth.current.sync += (t.sync - smooth.current.sync) * 0.25;
      setV({ activity: Math.max(0.02, amplitudeRef.current), ...smooth.current });
    }, 90);
    return () => clearInterval(iv);
  }, [amplitudeRef, modeRef]);

  const rows = [
    ["NEURAL ACTIVITY", v.activity, "var(--pink)"],
    ["CONSCIOUSNESS", v.consciousness, "var(--cyan)"],
    ["PERCEPTION SYNC", v.sync, "var(--yellow)"],
  ];

  return (
    <div className="telemetry">
      <div className="label">SYSTEM TELEMETRY</div>
      {rows.map(([label, val, col]) => (
        <div key={label} className="meter">
          <div className="meter-head">
            <span>{label}</span>
            <span style={{ color: col }}>{(val * 100).toFixed(1)}%</span>
          </div>
          <div className="meter-track">
            <div className="meter-fill" style={{ width: `${Math.max(2, val * 100)}%`, background: col, boxShadow: `0 0 6px ${col}` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
