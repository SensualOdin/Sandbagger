import React, { useState, useMemo, useEffect } from "react";

/* ----------------------------------------------------------------------------
   PRESS — golf money games (working-title prototype)
   Single-phone scorekeeper + bet settler.
   Formats: Skins, Nassau (heads-up), Wolf (4-player).
   Scoring lives in pure functions so house rules are configurable, not baked in.
---------------------------------------------------------------------------- */

const theme = {
  felt: "#10301f",
  feltDeep: "#0a2417",
  bone: "#f4efe1",
  boneDim: "#e7e0cd",
  ink: "#1c2620",
  brass: "#c9a24b",
  brassDim: "#9c7c34",
  clay: "#b4472f",
  up: "#2f7d4f",
  line: "rgba(244,239,225,0.14)",
};

const fmt = (n) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

const FORMATS = {
  skins: { label: "Skins", blurb: "Low score wins the hole. Ties carry over.", min: 2, max: 6 },
  nassau: { label: "Nassau", blurb: "Three bets: front 9, back 9, total. Heads-up.", min: 2, max: 2 },
  wolf: { label: "Wolf", blurb: "Rotating wolf picks a partner or goes solo.", min: 4, max: 4 },
};

/* ------------------------------- scoring -------------------------------- */

// Returns net $ per playerId (zero-sum) + a detail object per format.
function computeResults({ format, players, scores, wolf, pars, numHoles, config }) {
  const ids = players.map((p) => p.id);
  const net = Object.fromEntries(ids.map((id) => [id, 0]));
  const holeEntered = (h) => ids.every((id) => scores[h]?.[id] != null && scores[h][id] !== "");

  if (format === "skins") {
    const value = config.skins.value;
    const skinsWon = Object.fromEntries(ids.map((id) => [id, 0]));
    let carry = 0;
    const holeLog = [];
    for (let h = 0; h < numHoles; h++) {
      if (!holeEntered(h)) {
        holeLog.push({ hole: h, winner: null, units: 0, carry });
        continue;
      }
      const vals = ids.map((id) => Number(scores[h][id]));
      const min = Math.min(...vals);
      const winners = ids.filter((id) => Number(scores[h][id]) === min);
      const units = 1 + carry;
      if (winners.length === 1) {
        skinsWon[winners[0]] += units;
        holeLog.push({ hole: h, winner: winners[0], units, carry: 0 });
        carry = 0;
      } else {
        carry += 1;
        holeLog.push({ hole: h, winner: null, units: 0, carry });
      }
    }
    const totalSkins = Object.values(skinsWon).reduce((a, b) => a + b, 0);
    const n = ids.length;
    ids.forEach((id) => {
      net[id] = value * (skinsWon[id] * n - totalSkins);
    });
    return { net, detail: { skinsWon, carry, holeLog, totalSkins } };
  }

  if (format === "nassau") {
    const [A, B] = ids;
    const perLeg = config.nassau.perLeg;
    const legRange = { front: [0, 9], back: [9, 18], total: [0, 18] };
    const legResult = {};
    for (const [leg, [s, e]] of Object.entries(legRange)) {
      let a = 0, b = 0;
      for (let h = s; h < Math.min(e, numHoles); h++) {
        if (!holeEntered(h)) continue;
        const sa = Number(scores[h][A]), sb = Number(scores[h][B]);
        if (sa < sb) a++;
        else if (sb < sa) b++;
      }
      legResult[leg] = a - b; // >0 A wins leg
    }
    const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
    const aLegs = sign(legResult.front) + sign(legResult.back) + sign(legResult.total);
    net[A] = perLeg * aLegs;
    net[B] = -net[A];
    return { net, detail: { legResult } };
  }

  if (format === "wolf") {
    const pts = Object.fromEntries(ids.map((id) => [id, 0]));
    const { pointValue, loneMult, blindMult } = config.wolf;
    const holeLog = [];
    for (let h = 0; h < numHoles; h++) {
      const wolfId = ids[h % ids.length];
      const w = wolf[h];
      if (!holeEntered(h) || !w || !w.mode) {
        holeLog.push({ hole: h, wolfId, resolved: false });
        continue;
      }
      const sc = (id) => Number(scores[h][id]);
      if (w.mode === "partner" && w.partnerId) {
        const team1 = [wolfId, w.partnerId];
        const team2 = ids.filter((id) => !team1.includes(id));
        const best1 = Math.min(...team1.map(sc));
        const best2 = Math.min(...team2.map(sc));
        if (best1 < best2) { team1.forEach((id) => (pts[id] += 1)); team2.forEach((id) => (pts[id] -= 1)); }
        else if (best2 < best1) { team2.forEach((id) => (pts[id] += 1)); team1.forEach((id) => (pts[id] -= 1)); }
        holeLog.push({ hole: h, wolfId, mode: w.mode, resolved: true });
      } else if (w.mode === "lone" || w.mode === "blind") {
        const mult = w.mode === "lone" ? loneMult : blindMult;
        const others = ids.filter((id) => id !== wolfId);
        const wScore = sc(wolfId);
        const othersBest = Math.min(...others.map(sc));
        if (wScore < othersBest) { pts[wolfId] += mult * others.length; others.forEach((id) => (pts[id] -= mult)); }
        else if (othersBest < wScore) { pts[wolfId] -= mult * others.length; others.forEach((id) => (pts[id] += mult)); }
        holeLog.push({ hole: h, wolfId, mode: w.mode, resolved: true });
      } else {
        holeLog.push({ hole: h, wolfId, resolved: false });
      }
    }
    ids.forEach((id) => (net[id] = pts[id] * pointValue));
    return { net, detail: { pts, holeLog } };
  }

  return { net, detail: {} };
}

