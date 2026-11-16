import React, { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowRightLeft, Bookmark, Check, ChevronDown, Coins, Search, ShieldCheck, Sparkles, Swords } from "lucide-react";
import { estimateLoadout, inferEquipmentSlot } from "./optimizer.js";
import { getLiveAmmoCompatibility } from "./live-calculation-client.js";
import "./loadout-workbench.css";

const SLOT_ORDER = ["Head", "Cape", "Neck", "Ammo", "Weapon", "Body", "Legs", "Shield", "Hands", "Feet", "Ring"];
const money = value => Number.isFinite(Number(value)) ? Math.round(Number(value)).toLocaleString("en-GB") + " gp" : "—";
const normal = value => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const itemName = item => String(item?._name ?? item?.name ?? item?.item_name ?? "");
const compatibleStyle = (item, style, slot) => {
  const name = normal(itemName(item));
  if (slot === "Ammo") return style === "Ranged" && /arrow|bolt|javelin|dart|chinchompa|throwingknife/.test(name);
  if (slot !== "Weapon") return true;
  if (style === "Melee") return !/bow|crossbow|blowpipe|chinchompa|ballista|staff|wand|trident|sceptre|tome/.test(name);
  if (style === "Ranged") return /bow|crossbow|blowpipe|ballista|chinchompa|dart|javelin|throwingknife/.test(name);
  return /staff|wand|trident|sceptre|battlestaff|mystic/.test(name);
};
const iconSource = item => { const raw = String(item?.icon_url ?? item?.wiki_image ?? item?.icon ?? "").trim(); if (!raw) return ""; if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/") || raw.startsWith("data:")) return raw; return "https://oldschool.runescape.wiki/images/" + encodeURIComponent(raw.replace(/ /g, "_")); };
const itemPrice = item => {
  for (const value of [item?._price, item?.sell, item?.high, item?.price, item?.buy]) {
    const price = Number(value);
    if (Number.isFinite(price) && price > 0) return price;
  }
  return null;
};
const setupCost = (slots, items) => slots.reduce((sum, [, name]) => {
  const match = items.find(item => normal(itemName(item)) === normal(name));
  return sum + (itemPrice(match) ?? 0);
}, 0);

/**
 * A budget-aware workbench around the existing transparent gear estimator.
 * Scores are labelled as estimates; this component never presents them as DPS.
 */
export default function LoadoutWorkbench({ account, items = [], currentSlots = [], targetName = "", onDraftChange, excluded = [], allowedItems = [], questOverrides = {}, targetRecords = [], catalogLoading = false, styleValue, budgetValue, onStyleChange, onBudgetChange, ownedItems = [], onOwnedItemsChange = () => {}, runtimeUrl = "" }) {
  const [budget, setBudget] = useState(String(budgetValue ?? "5000000"));
  const [style, setStyle] = useState(styleValue ?? "Melee");
  const [showRecommendations, setShowRecommendations] = useState(false);
  useEffect(() => { if (styleValue && styleValue !== style) setStyle(styleValue); }, [styleValue]);
  useEffect(() => { if (budgetValue != null && String(budgetValue) !== budget) setBudget(String(budgetValue)); }, [budgetValue]);
  const [accountAware, setAccountAware] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSlot, setActiveSlot] = useState("Weapon");
  const [draft, setDraft] = useState(() => currentSlots.map(pair => [...pair]));
  useEffect(() => { setDraft(currentSlots.map(pair => [...pair])); }, [currentSlots]);
  const [activeBuild, setActiveBuild] = useState("current");
  const [saveName, setSaveName] = useState("");
  const [savedBuilds, setSavedBuilds] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem("osrshub-combat-saved-builds") || "[]");
      return Array.isArray(value) ? value : [];
    } catch { return []; }
  });

  const stats = account?.stats ?? {};
  const quests = Array.isArray(account?.quests) ? account.quests : [];
  const activeWeaponPair = draft.find(([slot]) => slot === "Weapon") ?? null;
  const activeWeaponName = activeWeaponPair?.[1] ?? "";
  const activeWeapon = useMemo(() => {
    const id = Number(activeWeaponPair?.[2]);
    return (Number.isInteger(id) && id > 0 ? items.find(item => Number(item.id ?? item.item_id ?? item.itemId) === id) : null)
      ?? items.find(item => normal(itemName(item)) === normal(activeWeaponName))
      ?? null;
  }, [items, activeWeaponName, activeWeaponPair?.[2]]);
  const [ammoCompatibility, setAmmoCompatibility] = useState({status:"idle",compatibleAmmoIds:[],issues:[]});
  useEffect(() => {
    let active = true;
    if (activeSlot !== "Ammo") return () => { active = false; };
    if (style !== "Ranged") {
      setAmmoCompatibility({status:"not-required",compatibleAmmoIds:[],issues:[]});
      return () => { active = false; };
    }
    const weaponId = Number(activeWeapon?.id ?? activeWeapon?.item_id ?? activeWeapon?.itemId);
    if (!Number.isInteger(weaponId) || weaponId <= 0 || !runtimeUrl) {
      setAmmoCompatibility({status:"unavailable",compatibleAmmoIds:[],issues:["Select a weapon and configure the combat Worker to validate ammunition."]});
      return () => { active = false; };
    }
    setAmmoCompatibility({status:"loading",compatibleAmmoIds:[],issues:[]});
    getLiveAmmoCompatibility({baseUrl:runtimeUrl,weaponId}).then(value => {
      if (active) setAmmoCompatibility(value);
    });
    return () => { active = false; };
  }, [activeSlot, style, activeWeapon?.id, activeWeapon?.item_id, activeWeapon?.itemId, runtimeUrl]);
  const numericBudget = Math.max(0, Number(budget) || 0);
  const options = useMemo(() => {
    if (!showRecommendations || catalogLoading || !numericBudget || !items.length) return [];
    return [
      { id: "budget", label: "Budget", detail: "Spend carefully", cap: Math.max(1, Math.round(numericBudget * 0.35)) },
      { id: "balanced", label: "Balanced", detail: "Room to upgrade", cap: Math.max(1, Math.round(numericBudget * 0.7)) },
      { id: "best", label: "Best within budget", detail: "Use the full cap", cap: numericBudget },
    ].map(tier => ({
      ...tier,
      estimate: estimateLoadout({
        items, target: targetName, targetRecords, style, budget: tier.cap, stats, quests,
        accountAware, excluded, allowedItems, questOverrides, 
      }),
    }));
  }, [items, targetName, targetRecords, style, numericBudget, stats, quests, accountAware, excluded, allowedItems, questOverrides, catalogLoading, showRecommendations]);

  const currentCost = setupCost(draft, items);
  const selectedEstimate = options.find(option => option.id === activeBuild);
  const filteredItems = useMemo(() => items
    .filter(item => inferEquipmentSlot({ ...item, name: itemName(item) }) === activeSlot)
    .filter(item => compatibleStyle(item, style, activeSlot))
    .filter(item => activeSlot !== "Ammo" || (
      ammoCompatibility.status === "required"
      && ammoCompatibility.compatibleAmmoIds.includes(Number(item.id ?? item.item_id ?? item.itemId))
    ))
    .filter(item => !search.trim() || itemName(item).toLowerCase().includes(search.trim().toLowerCase()))
    // Manual selection must show the full slot catalogue. Budget and missing prices
    // affect recommendations and cost estimates, never whether an item is selectable.
    .sort((a, b) => {
      const ap = itemPrice(a), bp = itemPrice(b);
      if (ap == null && bp == null) return itemName(a).localeCompare(itemName(b));
      if (ap == null) return 1;
      if (bp == null) return -1;
      return ap - bp;
    }), [items, activeSlot, search, style, ammoCompatibility]);

  const applyEstimate = option => {
    const next = (option?.estimate?.slots ?? []).map(pair => [...pair]);
    if (!next.length) return;
    setDraft(next);
    setActiveBuild(option.id);
    onDraftChange?.(next);
  };
  const chooseItem = item => {
    const next = draft.map(pair => pair[0] === activeSlot ? [pair[0], itemName(item), Number(item.id ?? item.item_id ?? item.itemId) || null] : [...pair]);
    setDraft(next);
    setActiveBuild("custom");
    onDraftChange?.(next);
  };
  const saveBuild = () => {
    const name = saveName.trim();
    if (!name || !draft.length) return;
    const entry = { id: Date.now(), name, style, targetName, budget: numericBudget, slots: draft.map(pair => [...pair]), savedAt: new Date().toISOString() };
    const next = [entry, ...savedBuilds.filter(build => build.name.toLowerCase() !== name.toLowerCase())].slice(0, 20);
    setSavedBuilds(next);
    try { localStorage.setItem("osrshub-combat-saved-builds", JSON.stringify(next)); } catch {}
    setSaveName("");
  };
  const restoreBuild = build => {
    setStyle(build.style || style);
    setBudget(String(build.budget || numericBudget));
    const next = (build.slots || []).map(pair => [...pair]);
    setDraft(next);
    setActiveBuild("custom");
    onDraftChange?.(next);
  };
  const ownedKeys = new Set((Array.isArray(ownedItems) ? ownedItems : []).map(normal));
  const toggleOwned = item => {
    const itemKey = normal(itemName(item));
    const next = ownedKeys.has(itemKey)
      ? ownedItems.filter(name => normal(name) !== itemKey)
      : [...ownedItems, itemName(item)];
    onOwnedItemsChange(next);
  };
  const currentNames = new Map(draft.map(([slot, name]) => [slot, name]));
  const recommendedSlots = selectedEstimate?.estimate?.slots ?? [];
  const recommendedNames = new Map(recommendedSlots.map(([slot, name]) => [slot, name]));
  const priceForName = name => { const match = items.find(item => normal(itemName(item)) === normal(name)); return itemPrice(match); };
  const comparisonRows = SLOT_ORDER.map(slot => ({ slot, current: currentNames.get(slot) || "—", recommended: recommendedNames.get(slot) || "—" })).filter(row => row.current !== row.recommended);
  const applyRecommendedSlot = (slot, name) => { const next = draft.map(([currentSlot, currentName]) => currentSlot === slot ? [currentSlot, name] : [currentSlot, currentName]); setDraft(next); setActiveBuild("custom"); onDraftChange?.(next); };
  const missingPrices = draft.filter(([, name]) => name && name !== "—" && !items.some(item => normal(itemName(item)) === normal(name) && itemPrice(item) !== null));

  return <section className="cs-workbench cs-panel" aria-labelledby="cs-workbench-title">
    <header className="cs-workbench-head">
      <div><small>LOADOUT LAB · ACCOUNT AND BUDGET AWARE</small><h2 id="cs-workbench-title"><Sparkles size={18}/> Loadout Workbench</h2><p>Compare affordable setups, inspect gear by slot and save builds. Scores are equipment estimates, not verified DPS.</p></div>
      <div className="cs-workbench-total"><small>Draft gear cost</small><strong>{money(currentCost)}</strong><span>{numericBudget ? money(Math.max(0, numericBudget - currentCost)) + " budget left" : "Set a GP budget"}</span></div>
    </header>
    <div className="cs-workbench-controls">
      <label>Combat style<select value={style} onChange={event => { setStyle(event.target.value); onStyleChange?.(event.target.value); setActiveBuild("custom"); }}><option>Melee</option><option>Ranged</option><option>Magic</option></select></label>
      <label>Budget (GP)<input inputMode="numeric" value={budget} onChange={event => { const next = event.target.value.replace(/[^0-9]/g, ""); setBudget(next); onBudgetChange?.(next); }} placeholder="5000000"/></label>
      <label className="cs-workbench-toggle"><input type="checkbox" checked={accountAware} onChange={event => setAccountAware(event.target.checked)}/> Respect known account requirements for recommendations</label>
    </div>
    <div className="cs-workbench-recommend-toggle"><span>Budget gear suggestions run only when requested to keep style changes responsive.</span><button type="button" onClick={() => setShowRecommendations(value => !value)}>{showRecommendations ? "Hide budget suggestions" : "Calculate budget suggestions"}</button></div>
    <div className="cs-workbench-builds" aria-label="Suggested loadouts">
      {options.map(option => <article className={activeBuild === option.id ? "active" : ""} key={option.id}>
        <div className="cs-workbench-build-top"><span>{option.id === "budget" ? "01" : option.id === "balanced" ? "02" : "03"}</span><small>{option.detail}</small></div>
        <h3>{option.label}</h3><strong>{money(option.estimate.totalCost)}</strong>
        <div className="cs-workbench-meter" role="progressbar" aria-label={option.label + " budget usage"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={option.cap ? Math.min(100, Math.round(option.estimate.totalCost / option.cap * 100)) : 0}><i style={{ width: option.cap ? Math.min(100, option.estimate.totalCost / option.cap * 100) + "%" : "0%" }}/></div>
        <p>{option.estimate.candidateCount} candidates reviewed · {option.estimate.warnings.length ? "Data caveats" : "Source fields available"}</p>
        <button type="button" onClick={() => applyEstimate(option)} disabled={!option.estimate.slots?.length}><Check size={14}/> Use this setup</button>
      </article>)}
      {!options.length && <p className="cs-workbench-empty">Select “Calculate budget suggestions” to compare ranked setups when you need them.</p>}
    </div>
    <div className="cs-workbench-compare">
      <div className="cs-workbench-editor-head"><div><h3><ArrowRightLeft size={16}/> Slot-by-slot comparison</h3><p>Compare your draft with the selected budget recommendation before applying it.</p></div><span>{comparisonRows.length} slot changes</span></div>
      {comparisonRows.length ? <div className="cs-workbench-compare-table" role="table" aria-label="Loadout slot comparison">
        <div className="cs-workbench-compare-row heading" role="row"><span>Slot</span><span>Current draft</span><span>Recommended</span><span>Cost change</span><span/></div>
        {comparisonRows.map(row => { const oldPrice = priceForName(row.current); const newPrice = priceForName(row.recommended); const delta = oldPrice == null || newPrice == null ? null : newPrice - oldPrice; return <div className="cs-workbench-compare-row" role="row" key={row.slot}><strong>{row.slot}</strong><span title={row.current}>{row.current}</span><span title={row.recommended}>{row.recommended}</span><b className={delta == null ? "" : delta > 0 ? "up" : delta < 0 ? "down" : ""}>{delta == null ? "Price unknown" : (delta > 0 ? "+" : "") + money(delta)}</b><button type="button" onClick={() => applyRecommendedSlot(row.slot, row.recommended)} disabled={row.recommended === "—"}>Apply</button></div>; })}
      </div> : <p className="cs-workbench-empty">Your draft matches the selected recommendation in every slot, or no recommendation is available yet.</p>}
    </div>
    <div className="cs-workbench-editor">
      <div className="cs-workbench-editor-head"><div><h3><Swords size={16}/> Gear by slot</h3><p>Choose an item to update the draft used by the live calculation panel.</p></div><span>{draft.filter(([, name]) => name && name !== "—").length} slots filled</span></div>
      <div className="cs-workbench-slots">{SLOT_ORDER.map(slot => <button type="button" key={slot} className={activeSlot === slot ? "active" : ""} onClick={() => { setActiveSlot(slot); setSearch(""); }}><small>{slot}</small><strong>{currentNames.get(slot) || "Empty"}</strong></button>)}</div>
      <label className="cs-workbench-search"><Search size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder={"Search " + activeSlot.toLowerCase() + " equipment"}/></label>
      {activeSlot === "Ammo" && <p className="cs-workbench-empty">{ammoCompatibility.status === "not-required" ? "This weapon does not require an ammunition-slot item. Leave the slot empty." : ammoCompatibility.status === "loading" ? "Checking compatible ammunition against the canonical combat engine…" : ammoCompatibility.status === "unavailable" ? (ammoCompatibility.issues?.[0] || "Ammunition compatibility is not available.") : "Only ammunition IDs accepted by the selected weapon are shown."}</p>}
      <div className="cs-workbench-item-list">{filteredItems.map(item => <div className="cs-workbench-item-row" key={item.id ?? itemName(item)}>
        <button type="button" className="cs-workbench-item-choice" onClick={() => chooseItem(item)}><span className="cs-workbench-item-icon">{iconSource(item) ? <img src={iconSource(item)} alt="" onError={event => { event.currentTarget.style.display = "none"; }}/> : <ShieldCheck size={16}/>}</span><span><strong>{itemName(item)}</strong><small>{item.version ? "Engine variant: " + item.version + " · " : ""}{item.requirements ? "Requirements recorded" : "Requirements not fully recorded"} · {item.members === false ? "F2P" : "Membership data as supplied"}</small></span><b>{itemPrice(item) == null ? "Price unavailable" : money(itemPrice(item))}</b><ChevronDown size={14}/></button>
        <button type="button" className={"cs-workbench-owned" + (ownedKeys.has(normal(itemName(item))) ? " active" : "")} onClick={() => toggleOwned(item)} aria-pressed={ownedKeys.has(normal(itemName(item)))}>{ownedKeys.has(normal(itemName(item))) ? "Owned ✓" : "Mark owned"}</button>
      </div>)}{!filteredItems.length && <p className="cs-workbench-empty">No equipment found for this slot and search.</p>}</div>
      {missingPrices.length > 0 && <p className="cs-workbench-warning"><Coins size={14}/> {missingPrices.length} selected item(s) have no usable price record. Total cost may be incomplete.</p>}
    </div>
    <div className="cs-workbench-saved">
      <div><h3><Bookmark size={15}/> Saved loadouts</h3><p>Saved locally on this device; they are not synced unless your account sync feature supports this key.</p></div>
      <label><input value={saveName} onChange={event => setSaveName(event.target.value)} placeholder="Name this loadout" maxLength={60}/><button type="button" onClick={saveBuild} disabled={!saveName.trim()}><Bookmark size={14}/> Save</button></label>
      {savedBuilds.length > 0 && <div className="cs-workbench-saved-list">{savedBuilds.map(build => <button type="button" key={build.id} onClick={() => restoreBuild(build)}><span><strong>{build.name}</strong><small>{build.style} · {build.targetName || "No target"} · {money(build.budget)}</small></span><ArrowRightLeft size={15}/></button>)}</div>}
    </div>
    {selectedEstimate?.estimate?.warnings?.length > 0 && <p className="cs-workbench-warning"><ArrowDownRight size={14}/> Estimator notes: {selectedEstimate.estimate.warnings.join(" ")}</p>}
  </section>;
}
