import { useEffect, useRef } from "react";

const MODE_PALETTE = {
  thinking: { a: [245, 197, 66], b: [255, 42, 109] },
  default: { a: [255, 42, 109], b: [5, 217, 232] },
};

/**
 * Neural network canvas. Reads pointer / amplitude / mode from refs so the
 * parent never re-renders per frame — that is what keeps it smooth.
 */
export default function NeuralCanvas({ pointerRef, amplitudeRef, modeRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes = [];
    let raf;
    let frame = 0;

    const build = () => {
      const w = c.clientWidth;
      const h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = w < 700 ? 46 : 84;
      const cx = w / 2;
      const cy = h * 0.48;
      nodes = Array.from({ length: count }, () => {
        const a = Math.random() * Math.PI * 2;
        const r = 50 + Math.random() * Math.min(w, h) * 0.45;
        return {
          x: cx + Math.cos(a) * r * (0.6 + Math.random() * 0.8),
          y: cy + Math.sin(a) * r * (0.5 + Math.random() * 0.6),
          r: Math.random() * 2 + 0.8,
          act: 0,
          pulse: Math.random() * Math.PI * 2,
          speed: 0.015 + Math.random() * 0.02,
          links: [],
        };
      });
      nodes.forEach((n, i) => {
        n.links = nodes
          .map((m, j) => ({ j, d: i === j ? Infinity : Math.hypot(n.x - m.x, n.y - m.y) }))
          .sort((p, q) => p.d - q.d)
          .slice(0, 3)
          .map((x) => x.j);
      });
    };

    build();
    window.addEventListener("resize", build);

    const draw = () => {
      frame++;
      const w = c.clientWidth;
      const h = c.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const rect = c.getBoundingClientRect();
      const mx = pointerRef.current.x - rect.left;
      const my = pointerRef.current.y - rect.top;
      const mode = modeRef.current;
      const amp = amplitudeRef.current;
      const pal = MODE_PALETTE[mode] || MODE_PALETTE.default;
      const A = pal.a.join(",");
      const B = pal.b.join(",");

      nodes.forEach((n, i) => {
        n.pulse += n.speed;
        const d = Math.hypot(n.x - mx, n.y - my);
        const near = d < 120 ? 1 - d / 120 : 0;
        if (mode === "listening") {
          const noise = Math.sin(frame * 0.05 + i * 0.8) * 0.5 + 0.5;
          n.act = Math.min(1, amp * noise * 1.5 + near * 0.15);
        } else if (mode === "thinking") {
          const wave = Math.sin(frame * 0.08 + i * 0.4) * 0.5 + 0.5;
          const burst = Math.sin(frame * 0.02 + i * 1.2) * 0.5 + 0.5;
          n.act = Math.min(1, wave * burst * 0.9 + 0.15);
        } else if (mode === "speaking") {
          const ripple = Math.sin(frame * 0.12 + i * 0.3) * 0.5 + 0.5;
          n.act = Math.min(1, ripple * amp * 1.2 + 0.18);
        } else {
          n.act = Math.min(1, n.act + near * 0.14);
          n.act *= 0.962;
        }
        if (n.act > 0.3) {
          for (const j of n.links) {
            if (nodes[j].act < n.act * 0.58) nodes[j].act = Math.min(1, nodes[j].act + n.act * 0.035);
          }
        }
      });

      for (const n of nodes) {
        for (const j of n.links) {
          const m = nodes[j];
          const act = (n.act + m.act) / 2;
          const base = 0.03 + Math.sin(n.pulse) * 0.01;
          const g = ctx.createLinearGradient(n.x, n.y, m.x, m.y);
          g.addColorStop(0, `rgba(${A},${base + act * 0.55})`);
          g.addColorStop(1, `rgba(${B},${base + act * 0.45})`);
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(m.x, m.y);
          ctx.strokeStyle = g;
          ctx.lineWidth = 0.5 + act * 1.6;
          ctx.stroke();
        }
      }

      for (const n of nodes) {
        const base = 0.12 + Math.sin(n.pulse) * 0.06;
        const col = n.act > 0.35 ? B : A;
        if (n.act > 0.08) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + n.act * 14, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${col},${n.act * 0.1})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + n.act * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col},${base + n.act * 0.85})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", build);
    };
  }, [pointerRef, amplitudeRef, modeRef]);

  return <canvas ref={canvasRef} className="neural-canvas" aria-hidden="true" />;
}
