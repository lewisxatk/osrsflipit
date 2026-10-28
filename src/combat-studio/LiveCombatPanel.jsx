import React, { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Server } from "lucide-react";
import { buildLiveCalculationRequest } from "./live-calculation-request.js";
import LoadoutWorkbench from "./LoadoutWorkbench.jsx";
import { calculateLiveCombat } from "./live-calculation-client.js";
import { summariseLiveComparison } from "./live-loadout-comparison.js";
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
  const [draftSlots, setDraftSlots] = useState(() => slots.map(pair => [...pair]));
  useEffect(() => { setDraftSlots(slots.map(pair => [...pair])); setOutcome(null); setComparison(null); }, [slots]);
  useEffect(() => { setOutcome(null); setComparison(null); }, [targetName]);
  const [attackType, setAttackType] = useState("");
  const [stance, setStance] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [comparison, setComparison] = useState(null);
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
  const canAttempt = Boolean(account?.name && targetId && attackType && stance && draftSlots.length);

  const calculateSlots = async slotSet => {
    const style = { name: `${attackType} ${stance}`, type: attackType, stance };
    const built = buildLiveCalculationRequest({
      playerName: account?.name,
      stats: accountStats,
      slots: slotSet,
      items,
      target: targetId ? { id: targetId, name: targetName } : null,
      style,
      boosts: { ...EMPTY_BOOSTS },
      prayers: [],
      buffs: { ...EMPTY_BUFFS, potions: [] },
      spell: null,
    });
    if (built.status !== "ready") return { status: built.status, result: null, issues: built.issues ?? [] };
    return calculateLiveCombat({ baseUrl: selectedRuntime, request: built.request });
  };

  const runCalculation = async () => {
    setBusy(true);
    setOutcome(null);
    setComparison(null);
    try {
      try { localStorage.setItem("osrshub-combat-runtime-url", selectedRuntime); } catch {}
      setOutcome(await calculateSlots(draftSlots));
    } catch {
      setOutcome({ status: "error", result: null, issues: ["Live calculation could not be prepared safely. Check the account, target and equipment selections."] });
    } finally {
      setBusy(false);
    }
  };

  const runComparison = async () => {
    setBusy(true);
    setOutcome(null);
    setComparison(null);
    try {
      try { localStorage.setItem("osrshub-combat-runtime-url", selectedRuntime); } catch {}
      const [baseline, candidate] = await Promise.all([calculateSlots(slots), calculateSlots(draftSlots)]);
      if (baseline.status !== "calculated" || candidate.status !== "calculated" || !baseline.result || !candidate.result) {
        const issues = [
          ...(baseline.status !== "calculated" ? (baseline.issues ?? []).map(issue => `Starting loadout: ${issue}`) : []),
          ...(candidate.status !== "calculated" ? (candidate.issues ?? []).map(issue => `Draft loadout: ${issue}`) : []),
        ];
        setComparison({ status: baseline.status === "review-required" || candidate.status === "review-required" ? "review-required" : "unavailable", issues: issues.length ? issues : ["Both loadouts must return verified engine results before they can be compared."] });
        return;
      }
      const summary = summariseLiveComparison(baseline.result, candidate.result);
      setComparison(summary.ok
        ? { status: "calculated", baseline: baseline.result, candidate: candidate.result, summary }
        : { status: "review-required", issues: summary.issues });
    } catch {
      setComparison({ status: "error", issues: ["The live comparison could not be completed. No estimated result has been substituted."] });
    } finally {
      setBusy(false);
    }
  };

  const result = outcome?.result;
  return <>
    <LoadoutWorkbench account={account} items={items} currentSlots={draftSlots} targetName={targetName} onDraftChange={next => { setDraftSlots(next); setOutcome(null); setComparison(null); }} />
    <section className="cs-live-runtime cs-panel" aria-labelledby="cs-live-runtime-title">
    <header>
      <div>
        <h2 id="cs-live-runtime-title"><Activity size={17}/> Live combat engine</h2>
        <p>Runs the real OSRS DPS calculator through the separately deployed Worker. Loadout estimates above are not treated as live DPS.</p>
      </div>
      <span className={result ? "cs-live-status success" : "cs-live-status"}><Server size={13}/>{result ? "CALCULATED" : "NOT YET VERIFIED"}</span>
    </header>
    <div className="cs-live-config">
      <label>Combat Worker URL
        <input value={selectedRuntime} onChange={event => { setSelectedRuntime(event.target.value); setOutcome(null); setComparison(null); }} placeholder="https://your-combat-worker.workers.dev" inputMode="url" autoComplete="url"/>
      </label>
      <label>Attack type
        <select value={attackType} onChange={event => { setAttackType(event.target.value); setOutcome(null); setComparison(null); }}>
          {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>Attack stance
        <select value={stance} onChange={event => { setStance(event.target.value); setOutcome(null); setComparison(null); }}>
          {STANCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
    </div>
    <div className="cs-live-context">
      <span><b>Account</b>{account?.name || "Import an account first"}</span>
      <span><b>Target</b>{targetName || "Choose a target above"}</span>
      <span><b>Canonical target ID</b>{targetId ?? "Not resolved"}</span>
      <span><b>Equipped slots</b>{draftSlots.length}</span>
    </div>
    <div className="cs-live-actions">
      <button className="cs-primary" onClick={runCalculation} disabled={busy || !canAttempt}>
        {busy ? <RefreshCw size={14} className="cs-spin"/> : <Activity size={14}/>}
        {busy ? "Calculating…" : "Run real calculation"}
      </button>
      <button className="cs-live-compare-button" onClick={runComparison} disabled={busy || !canAttempt || !slots.length}>
        {busy ? <RefreshCw size={14} className="cs-spin"/> : <Activity size={14}/>}
        Compare starting loadout vs draft
      </button>
    </div>
    {!canAttempt && <p className="cs-live-hint">To calculate, load an account, choose a target that has a canonical engine ID, select an attack type and stance, and configure the Worker URL.</p>}
    {outcome && !result && <div className="cs-live-message error" role="alert"><AlertCircle size={15}/><div><strong>{outcome.status === "review-required" ? "Review required" : "Live calculation unavailable"}</strong><ul>{(outcome.issues ?? []).map((issue, index) => <li key={index}>{issue}</li>)}</ul></div></div>}
    {comparison && comparison.status !== "calculated" && <div className="cs-live-message error" role="alert"><AlertCircle size={15}/><div><strong>{comparison.status === "review-required" ? "Comparison needs review" : "Live comparison unavailable"}</strong><ul>{(comparison.issues ?? []).map((issue, index) => <li key={index}>{issue}</li>)}</ul></div></div>}
    {comparison?.status === "calculated" && <div className="cs-live-comparison" aria-live="polite">
      <div className="cs-live-comparison-head"><CheckCircle2 size={16}/><div><strong>Verified loadout comparison</strong><small>Both results came from the live combat engine using the same target, account and combat settings.</small></div></div>
      <div className="cs-live-comparison-grid">
        <article><small>Starting loadout DPS</small><strong>{format(comparison.baseline.dps)}</strong><span>{format(comparison.baseline.maxHit)} max hit · {format(comparison.baseline.accuracy * 100)}% accuracy</span></article>
        <article><small>Draft loadout DPS</small><strong>{format(comparison.candidate.dps)}</strong><span>{format(comparison.candidate.maxHit)} max hit · {format(comparison.candidate.accuracy * 100)}% accuracy</span></article>
        <article className={comparison.summary.deltaDps > 0 ? "positive" : comparison.summary.deltaDps < 0 ? "negative" : ""}><small>DPS difference</small><strong>{comparison.summary.deltaDps > 0 ? "+" : ""}{format(comparison.summary.deltaDps)}</strong><span>{comparison.summary.deltaPercent === null ? "Percentage change unavailable" : `${comparison.summary.deltaPercent > 0 ? "+" : ""}${format(comparison.summary.deltaPercent)}% vs starting loadout`}</span></article>
      </div>
      <p className="cs-live-hint">Max-hit change: {comparison.summary.deltaMaxHit > 0 ? "+" : ""}{format(comparison.summary.deltaMaxHit)} · Accuracy change: {comparison.summary.deltaAccuracy > 0 ? "+" : ""}{format(comparison.summary.deltaAccuracy * 100)} percentage points · Attack speed change: {comparison.summary.deltaAttackSpeed > 0 ? "+" : ""}{format(comparison.summary.deltaAttackSpeed)} ticks</p>
    </div>}
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
  </section>
  </>;
}
