// ชุดกราฟวาดด้วย SVG เอง (ไม่พึ่ง library) — เป็น server component ล้วน ๆ ธีมสีกลืนกับแอป

const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

function niceMax(m: number): number {
  if (m <= 5) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(m)));
  const n = m / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

// สีชุดสำหรับหลาย ๆ ซีรีส์ (ตำแหน่ง ฯลฯ)
export const SERIES_COLORS = ["#0ea5e9", "#6366f1", "#14b8a6", "#f59e0b", "#ec4899", "#8b5cf6", "#22c55e", "#f43f5e"];

/* ---------- Donut ---------- */
export function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: number;
}) {
  const size = 168;
  const c = size / 2;
  const sw = 22;
  const r = c - sw / 2 - 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);

  let start = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = total > 0 ? s.value / total : 0;
      const dash = frac * C;
      const el = {
        color: s.color,
        dasharray: `${dash} ${C - dash}`,
        dashoffset: -start,
      };
      start += dash;
      return el;
    });

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-36 w-36 shrink-0 chart-grow" role="img">
        <circle cx={c} cy={c} r={r} fill="none" stroke="#eef2f7" strokeWidth={sw} />
        <g transform={`rotate(-90 ${c} ${c})`}>
          {arcs.map((a, i) => (
            <circle
              key={i}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeDasharray={a.dasharray}
              strokeDashoffset={a.dashoffset}
            />
          ))}
        </g>
        <text x={c} y={c - 4} textAnchor="middle" className="fill-slate-900" fontSize="30" fontWeight="800">
          {centerValue}
        </text>
        <text x={c} y={c + 18} textAnchor="middle" className="fill-slate-400" fontSize="12" fontWeight="500">
          {centerLabel}
        </text>
      </svg>
      <ul className="w-full max-w-[260px] space-y-2 text-sm">
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <li key={s.label} className="flex items-center gap-2.5">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="flex-1 text-slate-600">{s.label}</span>
              <span className="font-semibold text-slate-800">{s.value}</span>
              <span className="w-9 text-right text-xs text-slate-400">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Line / Area ---------- */
export function TrendChart({
  points,
  unit = "",
  showPointLabels = true,
  labelEvery = 1,
}: {
  points: { label: string; value: number }[];
  unit?: string;
  showPointLabels?: boolean;
  labelEvery?: number;
}) {
  const W = 680;
  const H = 240;
  const padL = 38;
  const padR = 16;
  const padT = 22;
  const padB = 34;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = points.length;
  const values = points.map((p) => p.value);
  const yMax = niceMax(Math.max(1, ...values));

  const x = (i: number) => padL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => padT + ih - (v / yMax) * ih;

  const linePath = points.map((p, i) => `${i ? "L" : "M"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)} ${(padT + ih).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + ih).toFixed(1)} Z`;
  const grid = [0, 1, 2, 3, 4];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full chart-grow" role="img" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00a9e0" />
          <stop offset="100%" stopColor="#0077c8" />
        </linearGradient>
      </defs>
      {grid.map((g) => {
        const yy = padT + ih - (g / 4) * ih;
        return (
          <g key={g}>
            <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#eef2f7" strokeWidth="1" />
            <text x={padL - 8} y={yy + 4} textAnchor="end" fontSize="10" className="fill-slate-400">
              {fmt((yMax * g) / 4)}
            </text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#areaFill)" />
      <path d={linePath} fill="none" stroke="url(#lineStroke)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="chart-draw" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={p.value > 0 ? 3.5 : 2} fill="#fff" stroke="#0077c8" strokeWidth="2" />
          {showPointLabels && p.value > 0 && (
            <text x={x(i)} y={y(p.value) - 9} textAnchor="middle" fontSize="9.5" fontWeight="700" className="fill-sky-700">
              {fmt(p.value)}
            </text>
          )}
          {i % labelEvery === 0 && (
            <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="10" className="fill-slate-500">
              {p.label}
            </text>
          )}
        </g>
      ))}
      {unit && (
        <text x={padL - 8} y={padT - 8} textAnchor="end" fontSize="9" className="fill-slate-400">
          {unit}
        </text>
      )}
    </svg>
  );
}

/* ---------- Radar / ใยแมงมุม ---------- */
export function RadarChart({
  axes,
  color = "#0077c8",
  unit = "",
}: {
  axes: { label: string; value: number }[];
  color?: string;
  unit?: string;
}) {
  const W = 380;
  const H = 280;
  const cx = W / 2;
  const cy = H / 2 - 4;
  const R = 88;
  const n = axes.length;
  const max = niceMax(Math.max(1, ...axes.map((a) => a.value)));
  const rings = [0.25, 0.5, 0.75, 1];

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, radius: number) => [cx + radius * Math.cos(angle(i)), cy + radius * Math.sin(angle(i))];

  const ringPoly = (f: number) =>
    axes.map((_, i) => pt(i, R * f).map((v) => v.toFixed(1)).join(",")).join(" ");
  const dataPoly = axes.map((a, i) => pt(i, (a.value / max) * R).map((v) => v.toFixed(1)).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full chart-grow" role="img" preserveAspectRatio="xMidYMid meet">
      {/* วงกริด */}
      {rings.map((f) => (
        <polygon key={f} points={ringPoly(f)} fill="none" stroke="#e6edf5" strokeWidth="1" />
      ))}
      {/* แกน */}
      {axes.map((_, i) => {
        const [ex, ey] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="#e6edf5" strokeWidth="1" />;
      })}
      {/* พื้นที่ข้อมูล */}
      <polygon points={dataPoly} fill={color} fillOpacity="0.22" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {/* จุดยอด */}
      {axes.map((a, i) => {
        const [px, py] = pt(i, (a.value / max) * R);
        return <circle key={i} cx={px} cy={py} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />;
      })}
      {/* ป้ายชื่อแกน + ค่า */}
      {axes.map((a, i) => {
        const [lx, ly] = pt(i, R + 18);
        const cos = Math.cos(angle(i));
        const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
        return (
          <g key={i}>
            <text x={lx} y={ly} textAnchor={anchor} fontSize="11" fontWeight="600" className="fill-slate-600">
              {a.label}
            </text>
            <text x={lx} y={ly + 13} textAnchor={anchor} fontSize="10" fontWeight="700" style={{ fill: color }}>
              {fmt(a.value)}
              {unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