// Greedy minimal settlement: who pays whom.
function settle(net, players) {
  const name = (id) => players.find((p) => p.id === id)?.name || id;
  const creditors = Object.entries(net).filter(([, v]) => v > 0.001).map(([id, v]) => ({ id, v }));
  const debtors = Object.entries(net).filter(([, v]) => v < -0.001).map(([id, v]) => ({ id, v: -v }));
  creditors.sort((a, b) => b.v - a.v);
  debtors.sort((a, b) => b.v - a.v);
  const tx = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].v, creditors[j].v);
    tx.push({ from: name(debtors[i].id), to: name(creditors[j].id), amount: Math.round(pay * 100) / 100 });
    debtors[i].v -= pay; creditors[j].v -= pay;
    if (debtors[i].v < 0.001) i++;
    if (creditors[j].v < 0.001) j++;
  }
  return tx;
}

/* ------------------------------- styling -------------------------------- */

function Style() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&family=Hanken+Grotesk:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      .pg-root { font-family:'Hanken Grotesk',system-ui,sans-serif; color:${theme.bone};
        background:
          radial-gradient(120% 80% at 50% -10%, rgba(201,162,75,0.10), transparent 60%),
          linear-gradient(180deg, ${theme.felt}, ${theme.feltDeep});
        min-height:100%; }
      .pg-disp { font-family:'Fraunces',Georgia,serif; }
      .pg-mono { font-family:'DM Mono',ui-monospace,monospace; font-variant-numeric:tabular-nums; }
      .pg-card { background:${theme.bone}; color:${theme.ink}; border-radius:18px;
        box-shadow:0 18px 40px -22px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(0,0,0,0.04); }
      .pg-btn { cursor:pointer; border:none; font-family:inherit; font-weight:600;
        transition:transform .08s ease, filter .15s ease; }
      .pg-btn:active { transform:scale(0.97); }
      .pg-step { width:46px; height:46px; border-radius:13px; font-size:24px; line-height:1;
        display:flex; align-items:center; justify-content:center; }
      .pg-fade { animation:pgFade .4s ease both; }
      @keyframes pgFade { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
      .pg-chip { animation:pgFade .35s ease both; }
      input.pg-name { font-family:inherit; font-size:16px; font-weight:600; color:${theme.ink};
        background:transparent; border:none; outline:none; width:100%; }
      ::placeholder { color:rgba(28,38,32,0.4); }
    `}</style>
  );
}

const Badge = ({ children, on }) => (
  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
    padding: "4px 9px", borderRadius: 999, background: on ? theme.brass : "rgba(244,239,225,0.08)",
    color: on ? theme.feltDeep : theme.bone, fontWeight: 500 }}>{children}</span>
);

/* ------------------------------- screens -------------------------------- */

function Setup({ players, setPlayers, format, setFormat, numHoles, setNumHoles, config, setConfig, onStart }) {
  const addPlayer = () => setPlayers((p) => [...p, { id: crypto.randomUUID(), name: "" }]);
  const rmPlayer = (id) => setPlayers((p) => p.filter((x) => x.id !== id));
  const setName = (id, name) => setPlayers((p) => p.map((x) => (x.id === id ? { ...x, name } : x)));
  const count = players.length;
  const avail = (k) => count >= FORMATS[k].min && count <= FORMATS[k].max && !(k === "nassau" && numHoles !== 18);
  const named = players.filter((p) => p.name.trim()).length === count;
  const canStart = avail(format) && named && count >= 2;

  return (
    <div className="pg-fade" style={{ padding: "8px 18px 40px" }}>
      <header style={{ textAlign: "center", padding: "26px 0 22px" }}>
        <div className="pg-disp" style={{ fontSize: 46, fontWeight: 600, letterSpacing: -1, lineHeight: 1 }}>Press</div>
        <div style={{ fontSize: 13, color: theme.brass, letterSpacing: 3, textTransform: "uppercase", marginTop: 6 }}>
          Golf Money Games
        </div>
      </header>

      <SectionLabel>Players</SectionLabel>
      <div className="pg-card" style={{ padding: 8, marginBottom: 22 }}>
        {players.map((p, i) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
            borderBottom: i < players.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
            <span className="pg-mono" style={{ width: 22, color: theme.brassDim, fontSize: 14 }}>{i + 1}</span>
            <input className="pg-name" placeholder={`Player ${i + 1}`} value={p.name}
              onChange={(e) => setName(p.id, e.target.value)} />
            {players.length > 2 && (
              <button className="pg-btn" onClick={() => rmPlayer(p.id)}
                style={{ background: "transparent", color: theme.clay, fontSize: 20, padding: "0 6px" }}>×</button>
            )}
          </div>
        ))}
        {players.length < 6 && (
          <button className="pg-btn" onClick={addPlayer}
            style={{ width: "100%", background: "transparent", color: theme.brassDim, padding: "12px",
              fontSize: 14, borderTop: "1px solid rgba(0,0,0,0.06)" }}>+ Add player</button>
        )}
      </div>

      <SectionLabel>Holes</SectionLabel>
      <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
        {[9, 18].map((h) => (
          <button key={h} className="pg-btn" onClick={() => setNumHoles(h)}
            style={{ flex: 1, padding: "14px", borderRadius: 14, fontSize: 16,
              background: numHoles === h ? theme.brass : "rgba(244,239,225,0.06)",
              color: numHoles === h ? theme.feltDeep : theme.bone,
              boxShadow: numHoles === h ? "none" : `inset 0 0 0 1px ${theme.line}` }}>{h} holes</button>
        ))}
      </div>

      <SectionLabel>Game</SectionLabel>
      <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
        {Object.entries(FORMATS).map(([k, f]) => {
          const ok = avail(k);
          const sel = format === k;
          return (
            <button key={k} className="pg-btn" disabled={!ok} onClick={() => ok && setFormat(k)}
              style={{ textAlign: "left", padding: "14px 16px", borderRadius: 14,
                background: sel ? theme.brass : "rgba(244,239,225,0.06)",
                color: sel ? theme.feltDeep : ok ? theme.bone : "rgba(244,239,225,0.3)",
                boxShadow: sel ? "none" : `inset 0 0 0 1px ${theme.line}`, opacity: ok ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="pg-disp" style={{ fontSize: 20, fontWeight: 600 }}>{f.label}</span>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
                  {f.min === f.max ? `${f.min}p` : `${f.min}–${f.max}p`}
                </span>
              </div>
              <div style={{ fontSize: 13, marginTop: 3, opacity: 0.8 }}>{f.blurb}</div>
              {!ok && <div style={{ fontSize: 11, marginTop: 4, color: theme.clay }}>
                {k === "nassau" && numHoles !== 18 ? "Needs 18 holes" : `Needs ${f.min === f.max ? f.min : `${f.min}–${f.max}`} players`}
              </div>}
            </button>
          );
        })}
      </div>

      <SectionLabel>Stakes &amp; house rules</SectionLabel>
      <div className="pg-card" style={{ padding: 16, marginBottom: 26 }}>
        {format === "skins" && (
          <>
            <Knob label="Per skin" value={config.skins.value} prefix="$"
              onChange={(v) => setConfig((c) => ({ ...c, skins: { ...c.skins, value: v } }))} step={1} />
            <div style={{ fontSize: 12, color: "rgba(28,38,32,0.6)", marginTop: 8 }}>Ties carry the skin to the next hole.</div>
          </>
        )}
        {format === "nassau" && (
          <Knob label="Per leg (front / back / total)" value={config.nassau.perLeg} prefix="$"
            onChange={(v) => setConfig((c) => ({ ...c, nassau: { ...c.nassau, perLeg: v } }))} step={1} />
        )}
        {format === "wolf" && (
          <>
            <Knob label="Point value" value={config.wolf.pointValue} prefix="$"
              onChange={(v) => setConfig((c) => ({ ...c, wolf: { ...c.wolf, pointValue: v } }))} step={1} />
            <Divider />
            <Knob label="Lone Wolf multiplier" value={config.wolf.loneMult} suffix="×"
              onChange={(v) => setConfig((c) => ({ ...c, wolf: { ...c.wolf, loneMult: Math.max(1, v) } }))} step={1} />
            <Divider />
            <Knob label="Blind Wolf multiplier" value={config.wolf.blindMult} suffix="×"
              onChange={(v) => setConfig((c) => ({ ...c, wolf: { ...c.wolf, blindMult: Math.max(1, v) } }))} step={1} />
          </>
        )}
      </div>

      <button className="pg-btn" disabled={!canStart} onClick={onStart}
        style={{ width: "100%", padding: "17px", borderRadius: 16, fontSize: 17, fontWeight: 700,
          background: canStart ? theme.brass : "rgba(244,239,225,0.12)",
          color: canStart ? theme.feltDeep : "rgba(244,239,225,0.4)" }}>
        {canStart ? "Start round →" : named ? "Pick a valid game" : "Name all players"}
      </button>
    </div>
  );
}

const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: theme.brass,
    fontWeight: 600, margin: "2px 4px 10px" }}>{children}</div>
);
const Divider = () => <div style={{ height: 1, background: "rgba(0,0,0,0.07)", margin: "12px 0" }} />;

function Knob({ label, value, onChange, step = 1, prefix = "", suffix = "" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: theme.ink }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="pg-btn pg-step" onClick={() => onChange(Math.max(0, value - step))}
          style={{ background: theme.boneDim, color: theme.ink, width: 38, height: 38, fontSize: 20 }}>−</button>
        <span className="pg-mono" style={{ minWidth: 56, textAlign: "center", fontSize: 18, fontWeight: 500, color: theme.ink }}>
          {prefix}{value}{suffix}
        </span>
        <button className="pg-btn pg-step" onClick={() => onChange(value + step)}
          style={{ background: theme.ink, color: theme.bone, width: 38, height: 38, fontSize: 20 }}>+</button>
      </div>
    </div>
  );
}

function Play({ players, format, numHoles, pars, setPars, scores, setScores, wolf, setWolf, config, onFinish }) {
  const [h, setH] = useState(0);
  const ids = players.map((p) => p.id);
  const results = useMemo(() => computeResults({ format, players, scores, wolf, pars, numHoles, config }),
    [format, players, scores, wolf, pars, numHoles, config]);

  const setScore = (id, val) => setScores((s) => ({ ...s, [h]: { ...(s[h] || {}), [id]: val } }));
  const bump = (id, d) => {
    const cur = Number(scores[h]?.[id] ?? pars[h]);
    setScore(id, Math.max(1, cur + d));
  };
  const wolfId = format === "wolf" ? ids[h % ids.length] : null;
  const wolfName = (id) => players.find((p) => p.id === id)?.name;
  const setWolfMode = (mode, partnerId = null) => setWolf((w) => ({ ...w, [h]: { mode, partnerId } }));
  const curWolf = wolf[h] || {};

  return (
    <div className="pg-root" style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {/* standings strip */}
      <div style={{ display: "flex", gap: 8, padding: "12px 14px", overflowX: "auto", borderBottom: `1px solid ${theme.line}` }}>
        {players.map((p) => {
          const v = results.net[p.id];
          return (
            <div key={p.id} style={{ flex: "0 0 auto", textAlign: "center", minWidth: 64 }}>
              <div style={{ fontSize: 12, opacity: 0.7, whiteSpace: "nowrap", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
              <div className="pg-mono" style={{ fontSize: 15, fontWeight: 500, color: v > 0 ? theme.brass : v < 0 ? "#e88b72" : theme.bone }}>
                {v === 0 ? "—" : fmt(v)}
              </div>
            </div>
          );
        })}
      </div>

      {/* hole header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 8px" }}>
        <button className="pg-btn" disabled={h === 0} onClick={() => setH(h - 1)}
          style={{ background: "transparent", color: h === 0 ? "rgba(244,239,225,0.25)" : theme.bone, fontSize: 26, padding: "0 6px" }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: theme.brass }}>Hole</div>
          <div className="pg-disp" style={{ fontSize: 40, fontWeight: 600, lineHeight: 1 }}>{h + 1}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 4 }}>
            <button className="pg-btn" onClick={() => setPars((p) => p.map((x, i) => (i === h ? Math.max(3, x - 1) : x)))}
              style={{ background: "transparent", color: theme.brassDim, fontSize: 16 }}>−</button>
            <span className="pg-mono" style={{ fontSize: 13, opacity: 0.8 }}>Par {pars[h]}</span>
            <button className="pg-btn" onClick={() => setPars((p) => p.map((x, i) => (i === h ? Math.min(6, x + 1) : x)))}
              style={{ background: "transparent", color: theme.brassDim, fontSize: 16 }}>+</button>
          </div>
        </div>
        <button className="pg-btn" disabled={h === numHoles - 1} onClick={() => setH(h + 1)}
          style={{ background: "transparent", color: h === numHoles - 1 ? "rgba(244,239,225,0.25)" : theme.bone, fontSize: 26, padding: "0 6px" }}>›</button>
      </div>

      {/* wolf decision */}
      {format === "wolf" && (
        <div className="pg-card pg-fade" style={{ margin: "10px 16px", padding: 14 }}>
          <div style={{ fontSize: 13, color: theme.brassDim, fontWeight: 600, marginBottom: 8 }}>
            🐺 Wolf this hole: <span style={{ color: theme.ink }}>{wolfName(wolfId)}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ids.filter((id) => id !== wolfId).map((id) => (
              <button key={id} className="pg-btn" onClick={() => setWolfMode("partner", id)}
                style={{ padding: "8px 12px", borderRadius: 10, fontSize: 13,
                  background: curWolf.mode === "partner" && curWolf.partnerId === id ? theme.up : theme.boneDim,
                  color: curWolf.mode === "partner" && curWolf.partnerId === id ? theme.bone : theme.ink }}>
                + {wolfName(id)}
              </button>
            ))}
            <button className="pg-btn" onClick={() => setWolfMode("lone")}
              style={{ padding: "8px 12px", borderRadius: 10, fontSize: 13,
                background: curWolf.mode === "lone" ? theme.clay : theme.boneDim,
                color: curWolf.mode === "lone" ? theme.bone : theme.ink }}>
              Lone Wolf ×{config.wolf.loneMult}
            </button>
            <button className="pg-btn" onClick={() => setWolfMode("blind")}
              style={{ padding: "8px 12px", borderRadius: 10, fontSize: 13,
                background: curWolf.mode === "blind" ? theme.clay : theme.boneDim,
                color: curWolf.mode === "blind" ? theme.bone : theme.ink }}>
              Blind Wolf ×{config.wolf.blindMult}
            </button>
          </div>
        </div>
      )}

      {/* score entry */}
      <div style={{ padding: "8px 16px", display: "grid", gap: 10, flex: 1 }}>
        {players.map((p) => {
          const val = scores[h]?.[p.id];
          const isWolf = p.id === wolfId;
          const rel = val != null && val !== "" ? Number(val) - pars[h] : null;
          return (
            <div key={p.id} className="pg-card" style={{ padding: "12px 14px", display: "flex", alignItems: "center",
              justifyContent: "space-between", boxShadow: isWolf ? `inset 0 0 0 2px ${theme.brass}` : undefined }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: theme.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}{isWolf && <span style={{ color: theme.brassDim, fontWeight: 500 }}> · wolf</span>}
                </div>
                {rel != null && (
                  <div className="pg-mono" style={{ fontSize: 12, color: rel < 0 ? theme.up : rel > 0 ? theme.clay : "rgba(28,38,32,0.5)" }}>
                    {rel === 0 ? "par" : rel < 0 ? `${rel}` : `+${rel}`}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button className="pg-btn pg-step" onClick={() => bump(p.id, -1)}
                  style={{ background: theme.boneDim, color: theme.ink }}>−</button>
                <span className="pg-mono" style={{ minWidth: 34, textAlign: "center", fontSize: 28, fontWeight: 500, color: theme.ink }}>
                  {val != null && val !== "" ? val : "–"}
                </span>
                <button className="pg-btn pg-step" onClick={() => bump(p.id, +1)}
                  style={{ background: theme.ink, color: theme.bone }}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* footer */}
      <div style={{ padding: "12px 16px 22px", position: "sticky", bottom: 0,
        background: "linear-gradient(180deg, transparent, rgba(10,36,23,0.9) 30%)" }}>
        {h < numHoles - 1 ? (
          <button className="pg-btn" onClick={() => setH(h + 1)}
            style={{ width: "100%", padding: "15px", borderRadius: 14, fontSize: 16, fontWeight: 700, background: theme.bone, color: theme.ink }}>
            Next hole →
          </button>
        ) : (
          <button className="pg-btn" onClick={onFinish}
            style={{ width: "100%", padding: "16px", borderRadius: 14, fontSize: 17, fontWeight: 700, background: theme.brass, color: theme.feltDeep }}>
            Finish &amp; settle up
          </button>
        )}
      </div>
    </div>
  );
}

function Settle({ players, format, numHoles, scores, wolf, pars, config, onBack, onNew }) {
  const results = useMemo(() => computeResults({ format, players, scores, wolf, pars, numHoles, config }),
    [format, players, scores, wolf, pars, numHoles, config]);
  const tx = settle(results.net, players);
  const ranked = [...players].sort((a, b) => results.net[b.id] - results.net[a.id]);

  return (
    <div className="pg-fade" style={{ padding: "8px 18px 40px" }}>
      <header style={{ textAlign: "center", padding: "26px 0 18px" }}>
        <div style={{ fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: theme.brass }}>{FORMATS[format].label} · {numHoles} holes</div>
        <div className="pg-disp" style={{ fontSize: 38, fontWeight: 600, letterSpacing: -1 }}>The Damage</div>
      </header>

      <SectionLabel>Net result</SectionLabel>
      <div className="pg-card" style={{ padding: 6, marginBottom: 22 }}>
        {ranked.map((p, i) => {
          const v = results.net[p.id];
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 14px",
              borderBottom: i < ranked.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="pg-mono" style={{ color: theme.brassDim, fontSize: 14 }}>{i + 1}</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: theme.ink }}>{p.name}</span>
              </div>
              <span className="pg-mono" style={{ fontSize: 18, fontWeight: 500, color: v > 0 ? theme.up : v < 0 ? theme.clay : "rgba(28,38,32,0.5)" }}>
                {v === 0 ? "even" : fmt(v)}
              </span>
            </div>
          );
        })}
      </div>

      <SectionLabel>Settle up</SectionLabel>
      <div className="pg-card" style={{ padding: 16, marginBottom: 22 }}>
        {tx.length === 0 ? (
          <div style={{ color: theme.ink, fontSize: 15, textAlign: "center", padding: "8px 0" }}>All square. Nobody owes a thing.</div>
        ) : (
          tx.map((t, i) => (
            <div key={i} className="pg-chip" style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 4px", borderBottom: i < tx.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
              <span style={{ fontSize: 15, color: theme.ink }}>
                <b>{t.from}</b> <span style={{ color: theme.brassDim }}>pays</span> <b>{t.to}</b>
              </span>
              <span className="pg-mono" style={{ fontSize: 16, fontWeight: 500, color: theme.ink }}>{fmt(t.amount)}</span>
            </div>
          ))
        )}
      </div>

      {/* format-specific breakdown */}
      {format === "wolf" && (
        <>
          <SectionLabel>Points</SectionLabel>
          <div className="pg-card" style={{ padding: 14, marginBottom: 22 }}>
            {players.map((p, i) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
                borderBottom: i < players.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
                <span style={{ color: theme.ink, fontSize: 14 }}>{p.name}</span>
                <span className="pg-mono" style={{ color: theme.ink, fontSize: 14 }}>{results.detail.pts[p.id] > 0 ? "+" : ""}{results.detail.pts[p.id]} pts</span>
              </div>
            ))}
          </div>
        </>
      )}
      {format === "nassau" && (
        <>
          <SectionLabel>Legs ({players[0].name} vs {players[1].name})</SectionLabel>
          <div className="pg-card" style={{ padding: 14, marginBottom: 22, display: "flex", justifyContent: "space-around" }}>
            {["front", "back", "total"].map((leg) => {
              const r = results.detail.legResult[leg];
              const w = r > 0 ? players[0].name : r < 0 ? players[1].name : "halved";
              return (
                <div key={leg} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: theme.brassDim }}>{leg}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.ink, marginTop: 3 }}>{w}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="pg-btn" onClick={onBack}
          style={{ flex: 1, padding: "15px", borderRadius: 14, fontSize: 15, fontWeight: 600,
            background: "rgba(244,239,225,0.08)", color: theme.bone, boxShadow: `inset 0 0 0 1px ${theme.line}` }}>
          ← Back to round
        </button>
        <button className="pg-btn" onClick={onNew}
          style={{ flex: 1, padding: "15px", borderRadius: 14, fontSize: 15, fontWeight: 700, background: theme.brass, color: theme.feltDeep }}>
          New round
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- app ---------------------------------- */

export default function App() {
  const [phase, setPhase] = useState("setup");
  const [players, setPlayers] = useState([
    { id: crypto.randomUUID(), name: "" },
    { id: crypto.randomUUID(), name: "" },
  ]);
  const [format, setFormat] = useState("skins");
  const [numHoles, setNumHoles] = useState(18);
  const [pars, setPars] = useState(Array(18).fill(4));
  const [scores, setScores] = useState({});
  const [wolf, setWolf] = useState({});
  const [config, setConfig] = useState({
    skins: { value: 5 },
    nassau: { perLeg: 5 },
    wolf: { pointValue: 1, loneMult: 2, blindMult: 3 },
  });

  const start = () => { setScores({}); setWolf({}); setPhase("play"); };
  const newRound = () => {
    setScores({}); setWolf({});
    setPlayers([{ id: crypto.randomUUID(), name: "" }, { id: crypto.randomUUID(), name: "" }]);
    setPhase("setup");
  };

  return (
    <div className="pg-root" style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh" }}>
      <Style />
      {phase === "setup" && (
        <Setup {...{ players, setPlayers, format, setFormat, numHoles, setNumHoles, config, setConfig }} onStart={start} />
      )}
      {phase === "play" && (
        <Play {...{ players, format, numHoles, pars, setPars, scores, setScores, wolf, setWolf, config }}
          onFinish={() => setPhase("settle")} />
      )}
      {phase === "settle" && (
        <Settle {...{ players, format, numHoles, scores, wolf, pars, config }}
          onBack={() => setPhase("play")} onNew={newRound} />
      )}
    </div>
  );
}
