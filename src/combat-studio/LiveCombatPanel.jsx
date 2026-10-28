import React, { useMemo, useState } from "react";
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Server } from "lucide-react";
import { buildLiveCalculationRequest } from "./live-calculation-request.js";
import { calculateLiveCombat } from "./live-calculation-client.js";
import "./live-calculation-panel.css";

const BOOST_KEYS = ["atk", "def", "hp", "magic", "prayer", "ranged", "str", "mining", "herblore", "farming"];
const EMPTY_BOOSTS = Object.freeze(Object.fromEntries(BOOST_KEYS.map(key => [key, 0])));
const EMPTY_BUFFS = Object.freeze({
  potions: [], onSlayerTask: false, inWilderness: false, forinthrySurge: false,
  soulreaperStacks: 0, baAttackerLevel: 0, chinchompaDistance: 0,
  kandarinDiary: false, chargeSpell: false, markOfDarknessSpell: false,
  usingSunfireRunes: false, fragmentOfWind: false, fragmentOfWater: false,
  fragmentOfEarth: false, fragmentOfFire: false,
});
const TYPES = [
  ["", "Choose attack type"], ["stab", "Stab"], ["slash", "Slash"], ["crush", "Crush"],
  ["ranged", "Ranged"], ["magic", "Magic"],
];
const STANCES = [
  ["", "Choose attack stance"], ["Accurate", "Accurate"], ["Aggressive", "Aggressive"],
  ["Controlled", "Controlled"], ["Defensive", "Defensive"], ["Rapid", "Rapid"],
  ["Longrange", "Longrange"], ["Autocast", "Autocast"], ["Defensive Autocast", "Defensive Autocast"],
  ["Manual Cast", "Manual Cast"],
];
const keyName = value => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
const format = value => Number(value).toLocaleString("en-GB", { maximumFractionDigits: 3 });

export default function LiveCombatPanel({ account, slots = [], items = [], targetRecords = [], targetName = "" }) {
  const [attackType, setAttackType] = useState("");
  const [stance, setStance] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [selectedRuntime, setSelectedRuntime] = useState(() => {
    try { return String(localStorage.getItem("osrshub-combat-runtime-url") ?? import.meta.env.VITE_COMBAT_RUNTIME_URL ?? "").trim(); }
    catch { return String(import.meta.env.VITE_COMBAT_RUNTIME_URL ?? "").trim(); }
  });

  const target = useMemo(() => {
    const wanted = keyName(targetName);
    return targetRecords.find(record => keyName(record?.name ?? record?.monster_name ?? record?.display_name) === wanted) ?? null;
  }, [targetRecords, targetName]);
  const targetId = finite(target?.id ?? target?.monster_id ?? target?.monsterId);
  const accountStats = account?.stats ?? {};
  const canAttempt = Boolean(account?.name && targetId && attackType && stance && slots.length);

  const runCalculation = async () => {
    setBusy(true);
    setOutcome(null);
    try {
      const style = { name: `${attackType} ${stance}`, type: attackType, stance };
      const built = buildLiveCalculationRequest({
        playerName: account?.name,
        stats: accountStats,
        slots,
        items,
        target: targetId ? { id: targetId, name: targetName } : null,
        style,
        boosts: { ...EMPTY_BOOSTS },
        prayers: [],
        buffs: { ...EMPTY_BUFFS, potions: [] },
        spell: null,
      });
      if (built.status !== "ready") {
        setOutcome({ ...built, result: null });
        return;
      }
      try { localStorage.setItem("osrshub-combat-runtime-url", selectedRuntime); } catch {}
      setOutcome(await calculateLiveCombat({ baseUrl: selectedRuntime, request: built.request }));
    } catch {
      setOutcome({ status: "error", result: null, issues: ["Live calculation could not be prepared safely. Check the account, target and equipment selections."] });
    } finally {
      setBusy(false);
    }
  };

  const result = outcome?.result;
  return <section className="cs-live-runtime cs-panel" aria-labelledby="cs-live-runtime-title">
    <header>
      <div>
        <h2 id="cs-live-runtime-title"><Activity size={17}/> Live combat engine</h2>
        <p>Runs the real OSRS DPS calculator through the separately deployed Worker. Loadout estimates above are not treated as live DPS.</p>
      </div>
      <span className={result ? "cs-live-status success" : "cs-live-status"}><Server size={13}/>{result ? "CALCULATED" : "NOT YET VERIFIED"}</span>
    </header>
    <div className="cs-live-config">
      <label>Combat Worker URL
        <input value={selectedRuntime} onChange={event => setSelectedRuntime(event.target.value)} placeholder="https://your-combat-worker.workers.dev" inputMode="url" autoComplete="url"/>
      </label>
      <label>Attack type
        <select value={attackType} onChange={event => { setAttackType(event.target.value); setOutcome(null); }}>
          {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>Attack stance
        <select value={stance} onChange={event => { setStance(event.target.value); setOutcome(null); }}>
          {STANCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
    </div>
    <div className="cs-live-context">
      <span><b>Account</b>{account?.name || "Import an account first"}</span>
      <span><b>Target</b>{targetName || "Choose a target above"}</span>
      <span><b>Canonical target ID</b>{targetId ?? "Not resolved"}</span>
      <span><b>Equipped slots</b>{slots.length}</span>
    </div>
    <button className="cs-primary" onClick={runCalculation} disabled={busy || !canAttempt}>
      {busy ? <RefreshCw size={14} className="cs-spin"/> : <Activity size={14}/>}
      {busy ? "Calculating…" : "Run real calculation"}
    </button>
    {!canAttempt && <p className="cs-live-hint">To calculate, load an account, choose a target that has a canonical engine ID, select an attack type and stance, and configure the Worker URL.</p>}
    {outcome && !result && <div className="cs-live-message error" role="alert"><AlertCircle size={15}/><div><strong>{outcome.status === "review-required" ? "Review required" : "Live calculation unavailable"}</strong><ul>{(outcome.issues ?? []).map((issue, index) => <li key={index}>{issue}</li>)}</ul></div></div>}
    {result && <div className="cs-live-result" aria-live="polite">
      <div className="cs-live-result-head"><CheckCircle2 size={16}/><span>Engine calculation complete</span><small>{result.monster?.name ?? targetName}</small></div>
      <div className="cs-live-metrics">
        <div><small>DPS</small><strong>{format(result.dps)}</strong></div>
        <div><small>Max hit</small><strong>{format(result.maxHit)}</strong></div>
        <div><small>Accuracy</small><strong>{format(result.accuracy * 100)}%</strong></div>
        <div><small>Attack roll</small><strong>{format(result.attackRoll)}</strong></div>
        <div><small>NPC defence roll</small><strong>{format(result.npcDefenceRoll)}</strong></div>
        <div><small>Attack speed</small><strong>{format(result.attackSpeed)} ticks</strong></div>
      </div>
      {Array.isArray(result.issues) && result.issues.length > 0 && <p className="cs-live-hint">Engine notes: {result.issues.map(issue => typeof issue === "string" ? issue : issue?.message ?? JSON.stringify(issue)).join(" · ")}</p>}
    </div>}
  </section>;
}
