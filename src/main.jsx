import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Search, Bell, Star, TrendingUp, TrendingDown, SlidersHorizontal, X,
  ArrowUpDown, ChevronRight, RefreshCw, Plus, Trash2, Save, Filter,
  Check, ChevronDown, ExternalLink, Moon, Sun, UserRound, GripVertical,
  RotateCcw, Clock3, BarChart3, WalletCards, BookOpen, LayoutGrid,
  MousePointer2, LockKeyhole, Sparkles
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, Tooltip, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
import "./styles.css";

const API = "https://prices.runescape.wiki/api/v1/osrs";
const TAX_RATE = 0.02;
const TAX_CAP = 5_000_000;
const REFRESH_MS = 60_000;

const money = n => n == null || Number.isNaN(Number(n)) ? "—" : Math.round(n).toLocaleString("en-GB") + " gp";
const num = n => n == null || Number.isNaN(Number(n)) ? "—" : Math.round(n).toLocaleString("en-GB");
const pct = n => n == null || Number.isNaN(Number(n)) ? "—" : `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`;
const taxFor = sell => Math.min(Math.floor((sell || 0) * TAX_RATE), TAX_CAP);
const safeJSON = (key, fallback) => { try { const x = JSON.parse(localStorage.getItem(key) || "null"); return x == null ? fallback : x; } catch { return fallback; } };

function parseOSRSNumber(value) {
  if (value == null || value === "") return NaN;
  if (typeof value === "number") return value;
  const s = String(value).trim().toLowerCase().replace(/,/g, "");
  const match = s.match(/^(-?[\d.]+)\s*([kmb])?$/);
  if (!match) return Number(s);
  const n = Number(match[1]);
  return n * ({ k: 1e3, m: 1e6, b: 1e9 }[match[2]] || 1);
}
function compactGP(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  const a = Math.abs(Number(n));
  if (a >= 1e9) return `${(n / 1e9).toFixed(2).replace(/\.00$/, "")}b`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.00$/, "")}m`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
  return Math.round(n).toString();
}
function enrich(row, mapping, hourly = {}) {
  const m = mapping[row.id] || {};
  const buy = row.low ?? 0;
  const sell = row.high ?? 0;
  const tax = taxFor(sell);
  const margin = sell - buy - tax;
  const h = hourly[row.id];
  const volume = h ? (h.highPriceVolume || 0) + (h.lowPriceVolume || 0) : 0;
  return {
    ...row, ...m, buy, sell, tax, margin,
    grossMargin: sell - buy,
    roi: buy ? margin / buy * 100 : 0,
    volume,
    potentialProfit: margin * (m.limit || 0),
    buyUpdated: row.lowTime ? row.lowTime * 1000 : null,
    sellUpdated: row.highTime ? row.highTime * 1000 : null,
    lastUpdated: Math.max(row.highTime || 0, row.lowTime || 0) * 1000 || null
  };
}
async function api(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
function iconUrl(icon) { return icon ? `https://oldschool.runescape.wiki/images/${encodeURIComponent(icon.replace(/ /g, "_"))}` : ""; }
function localTime(ts, options = {}) { return new Intl.DateTimeFormat(undefined, options).format(ts); }

const columnOptions = [
  ["buy", "Insta buy"], ["sell", "Insta sell"], ["margin", "Margin"], ["roi", "ROI"],
  ["volume", "1h volume"], ["limit", "GE limit"], ["potentialProfit", "Profit / limit"], ["updated", "Last update"]
];
const FIELD_OPTIONS = [["margin", "Margin"], ["roi", "ROI"], ["buy", "Buy price"], ["sell", "Sell price"], ["volume", "1h volume"], ["limit", "GE limit"], ["potentialProfit", "Limit profit"]];
const OP_OPTIONS = [["gt", ">"], ["gte", "≥"], ["eq", "="], ["lte", "≤"], ["lt", "<"]];

const recipeDefinitions = [
  { category: "Herblore", name: "Clean grimy ranarr", input: "Grimy ranarr", output: "Ranarr weed", qty: 1, seconds: 2.2 },
  { category: "Herblore", name: "Clean grimy snapdragon", input: "Grimy snapdragon", output: "Snapdragon", qty: 1, seconds: 2.2 },
  { category: "Herblore", name: "Clean grimy torstol", input: "Grimy torstol", output: "Torstol", qty: 1, seconds: 2.2 },
  { category: "Herblore", name: "Clean grimy kwuarm", input: "Grimy kwuarm", output: "Kwuarm", qty: 1, seconds: 2.2 },
  { category: "Herblore", name: "Clean grimy avantoe", input: "Grimy avantoe", output: "Avantoe", qty: 1, seconds: 2.2 },
  { category: "Herblore", name: "Make prayer potion (3)", input: "Prayer potion(3)", output: "Prayer potion(4)", qty: 1, seconds: 4.0 },
  { category: "Fletching", name: "String yew longbow", input: "Yew longbow (u)", output: "Yew longbow", qty: 1, seconds: 2.4 },
  { category: "Fletching", name: "String magic longbow", input: "Magic longbow (u)", output: "Magic longbow", qty: 1, seconds: 2.4 },
  { category: "Fletching", name: "Cut ruby bolts", input: "Ruby bolts (unf)", output: "Ruby bolts", qty: 1, seconds: 1.4 },
  { category: "Fletching", name: "Make headless arrows", input: "Arrow shafts", output: "Headless arrow", qty: 15, seconds: 2.0 },
  { category: "Magic", name: "High alchemy: rune platebody", input: "Rune platebody", output: "Coins", qty: 1, seconds: 3.0 },
  { category: "Magic", name: "High alchemy: dragon scimitar", input: "Dragon scimitar", output: "Coins", qty: 1, seconds: 3.0 },
  { category: "Crafting", name: "Tan green dragonhide", input: "Green dragonhide", output: "Green d'hide", qty: 1, seconds: 1.2 },
  { category: "Crafting", name: "Tan black dragonhide", input: "Black dragonhide", output: "Black d'hide", qty: 1, seconds: 1.2 },
  { category: "Crafting", name: "Cut diamond", input: "Uncut diamond", output: "Diamond", qty: 1, seconds: 2.0 },
  { category: "Crafting", name: "Cut dragonstone", input: "Uncut dragonstone", output: "Dragonstone", qty: 1, seconds: 2.0 },
  { category: "Smithing", name: "Smelt steel bars", input: "Iron ore", output: "Steel bar", qty: 1, seconds: 2.4 },
  { category: "Smithing", name: "Smelt mithril bars", input: "Mithril ore", output: "Mithril bar", qty: 1, seconds: 2.4 },
  { category: "Runecraft", name: "Craft nature runes", input: "Pure essence", output: "Nature rune", qty: 1, seconds: 2.0 },
  { category: "Runecraft", name: "Craft law runes", input: "Pure essence", output: "Law rune", qty: 1, seconds: 2.0 },
  { category: "Cooking", name: "Cook sharks", input: "Raw shark", output: "Shark", qty: 1, seconds: 2.0 },
  { category: "Cooking", name: "Cook karambwan", input: "Raw karambwan", output: "Cooked karambwan", qty: 1, seconds: 1.6 },
  { category: "Mining", name: "Crush granite", input: "Granite (5kg)", output: "Granite dust", qty: 1, seconds: 1.0 },
  { category: "Processing", name: "Make mahogany planks", input: "Mahogany logs", output: "Mahogany plank", qty: 1, seconds: 2.0 },
  { category: "Processing", name: "Make oak planks", input: "Oak logs", output: "Oak plank", qty: 1, seconds: 2.0 },
  { category: "Processing", name: "Grind unicorn horns", input: "Unicorn horn", output: "Ground unicorn horn", qty: 1, seconds: 1.2 }
];
const moneyMakerSeed = [
  ["Killing the Doom of Mokhaiotl (Delve 1-16)", 19430000, "Combat/High", "High", "90+ combat; 80+ Attack; 77+ Prayer", true],
  ["Killing Yama (shard contract, duo)", 16816000, "Combat/High", "High", "High combat; strong raid/boss gear", true],
  ["Theatre of Blood", 11504000, "Combat/High", "High", "95+ combat stats recommended", true],
  ["Killing Nex (Duo)", 11088000, "Combat/High", "High", "95+ combat stats recommended", true],
  ["Fortis Colosseum (Wave 12)", 11013000, "Combat/High", "High", "High combat; Colosseum access", true],
  ["Chambers of Xeric (Challenge Mode)", 9688000, "Combat/High", "High", "95+ combat stats recommended", true],
  ["Tombs of Amascut (solo 545)", 9489000, "Combat/High", "High", "High combat; raid access", true],
  ["Crafting steam runes", 1529000, "Skilling/Runecraft", "Moderate", "19 Runecraft; 82 Magic for Magic Imbue", true],
  ["Crafting astral runes", 1525000, "Skilling/Runecraft", "High", "85 Runecraft recommended", true],
  ["Crafting mud runes", 1496000, "Skilling/Runecraft", "Moderate", "13 Runecraft; 82 Magic for Magic Imbue", true],
  ["Mining lead ore", 397000, "Skilling/Mining", "High", "25 Mining", false],
  ["Cleaning grimy kwuarm", 395000, "Skilling/Herblore", "High", "54 Herblore", true],
  ["Stringing yew longbows", 389000, "Skilling/Fletching", "Moderate", "70 Fletching", true],
  ["Making uncooked meat pies", 397000, "Processing", "Low", "20 Cooking", false],
  ["Crafting ruby jewellery", 96000, "Skilling/Crafting", "Low", "34 Crafting", true],
  ["Collecting and tanning cowhide", 65000, "Collecting", "Low", "None", false],
  ["Mining clay", 56000, "Skilling/Mining", "Low", "None", false],
  ["Smelting steel bars", 101000, "Skilling/Smithing", "Low", "30 Smithing", false],
  ["Tanning hides", 500000, "Processing", "Low", "None; varies by hide", true]
].map((x, i) => ({ id: `mm-${i}`, name: x[0], gpHour: x[1], category: x[2], intensity: x[3], requirements: x[4], members: x[5], description: "Estimated profit changes with Grand Exchange prices, speed, supply and player efficiency. You are not guaranteed to make this amount." }));

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("OSRSFlipIt render error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div className="appCrash"><div className="appCrashCard"><div className="eyebrow">OSRSFLIPIT</div><h1>Something went wrong.</h1><p>The app hit a browser-side error instead of silently showing a blank page.</p><details><summary>Technical details</summary><pre>{String(this.state.error?.stack || this.state.error || "Unknown error")}</pre></details><button className="primary" onClick={() => window.location.reload()}>Reload OSRSFlipIt</button></div></div>;
    }
    return this.props.children;
  }
}

function App() {
  const [items, setItems] = useState([]);
  const [mapping, setMapping] = useState({});
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(null);
  const [search, setSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [sort, setSort] = useState({ key: "margin", dir: "desc" });
  const [tab, setTab] = useState("market");
  const [marketVisible, setMarketVisible] = useState(30);
  const [watch, setWatch] = useState(() => safeJSON("osrsflipit-watch", []));
  const [alerts, setAlerts] = useState(() => safeJSON("osrsflipit-alerts", []));
  const [alertRules, setAlertRules] = useState(() => safeJSON("osrsflipit-rules", []));
  const [profiles, setProfiles] = useState(() => safeJSON("osrsflipit-profiles", []).filter(p => p && p.name && Array.isArray(p.conditions)));
  const [conditions, setConditions] = useState(() => safeJSON("osrsflipit-filters", []));
  const [selected, setSelected] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(false);
  const [ruleModal, setRuleModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [dark, setDark] = useState(() => localStorage.getItem("osrsflipit-theme") === "dark");
  const [accountOpen, setAccountOpen] = useState(false);
  const [columns, setColumns] = useState(() => safeJSON("osrsflipit-columns", ["buy","sell","margin","roi","volume","limit","potentialProfit","updated"]));
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [moverMinPrice, setMoverMinPrice] = useState("");
  const [moverMaxPrice, setMoverMaxPrice] = useState("");
  const [moverMinVolume, setMoverMinVolume] = useState("");
  const [moverMaxVolume, setMoverMaxVolume] = useState("");
  const [watchChanges, setWatchChanges] = useState({});
  const toastTimer = useRef(null);

  const notify = (message, itemId = null) => { setToast({ message, itemId }); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(null), 15000); };
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("osrsflipit-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => localStorage.setItem("osrsflipit-columns", JSON.stringify(columns)), [columns]);
  useEffect(() => localStorage.setItem("osrsflipit-watch", JSON.stringify(watch)), [watch]);
  useEffect(() => localStorage.setItem("osrsflipit-filters", JSON.stringify(conditions)), [conditions]);
  useEffect(() => localStorage.setItem("osrsflipit-profiles", JSON.stringify(profiles)), [profiles]);
  useEffect(() => {
    const onKey = e => { if (e.key !== "Escape") return; if (selected) setSelected(null); else if (ruleModal) setRuleModal(false); else if (accountOpen) setAccountOpen(false); else if (notificationsOpen) setNotificationsOpen(false); else if (profileOpen) setProfileOpen(false); else if (columnMenuOpen) setColumnMenuOpen(false); else if (filterOpen) setFilterOpen(false); };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [selected, ruleModal, accountOpen, notificationsOpen, profileOpen, columnMenuOpen, filterOpen]);

  async function load() {
    setLoading(true);
    try {
      const [latest, map, hour] = await Promise.all([api("/latest"), api("/mapping"), api("/1h")]);
      const mapObj = Object.fromEntries(map.map(x => [x.id, x]));
      const rows = Object.entries(latest.data || {}).map(([id, x]) => enrich({ id: +id, ...x }, mapObj, hour.data || {})).filter(x => x.name && (x.buy > 0 || x.sell > 0));
      setItems(rows); setMapping(mapObj); setUpdated(new Date()); checkRules(rows);
    } catch (e) { console.error(e); notify("Could not refresh OSRS prices. Try again in a moment."); }
    finally { setLoading(false); }
  }
  function checkRules(rows) {
    const stamp = Date.now(); const fresh = [];
    const changed = alertRules.map(rule => {
      const item = rows.find(x => x.id === rule.id); if (!item) return rule;
      const value = rule.metric === "buy" ? item.buy : rule.metric === "sell" ? item.sell : rule.metric === "margin" ? item.margin : item.roi;
      const hit = rule.direction === "above" ? value >= rule.value : value <= rule.value;
      if (hit && stamp - (rule.lastTriggered || 0) > 10 * 60 * 1000) { fresh.push({ id: crypto.randomUUID(), itemId: item.id, name: item.name, metric: rule.metric, value, target: rule.value, at: stamp }); return { ...rule, lastTriggered: stamp }; }
      return rule;
    });
    if (fresh.length) { const next = [...fresh, ...alerts].slice(0, 100); setAlerts(next); setAlertRules(changed); localStorage.setItem("osrsflipit-alerts", JSON.stringify(next)); localStorage.setItem("osrsflipit-rules", JSON.stringify(changed)); notify(`${fresh.length === 1 ? fresh[0].name : `${fresh.length} alerts`} triggered`, fresh[0]?.itemId); }
  }
  useEffect(() => { load(); const t = setInterval(load, REFRESH_MS); return () => clearInterval(t); }, []);

  const globalMatches = useMemo(() => { const q = globalSearch.trim().toLowerCase(); return q ? items.filter(x => x.name.toLowerCase().includes(q)).slice(0, 7) : []; }, [items, globalSearch]);
  function passesFilters(x) { return conditions.every(c => { const raw = x[c.field], value = parseOSRSNumber(c.value); if (raw == null || Number.isNaN(value)) return false; if (c.op === "gt") return raw > value; if (c.op === "gte") return raw >= value; if (c.op === "eq") return raw === value; if (c.op === "lte") return raw <= value; return raw < value; }); }
  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); const arr = items.filter(x => x.name.toLowerCase().includes(q) && passesFilters(x)); arr.sort((a,b) => ((a[sort.key] ?? 0) - (b[sort.key] ?? 0)) * (sort.dir === "asc" ? 1 : -1)); return arr; }, [items, search, sort, conditions]);
  const movers = useMemo(() => {
    const minP = moverMinPrice === "" ? -Infinity : parseOSRSNumber(moverMinPrice), maxP = moverMaxPrice === "" ? Infinity : parseOSRSNumber(moverMaxPrice), minV = moverMinVolume === "" ? -Infinity : parseOSRSNumber(moverMinVolume), maxV = moverMaxVolume === "" ? Infinity : parseOSRSNumber(moverMaxVolume);
    const calc = items.filter(x => x.buy > 0 && x.sell > 0 && x.sell >= minP && x.sell <= maxP && x.volume >= minV && x.volume <= maxV).map(x => ({ ...x, change: x.buy ? ((x.sell - x.buy) / x.buy) * 100 : 0 }));
    return { up: [...calc].sort((a,b)=>b.change-a.change).slice(0,50), down: [...calc].sort((a,b)=>a.change-b.change).slice(0,50) };
  }, [items,moverMinPrice,moverMaxPrice,moverMinVolume,moverMaxVolume]);
  const watched = items.filter(x => watch.includes(x.id));
  const activeAlerts = alerts.filter(a => Date.now() - a.at < 60 * 60 * 1000);

  async function selectItem(item, range = "24h", center = false) {
    setSelected({ ...item, chartRange: range }); setSelectedCenter(center);
    if (history[item.id]?.[range]) return;
    const config = { "24h": { timestep: "5m", points: 288 }, "48h": { timestep: "1h", points: 48 }, "7d": { timestep: "1h", points: 168 }, "30d": { timestep: "6h", points: 120 }, "6m": { timestep: "24h", points: 180 } }[range];
    try {
      const res = await api(`/timeseries?timestep=${config.timestep}&id=${item.id}`);
      const data = (res.data || []).slice(-config.points).map(p => ({ timestamp: p.timestamp * 1000, buy: p.avgLowPrice ?? null, sell: p.avgHighPrice ?? null, buyVolume: p.lowPriceVolume ?? 0, sellVolume: p.highPriceVolume ?? 0 })).filter(p => p.buy != null || p.sell != null);
      setHistory(h => ({ ...h, [item.id]: { ...(h[item.id] || {}), [range]: data } }));
    } catch (e) { console.error(e); notify("Could not load that chart."); }
  }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = {};
      for (const id of watch.slice(0, 20)) {
        if (history[id]?.["24h"] || cancelled) continue;
        try { const res = await api(`/timeseries?timestep=1h&id=${id}`); const d = (res.data || []).slice(-24); const first = d.find(x=>x.avgHighPrice != null)?.avgHighPrice; const last = [...d].reverse().find(x=>x.avgHighPrice != null)?.avgHighPrice; if (first && last) next[id] = ((last-first)/first)*100; } catch {}
      }
      if (!cancelled && Object.keys(next).length) setWatchChanges(x => ({...x,...next}));
    })();
    return () => { cancelled = true; };
  }, [watch.join(",")]);

  function toggleWatch(id) { setWatch(w => w.includes(id) ? w.filter(x=>x!==id) : w.length < 100 ? [...w,id] : w); }
  function sortBy(key) { setSort(s => s.key === key ? {key,dir:s.dir === "desc" ? "asc" : "desc"} : {key,dir:"desc"}); }
  function clearSearch() { setSearch(""); setMarketVisible(30); }
  function goMarket() { setTab("market"); setSearch(""); window.scrollTo({top:0,behavior:"smooth"}); }
  function addCondition() { setConditions(c => [...c,{id:crypto.randomUUID(),field:"margin",op:"gte",value:50000}]); }
  function updateCondition(id,patch) { setConditions(cs=>cs.map(c=>c.id===id?{...c,...patch}:c)); }
  function removeCondition(id) { setConditions(cs=>cs.filter(c=>c.id!==id)); }
  function saveProfile() { const name=profileName.trim(); if(!name) return; const next=[...profiles.filter(p=>p.name.toLowerCase()!==name.toLowerCase()),{name,conditions:[...conditions]}]; setProfiles(next); setProfileName(""); notify(`Profile "${name}" saved`); }
  function loadProfile(name) { const p=profiles.find(x=>x.name===name); if(!p) return; setConditions(Array.isArray(p.conditions)?p.conditions:[]); setProfileOpen(false); notify(`Loaded profile "${name}"`); }
  function openAlertItem(id) { const item=items.find(x=>x.id===id); if(item) selectItem(item,"48h"); }
  function toggleColumn(key) { setColumns(cs=>cs.includes(key)?cs.filter(x=>x!==key):[...cs,key]); }
  function moveColumn(from,to) { setColumns(cs=>{const n=[...cs],i=n.indexOf(from),j=n.indexOf(to);if(i<0||j<0||i===j)return cs;n.splice(i,1);n.splice(j,0,from);return n;}); }
  const formatClock = ts => localTime(ts,{hour:"2-digit",minute:"2-digit",second:"2-digit"});

  return <div className="app">
    <header className="nav">
      <button className="brand" onClick={goMarket}><span>OSRS</span>FlipIt</button>
      <div className="navlinks">
        {["market","screener","movers","recipes","moneymakers","analysis","watch","alerts"].map(key=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{key === "moneymakers" ? "Money Makers" : key[0].toUpperCase()+key.slice(1)}{key==="watch"&&<b>{watch.length}</b>}{key==="alerts"&&activeAlerts.length>0&&<b className="red">{activeAlerts.length}</b>}</button>)}
      </div>
      <div className="globalSearch"><Search size={16}/><input value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Search any item…"/>{globalSearch&&<button onClick={()=>setGlobalSearch("")}><X size={14}/></button>}{globalMatches.length>0&&<div className="globalResults">{globalMatches.map(x=><button key={x.id} onClick={()=>{setGlobalSearch("");selectItem(x)}}><img src={iconUrl(x.icon)}/><span><strong>{x.name}</strong><small>{money(x.sell)} · {money(x.margin)} margin</small></span><ChevronRight size={14}/></button>)}</div>}</div>
      <div className="topClock"><Clock3 size={13}/><span>{formatClock(now)}</span><small>{Intl.DateTimeFormat().resolvedOptions().timeZone}</small></div>
      <button className="iconbtn" onClick={()=>setNotificationsOpen(v=>!v)} title="Notifications"><Bell size={17}/>{activeAlerts.length>0&&<i/>}</button>
      <button className="iconbtn" onClick={()=>setDark(v=>!v)} title="Toggle dark mode">{dark?<Sun size={17}/>:<Moon size={17}/>}</button>
      <button className="iconbtn" onClick={()=>setAccountOpen(true)} title="Account"><UserRound size={17}/></button>
      <button className="iconbtn" onClick={load} title="Refresh"><RefreshCw size={17}/></button>
      {notificationsOpen&&<NotificationPopover alerts={alerts} clear={()=>{setAlerts([]);localStorage.setItem("osrsflipit-alerts","[]")}} openItem={openAlertItem} close={()=>setNotificationsOpen(false)}/>} 
    </header>

    {watched.length>0&&<WatchTicker watched={watched} changes={watchChanges} onSelect={selectItem}/>} 

    <main>
      {tab === "market" && <><Hero updated={updated}/><MarketView {...{search,setSearch,clearSearch,conditions,filterOpen,setFilterOpen,addCondition,updateCondition,removeCondition,profiles,setProfiles,profileOpen,setProfileOpen,profileName,setProfileName,saveProfile,loadProfile,columns,setColumns,columnOptions,columnMenuOpen,setColumnMenuOpen,toggleColumn,moveColumn,filtered,marketVisible,setMarketVisible,sort,sortBy,loading,onSelect:selectItem,toggleWatch,watch}} clearFilters={()=>setConditions([])} compact={false}/></>}
      {tab === "screener" && <><Hero updated={updated} simple/><MarketView {...{search,setSearch,clearSearch,conditions,filterOpen,setFilterOpen,addCondition,updateCondition,removeCondition,profiles,setProfiles,profileOpen,setProfileOpen,profileName,setProfileName,saveProfile,loadProfile,columns,setColumns,columnOptions,columnMenuOpen,setColumnMenuOpen,toggleColumn,moveColumn,filtered,marketVisible,setMarketVisible,sort,sortBy,loading,onSelect:selectItem,toggleWatch,watch}} clearFilters={()=>setConditions([])} compact/></>}
      {tab === "movers" && <Movers movers={movers} onSelect={selectItem} filters={{moverMinPrice,setMoverMinPrice,moverMaxPrice,setMoverMaxPrice,moverMinVolume,setMoverMinVolume,moverMaxVolume,setMoverMaxVolume}}/>}
      {tab === "recipes" && <Recipes items={items}/>} 
      {tab === "moneymakers" && <MoneyMakers/>}
      {tab === "analysis" && <Analysis items={items} onSelect={(x)=>selectItem(x,"24h",true)}/>} 
      {tab === "watch" && <Watch watched={watched} changes={watchChanges} onSelect={selectItem} toggleWatch={toggleWatch}/>} 
      {tab === "alerts" && <Alerts alerts={activeAlerts} all={alerts} rules={alertRules} setRules={setAlertRules} setAlerts={setAlerts} open={()=>setRuleModal(true)} openItem={openAlertItem}/>} 
    </main>

    {toast&&<div className="toast" onClick={()=>toast.itemId&&openAlertItem(toast.itemId)}><span className="toastIcon"><Bell size={15}/></span><div><strong>{toast.message}</strong><small>Click to view</small></div><button onClick={e=>{e.stopPropagation();setToast(null)}}><X size={15}/></button></div>}
    {selected&&<ItemPanel item={selected} history={history[selected.id]||{}} watch={watch} toggleWatch={toggleWatch} close={()=>setSelected(null)} selectRange={range=>selectItem(selected,range,selectedCenter)} center={selectedCenter}/>} 
    {ruleModal&&<RuleModal items={items} onClose={()=>setRuleModal(false)} onSave={rule=>{if(alertRules.length>=20){notify("You can have up to 20 alert rules.");return;}const next=[...alertRules,{...rule,lastTriggered:0}];setAlertRules(next);localStorage.setItem("osrsflipit-rules",JSON.stringify(next));setRuleModal(false)}}/>}
    {accountOpen&&<AccountModal onClose={()=>setAccountOpen(false)}/>} 
  </div>;
}

function Hero({updated,simple}) { return <section className="hero"><div><div className="eyebrow">GRAND EXCHANGE ANALYTICS</div><h1>{simple?"A bigger view of the market.":<>Find the flip.<br/><em>Keep the profit.</em></>}</h1><p>Live market data, tax-aware margins and clean analytics for OSRS.</p></div><div className="status"><span className="dot"/>Live <small>{updated?`· ${Math.max(0,Math.round((Date.now()-updated)/1000))}s ago`:""}</small></div></section>; }

function MarketView(p) {
  const {search,setSearch,clearSearch,conditions,filterOpen,setFilterOpen,addCondition,updateCondition,removeCondition,profiles,setProfiles,profileOpen,setProfileOpen,profileName,setProfileName,saveProfile,loadProfile,columns,columnOptions,columnMenuOpen,setColumnMenuOpen,toggleColumn,moveColumn,filtered,marketVisible,setMarketVisible,sort,sortBy,loading,onSelect,toggleWatch,watch,compact}=p;
  return <section className={compact?"screenerSection":""}><div className="toolbar"><div className="search"><Search size={18}/><input value={search} onChange={e=>{setSearch(e.target.value);setMarketVisible(30)}} placeholder="Search items…"/>{search&&<button className="clearSearch" onClick={clearSearch}><X size={17}/></button>}</div><div className="chips"><span>After GE tax</span><span>Live prices</span><span>10k / 250k / 1.5m input supported</span></div></div>
    <div className="filterbar"><button className={`filterButton ${conditions.length?"hasFilters":""}`} onClick={()=>setFilterOpen(v=>!v)}><SlidersHorizontal size={16}/> Match all filters {conditions.length?`(${conditions.length})`:""}<ChevronDown size={14}/></button><div className="filterActions">
      <ColumnMenu {...{columns,columnOptions,columnMenuOpen,setColumnMenuOpen,toggleColumn,moveColumn,setColumns}}/>
      <ProfileMenu {...{profiles,setProfiles,profileOpen,setProfileOpen,profileName,setProfileName,saveProfile,loadProfile}}/>
    </div></div>
    {filterOpen&&<FilterBuilder conditions={conditions} add={addCondition} update={updateCondition} remove={removeCondition} clear={()=>p.setConditions?.([])}/>} 
    <div className="tablewrap"><table><thead><tr><th>#</th><th>Item</th>{columns.map(key=><DraggableTh key={key} t={key} label={columnOptions.find(x=>x[0]===key)?.[1]||key} sort={sort} on={sortBy} moveColumn={moveColumn}/>) }<th></th></tr></thead><tbody>{filtered.slice(0,marketVisible).map((x,i)=><tr key={x.id} onClick={()=>onSelect(x)}><td>{String(i+1).padStart(2,"0")}</td><td><div className="item"><img src={iconUrl(x.icon)}/><div><strong>{x.name}</strong><small>{x.members?"Members":"F2P"}</small></div></div></td>{columns.map(key=><td key={key}>{key==="buy"&&<><strong>{money(x.buy)}</strong><span className="instantLabel">Insta buy</span></>}{key==="sell"&&<><strong>{money(x.sell)}</strong><span className="instantLabel">Insta sell</span></>}{key==="margin"&&<strong className={x.margin>=0?"green":"redtxt"}>{money(x.margin)}</strong>}{key==="roi"&&<strong className={x.roi>=0?"green":"redtxt"}>{pct(x.roi)}</strong>}{key==="volume"&&num(x.volume)}{key==="limit"&&num(x.limit)}{key==="potentialProfit"&&<strong className={x.potentialProfit>=0?"green":"redtxt"}>{money(x.potentialProfit)}</strong>}{key==="updated"&&<span className="lastUpdate">{x.lastUpdated?`${Math.max(0,Math.round((Date.now()-x.lastUpdated)/1000))}s ago`:"—"}</span>}</td>)}<td><button className={`star ${watch.includes(x.id)?"on":""}`} onClick={e=>{e.stopPropagation();toggleWatch(x.id)}}><Star size={16} fill={watch.includes(x.id)?"currentColor":"none"}/></button></td></tr>)}{!loading&&!filtered.length&&<tr><td colSpan={columns.length+3} className="empty">No items match those filters.</td></tr>}</tbody></table></div>
    {marketVisible<filtered.length&&<button className="loadMore" onClick={()=>setMarketVisible(v=>v+30)}>Load More <span>{filtered.length-marketVisible} more</span></button>}
  </section>;
}

function ColumnMenu({columns,columnOptions,columnMenuOpen,setColumnMenuOpen,toggleColumn,moveColumn,setColumns}) { return <div className="columnControls"><button className="secondary" onClick={()=>setColumnMenuOpen(v=>!v)}><SlidersHorizontal size={15}/> Columns <ChevronDown size={13}/></button>{columnMenuOpen&&<div className="columnMenu" onClick={e=>e.stopPropagation()}><div className="columnMenuHead"><strong>Columns</strong><button onClick={()=>setColumns(columnOptions.map(x=>x[0]))}><RotateCcw size={13}/> Reset</button></div>{columnOptions.map(([key,label])=><label key={key} draggable onDragStart={()=>window.__dragColumn=key} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(window.__dragColumn)moveColumn(window.__dragColumn,key);window.__dragColumn=null}}><input type="checkbox" checked={columns.includes(key)} onChange={()=>toggleColumn(key)}/><span>{label}</span><GripVertical size={13}/></label>)}<small>Tick to show. Drag rows to reorder. Reset returns to the basic columns.</small></div>}</div>; }
function ProfileMenu({profiles,setProfiles,profileOpen,setProfileOpen,profileName,setProfileName,saveProfile,loadProfile}) { return <div className="profileControls"><button className="secondary" onClick={()=>setProfileOpen(v=>!v)}><Save size={15}/> Profiles</button>{profileOpen&&<div className="profileMenu" onClick={e=>e.stopPropagation()}><div className="profileTitle"><strong>Filter profiles</strong><button onClick={()=>setProfileOpen(false)}><X size={14}/></button></div><div className="profileSave"><input value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder="e.g. High profit flips"/><button onClick={saveProfile}><Save size={14}/></button></div>{profiles.length?profiles.map(p=><div className="profileRow" key={p.name}><button onClick={()=>loadProfile(p.name)}><strong>{p.name}</strong><small>{Array.isArray(p.conditions)?p.conditions.length:0} filters</small></button><button onClick={()=>setProfiles(profiles.filter(x=>x.name!==p.name))}><Trash2 size={14}/></button></div>):<div className="profileEmpty">No saved profiles yet.</div>}</div>}</div>; }
function DraggableTh({t,label,sort,on,moveColumn}) { return <th draggable onDragStart={()=>window.__dragColumn=t} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(window.__dragColumn)moveColumn(window.__dragColumn,t);window.__dragColumn=null}}><button className="thbtn" onClick={()=>on(t)}>{label}<ArrowUpDown size={13}/>{sort.key===t&&<span>{sort.dir==="desc"?"↓":"↑"}</span>}</button></th>; }
function FilterBuilder({conditions,add,update,remove,clear}) { return <div className="filterPanel"><div className="filterHeader"><div><strong>Match all filters</strong><small>Use k/m/b values, e.g. 50k, 1m or 2.5b.</small></div><div><button className="secondary" onClick={clear}>Clear</button><button className="primary small" onClick={add}><Plus size={14}/> Add filter</button></div></div>{!conditions.length&&<div className="filterEmpty"><Filter size={17}/> Add a filter such as <b>Margin ≥ 50k</b> and <b>Profit / limit ≥ 1m</b>.</div>}{conditions.map(c=><div className="condition" key={c.id}><select value={c.field} onChange={e=>update(c.id,{field:e.target.value})}>{FIELD_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select value={c.op} onChange={e=>update(c.id,{op:e.target.value})}>{OP_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><input value={c.value} onChange={e=>update(c.id,{value:e.target.value})} placeholder="50k / 1m"/><span>{c.field==="roi"?"%":"gp / items"}</span><button className="dangerIcon" onClick={()=>remove(c.id)}><Trash2 size={15}/></button></div>)}</div>; }

function Movers({movers,onSelect,filters}) { return <section><div className="sectionhead"><div><div className="eyebrow">MARKET MOVERS</div><h2>What moved.</h2></div><p>Top 50 current spread movers, with price and volume filters.</p></div><div className="moverFilters"><label>Min price<input value={filters.moverMinPrice} onChange={e=>filters.setMoverMinPrice(e.target.value)} placeholder="0 / 50k"/></label><label>Max price<input value={filters.moverMaxPrice} onChange={e=>filters.setMoverMaxPrice(e.target.value)} placeholder="Any"/></label><label>Min volume<input value={filters.moverMinVolume} onChange={e=>filters.setMoverMinVolume(e.target.value)} placeholder="0"/></label><label>Max volume<input value={filters.moverMaxVolume} onChange={e=>filters.setMoverMaxVolume(e.target.value)} placeholder="Any"/></label></div><div className="movegrid"><MoveCol title="Rising" icon={<TrendingUp/>} rows={movers.up} onSelect={onSelect}/><MoveCol title="Falling" icon={<TrendingDown/>} rows={movers.down} onSelect={onSelect}/></div></section>; }
function MoveCol({title,icon,rows,onSelect}) { return <div className="movecol"><div className="movetitle">{icon}<strong>{title}</strong><span>Top 50</span></div>{rows.map((x,i)=><button className="moverow" key={x.id} onClick={()=>onSelect(x)}><span className="rank">{String(i+1).padStart(2,"0")}</span><img className="itemIcon" src={iconUrl(x.icon)}/><span className="mname"><strong>{x.name}</strong><small>{money(x.sell)} · {num(x.volume)}/h</small></span><b className={x.change>=0?"green":"redtxt"}>{pct(x.change)}</b><ChevronRight size={15}/></button>)}</div>; }

function WatchTicker({watched,changes,onSelect}) { return <div className="watchTicker"><div className="tickerLabel"><BarChart3 size={13}/> WATCHING</div><div className="tickerTrack">{[...watched,...watched].map((x,i)=>{const c=changes[x.id];return <button key={`${x.id}-${i}`} onClick={()=>onSelect(x)}><img src={iconUrl(x.icon)}/><strong>{x.name}</strong><span className={c>=0?"green":"redtxt"}>{c==null?"—":`${c>=0?"↑":"↓"} ${Math.abs(c).toFixed(2)}%`}</span></button>})}</div></div>; }

function Watch({watched,changes,onSelect,toggleWatch}) { return <section><div className="sectionhead"><div><div className="eyebrow">WATCHLIST</div><h2>Your items.</h2></div><p>{watched.length}/100 saved locally. 24h ticker changes are loaded for watched items.</p></div><div className="cards">{watched.length?watched.map(x=><button className="watchcard" key={x.id} onClick={()=>onSelect(x)}><img className="itemIcon bigIcon" src={iconUrl(x.icon)}/><div><strong>{x.name}</strong><small>{money(x.buy)} → {money(x.sell)}</small></div><b className={changes[x.id]>=0?"green":"redtxt"}>{changes[x.id]==null?"—":pct(changes[x.id])}</b><span onClick={e=>{e.stopPropagation();toggleWatch(x.id)}}><X size={16}/></span></button>):<div className="emptybox">Star items in the market table to keep them here.</div>}</div></section>; }

function Alerts({alerts,all,rules,setRules,setAlerts,open,openItem}) { return <section><div className="sectionhead"><div><div className="eyebrow">PRICE ALERTS</div><h2>Stay ahead of the move.</h2></div><button className="primary" onClick={open}>+ New alert</button></div><div className="alertintro"><Bell size={19}/><div><strong>20 alert rules max</strong><p>Click an alert to open its graph. Escape closes popups.</p></div></div><div className="rulelist">{rules.map((r,i)=><div className="rule" key={i}><span className="ruleicon"><Bell size={15}/></span><div><strong>{r.name||`Item #${r.id}`}</strong><small>{r.metric} {r.direction} {num(r.value)}{r.metric==="roi"?"%":" gp"}</small></div><button onClick={()=>setRules(rules.filter((_,j)=>j!==i))}><X size={16}/></button></div>)}</div><h3 className="historytitle">Recent notifications</h3>{all.length?<div className="notificationlist">{all.map(a=><button className="notification" key={a.id} onClick={()=>openItem(a.itemId)}><span className="ndot"/><div><strong>{a.name}</strong><small>{a.metric} hit {num(a.target)}{a.metric==="roi"?"%":" gp"} · {new Date(a.at).toLocaleString()}</small></div><ChevronRight size={15}/></button>)}</div>:<div className="emptybox">No alerts yet.</div>}<button className="clear" onClick={()=>setAlerts([])}>Clear all notifications</button></section>; }
function NotificationPopover({alerts,clear,openItem,close}) { return <div className="notificationPopover"><div className="popoverHead"><strong>Notifications</strong><button onClick={close}><X size={16}/></button></div>{alerts.length?<div className="popoverList">{alerts.slice(0,10).map(a=><button key={a.id} onClick={()=>{openItem(a.itemId);close()}}><span className="ndot"/><div><strong>{a.name}</strong><small>{a.metric} hit {num(a.target)}</small></div></button>)}</div>:<div className="popoverEmpty"><Check size={17}/> You're all caught up.</div>}{alerts.length>0&&<button className="clearPopover" onClick={clear}>Clear all notifications</button>}</div>; }
function RuleModal({items,onClose,onSave}) { const [q,setQ]=useState("");const [id,setId]=useState(items[0]?.id);const [metric,setMetric]=useState("sell");const [direction,setDirection]=useState("above");const [value,setValue]=useState("100k");const found=items.filter(x=>x.name.toLowerCase().includes(q.toLowerCase())).slice(0,7);return <div className="modalback"><div className="modal"><button className="close" onClick={onClose}><X/></button><div className="eyebrow">NEW ALERT</div><h2>Watch a price.</h2><label>Item</label><input value={q} onChange={e=>{setQ(e.target.value);const f=items.find(x=>x.name.toLowerCase().includes(e.target.value.toLowerCase()));if(f)setId(f.id)}} placeholder="Search item…"/>{q&&<div className="suggest">{found.map(x=><button key={x.id} onClick={()=>{setId(x.id);setQ(x.name)}}>{x.name}</button>)}</div>}<div className="twocol"><div><label>Metric</label><select value={metric} onChange={e=>setMetric(e.target.value)}><option value="sell">Sell price</option><option value="buy">Buy price</option><option value="margin">Margin</option><option value="roi">ROI</option></select></div><div><label>Condition</label><select value={direction} onChange={e=>setDirection(e.target.value)}><option value="above">rises above</option><option value="below">drops below</option></select></div></div><label>Threshold</label><input value={value} onChange={e=>setValue(e.target.value)} placeholder="100k"/><button className="primary wide" onClick={()=>{const x=items.find(x=>x.id===id);onSave({id,name:x?.name||"Unknown",metric,direction,value:parseOSRSNumber(value)})}}>Create alert</button></div></div>; }

function ChartTooltip({active,payload,label}) { if(!active||!payload?.length)return null;return <div className="chartTooltip"><strong>{localTime(label,{weekday:"short",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})}</strong>{payload.map(p=><div key={p.dataKey}><span className={`legendDot ${p.dataKey}`}/>{p.dataKey==="buy"?"Buy":"Sell"}: <b>{money(p.value)}</b></div>)}</div>; }

function ItemPanel({item,history,watch,toggleWatch,close,selectRange,center}) {
  const [range,setRange]=useState(item.chartRange||"24h"); const [zoom,setZoom]=useState(null); const [drag,setDrag]=useState(null); const pointers=useRef(new Map()); const pinch=useRef(null); const dragMoved=useRef(false);
  useEffect(()=>{if(!history[range])selectRange(range);setZoom(null)},[range,item.id]);
  const fullData=history[range]||[]; const window=zoom||[0,Math.max(0,fullData.length-1)]; const data=fullData.slice(window[0],window[1]+1); const vals=data.flatMap(p=>[p.buy,p.sell]).filter(v=>v!=null);const min=vals.length?Math.min(...vals):0,max=vals.length?Math.max(...vals):1,pad=Math.max((max-min)*0.09,Math.max(max*.004,10)),domain=[Math.max(0,min-pad),max+pad];
  const labels={"24h":"24 hours","48h":"48 hours","7d":"1 week","30d":"1 month","6m":"6 months"};
  const zoomAround=(factor,ratio=.5)=>{if(fullData.length<8)return;const cur=zoom||[0,fullData.length-1],size=cur[1]-cur[0]+1,next=Math.max(8,Math.min(fullData.length,Math.round(size*factor))),centerIndex=cur[0]+Math.round(size*ratio);let a=Math.max(0,centerIndex-Math.round(next*ratio)),b=Math.min(fullData.length-1,a+next-1);if(b-a+1<next)a=Math.max(0,b-next+1);setZoom(next>=fullData.length-1?null:[a,b]);};
  const panBy=(pixels)=>{if(!zoom||fullData.length<2)return;const span=zoom[1]-zoom[0]+1;const shift=Math.round(pixels/700*span);let a=Math.max(0,zoom[0]-shift),b=Math.min(fullData.length-1,a+span-1);if(b-a+1<span)a=Math.max(0,b-span+1);setZoom([a,b]);};
  const onPointerDown=e=>{if(e.pointerType==="mouse"&&e.button!==0)return;e.currentTarget.setPointerCapture?.(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size===2){const [a,b]=[...pointers.current.values()];pinch.current={dist:Math.hypot(a.x-b.x,a.y-b.y),size:(zoom||[0,fullData.length-1])[1]-(zoom||[0,fullData.length-1])[0]+1,centerX:(a.x+b.x)/2};setDrag(null);return}setDrag({x:e.clientX,pointers:e.pointerId});dragMoved.current=false};
  const onPointerMove=e=>{if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size===2&&pinch.current){const [a,b]=[...pointers.current.values()];const dist=Math.hypot(a.x-b.x,a.y-b.y);const factor=Math.max(.5,Math.min(2,pinch.current.dist/Math.max(1,dist)));const desired=Math.max(8,Math.min(fullData.length,Math.round(pinch.current.size*factor)));const cur=zoom||[0,fullData.length-1];const center=Math.round((cur[0]+cur[1])/2);let aa=Math.max(0,center-Math.floor(desired/2)),bb=Math.min(fullData.length-1,aa+desired-1);if(bb-aa+1<desired)aa=Math.max(0,bb-desired+1);setZoom(desired>=fullData.length-1?null:[aa,bb]);e.preventDefault?.();return}if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(dx)>3)dragMoved.current=true;if(Math.abs(dx)>8){panBy(dx);setDrag({x:e.clientX,pointers:e.pointerId})}};
  const onPointerUp=e=>{pointers.current.delete(e.pointerId);if(pointers.current.size<2)pinch.current=null;setDrag(null)};
  return <div className={center?"centerModalBack":"drawerback"} onClick={close}><aside className={center?"itemModal drawer":"drawer"} onClick={e=>e.stopPropagation()}><button className="close" onClick={close}><X/></button><div className="eyebrow">ITEM ANALYTICS</div><div className="itemtitle"><div className="itemHeading"><img className="titleIcon" src={iconUrl(item.icon)}/><div><h2>{item.name}</h2><p>Grand Exchange · {item.members?"Members":"Free-to-play"}</p></div></div><button className={`star big ${watch.includes(item.id)?"on":""}`} onClick={()=>toggleWatch(item.id)}><Star fill={watch.includes(item.id)?"currentColor":"none"}/></button></div><div className="panelstats"><Stat label="Buy" value={money(item.buy)}/><Stat label="Sell" value={money(item.sell)}/><Stat label="Margin" value={money(item.margin)}/><Stat label="ROI" value={pct(item.roi)}/></div><div className="detailgrid topDetails"><div><span>Max buy limit</span><strong>{num(item.limit)} per 4 hours</strong></div><div><span>1h volume</span><strong>{num(item.volume)}</strong></div><div><span>GE tax</span><strong>{money(item.tax)}</strong></div><div><span>Profit per limit</span><strong>{money(item.potentialProfit)}</strong></div></div><div className="chartbox"><div className="charthead"><div><strong>Price history</strong><small>Buy = red · Sell = {document.documentElement.dataset.theme==="dark"?"white":"black"} · local time</small></div><span>{labels[range]}</span></div><div className="rangeButtons">{Object.entries(labels).map(([k,v])=><button key={k} className={range===k?"active":""} onClick={()=>{setRange(k);selectRange(k)}}>{v}</button>)}<button onClick={()=>setZoom(null)} className="zoomReset"><RotateCcw size={11}/> Reset zoom</button></div>{data.length?<div className="chartTouch" onWheel={e=>{e.preventDefault();zoomAround(e.deltaY<0?.62:1.55,e.offsetX/Math.max(1,e.currentTarget.clientWidth))}} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}><ResponsiveContainer width="100%" height={420}><LineChart data={data} margin={{top:20,right:18,left:4,bottom:12}}><CartesianGrid strokeDasharray="1 5" vertical horizontal opacity={0.42}/><XAxis dataKey="timestamp" type="number" domain={['dataMin','dataMax']} tickFormatter={t=>localTime(t,{hour:"2-digit",minute:"2-digit"})} tick={{fontSize:10}} minTickGap={42}/><YAxis domain={domain} tickFormatter={v=>compactGP(v)} tick={{fontSize:10}} width={58} tickCount={10}/><ReferenceLine y={item.sell} stroke="#888" strokeDasharray="3 4" opacity={0.25}/><Tooltip content={<ChartTooltip/>}/><Line type="monotone" dataKey="buy" name="Buy" stroke="#d43c3c" strokeWidth={2.5} dot={{r:2,strokeWidth:0}} activeDot={{r:5}} connectNulls/><Line type="monotone" dataKey="sell" name="Sell" stroke={document.documentElement.dataset.theme==="dark"?"#f4f6f8":"#17191d"} strokeWidth={2.5} dot={{r:2,strokeWidth:0}} activeDot={{r:5}} connectNulls/></LineChart></ResponsiveContainer></div>:<div className="chartloading">Loading history…</div>}</div><div className="chartNote"><MousePointer2 size={15}/><span>Scroll to zoom around the cursor. Drag with left click to pan. On mobile, drag with one finger and pinch with two fingers. Points are kept at the API's 5-minute resolution where available.</span></div><a className="wikiLink" href={`https://prices.runescape.wiki/osrs/item/${item.id}`} target="_blank" rel="noreferrer">Open OSRS Wiki price page <ExternalLink size={14}/></a></aside></div>;
}

function Stat({label,value}){return <div className="stat"><small>{label}</small><strong>{value}</strong></div>;}

function Recipes({items}) {
  const [category,setCategory]=useState("All"),[sort,setSort]=useState("hour"),[q,setQ]=useState(""),[fav,setFav]=useState(()=>safeJSON("osrsflipit-recipe-favs",[]));
  const map=useMemo(()=>Object.fromEntries(items.map(x=>[x.name.toLowerCase(),x])),[items]);
  const rows=useMemo(()=>recipeDefinitions.map((r,i)=>{const input=map[r.input.toLowerCase()],output=map[r.output.toLowerCase()];if(!input||!output)return {...r,id:i,available:false,profit:null,gpHour:null};let profit=(output.sell-taxFor(output.sell))*r.qty-input.buy*r.qty; if(r.output==="Coins")profit=1_000_000-input.buy; const hour=profit>0?profit*(3600/r.seconds):profit*(3600/r.seconds);return {...r,id:i,available:true,profit,gpHour:hour,inputPrice:input.buy,outputPrice:output.sell,inputIcon:input.icon,outputIcon:output.icon};}).filter(r=>(category==="All"||r.category===category)&&r.name.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>(b[sort==="profit"?"profit":"gpHour"]??-Infinity)-(a[sort==="profit"?"profit":"gpHour"]??-Infinity)),[map,category,sort,q]);
  const categories=["All",...new Set(recipeDefinitions.map(x=>x.category))];
  function toggle(id){setFav(x=>{const n=x.includes(id)?x.filter(a=>a!==id):[...x,id];localStorage.setItem("osrsflipit-recipe-favs",JSON.stringify(n));return n})}
  return <section><div className="sectionhead"><div><div className="eyebrow">RECIPES</div><h2>Profit from every action.</h2></div><p>Live GE prices are used where the recipe's item names match the current market mapping. Rates are estimates, not guarantees.</p></div><div className="recipeTools"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search herbs, alching, fletching…"/><select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(x=><option key={x}>{x}</option>)}</select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="hour">Highest gp/hour</option><option value="profit">Highest gp/recipe</option></select></div><div className="recipeGrid">{rows.map(r=><button className={`recipeCard ${!r.available?"muted":""}`} key={r.id} onClick={()=>toggle(r.id)}><div className="recipeTop"><span>{r.category}</span><Star size={16} fill={fav.includes(r.id)?"currentColor":"none"}/></div><h3>{r.name}</h3><div className="recipeFlow"><span>{r.input}</span><ChevronRight size={14}/><span>{r.output}</span></div><div className="recipeStats"><div><small>GP / recipe</small><strong>{r.available?money(r.profit):"Waiting for prices"}</strong></div><div><small>GP / hour</small><strong>{r.available?money(r.gpHour):"—"}</strong></div></div>{r.available&&<small className="recipePrices">Buy {money(r.inputPrice)} · Sell {money(r.outputPrice)} · after GE costs</small>}</button>)}</div><div className="sourceNote"><BookOpen size={15}/> Recipe catalogue is intentionally structured so more Wiki-style recipes can be added without changing the market engine. <a href="https://oldschool.runescape.wiki/w/Money_making_guide" target="_blank" rel="noreferrer">OSRS Wiki money-making source</a></div></section>;
}

function MoneyMakers(){
  const [sort,setSort]=useState("gpHour"),[category,setCategory]=useState("All"),[members,setMembers]=useState("All"),[selected,setSelected]=useState(null),[wikiRows,setWikiRows]=useState(()=>safeJSON("osrsflipit-money-snapshot",[])),[source,setSource]=useState("cached");
  useEffect(()=>{
    const cachedAt=Number(localStorage.getItem("osrsflipit-money-snapshot-time")||0);
    if(Date.now()-cachedAt<24*60*60*1000 && wikiRows.length)return;
    let cancelled=false;
    fetch("https://oldschool.runescape.wiki/api.php?action=parse&page=Money_making_guide&prop=text&format=json&origin=*").then(r=>r.json()).then(json=>{
      if(cancelled)return;
      const html=json?.parse?.text?.["*"]; if(!html)return;
      const doc=new DOMParser().parseFromString(html,"text/html");
      const found=[];
      doc.querySelectorAll("table").forEach((table,ti)=>{
        const headers=[...table.querySelectorAll("tr:first-child th, tr:first-child td")].map(x=>x.textContent.trim().toLowerCase());
        if(!headers.some(x=>x.includes("hourly profit"))||!headers.some(x=>x.includes("method")))return;
        table.querySelectorAll("tr").forEach((tr,i)=>{
          if(i===0)return; const cells=[...tr.querySelectorAll("td")].map(x=>x.textContent.replace(/\s+/g," ").trim()); if(cells.length<4)return;
          const name=cells[0], gp=Number(cells[1].replace(/[^0-9.-]/g,"")); if(!name||!Number.isFinite(gp))return;
          found.push({id:`wiki-${ti}-${i}`,name,gpHour:gp,requirements:cells[2]||"See guide",category:cells[3]||"Other",intensity:cells[4]||"—",members:!!cells[5]&&/yes|members/i.test(cells[5]),description:"Estimated hourly profit from the OSRS Wiki. Actual profit varies with GE prices, supply, speed and player efficiency."});
        });
      });
      if(found.length){localStorage.setItem("osrsflipit-money-snapshot",JSON.stringify(found));localStorage.setItem("osrsflipit-money-snapshot-time",String(Date.now()));setWikiRows(found);setSource("live");}
    }).catch(()=>setSource("seed"));
    return()=>{cancelled=true};
  },[]);
  const allRows=wikiRows.length?wikiRows:moneyMakerSeed;
  const cats=["All",...new Set(allRows.map(x=>String(x.category||"Other").split("/")[0]))];
  const rows=allRows.filter(x=>(category==="All"||String(x.category).startsWith(category))&&(members==="All"||(members==="Members"?x.members:!x.members))).sort((a,b)=>sort==="gpHour"?b.gpHour-a.gpHour:String(a.intensity).localeCompare(String(b.intensity)));
  return <section><div className="sectionhead"><div><div className="eyebrow">MONEY MAKERS</div><h2>Ways to make GP.</h2></div><p>Every hourly-profit table available from the OSRS Wiki is cached for up to 24 hours, so the site does not repeatedly request the guide. Actual profit can vary with GE prices, supply, speed and player efficiency.</p></div><div className="moneyTools"><select value={category} onChange={e=>setCategory(e.target.value)}>{cats.map(x=><option key={x}>{x}</option>)}</select><select value={members} onChange={e=>setMembers(e.target.value)}><option>All</option><option>Members</option><option>F2P</option></select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="gpHour">Highest GP/hour</option><option value="intensity">Intensity</option></select><span><Clock3 size={14}/> {source==="live"?"Wiki snapshot refreshed":source==="cached"?"Cached daily snapshot":"Fallback snapshot"}</span></div><div className="moneyTable"><div className="moneyHead"><span>#</span><span>Method</span><span>GP/hour</span><span>Requirements</span><span>Members</span><span>Intensity</span></div>{rows.map((x,i)=><button className="moneyRow" key={x.id} onClick={()=>setSelected(x)}><span>{String(i+1).padStart(2,"0")}</span><strong>{x.name}<small>{x.category}</small></strong><b>{money(x.gpHour)}</b><span>{x.requirements}</span><span className={x.members?"memberBadge":"f2pBadge"}>{x.members?"Members":"F2P"}</span><span>{x.intensity}</span></button>)}</div><div className="sourceNote"><Sparkles size={15}/> The Wiki warns that current GE prices, buy limits and processing speed can make actual profits differ. <a href="https://oldschool.runescape.wiki/w/Money_making_guide" target="_blank" rel="noreferrer">Open Money making guide</a></div>{selected&&<div className="miniModalBack" onClick={()=>setSelected(null)}><div className="moneyDetail" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setSelected(null)}><X/></button><div className="eyebrow">MONEY MAKER</div><h2>{selected.name}</h2><div className="moneyDetailStats"><Stat label="Estimated GP/hour" value={money(selected.gpHour)}/><Stat label="Difficulty" value={selected.intensity}/><Stat label="Members" value={selected.members?"Yes":"No"}/></div><h3>Requirements</h3><p>{selected.requirements}</p><h3>What to expect</h3><p>{selected.description}</p><small>Do not treat the displayed GP/hour as guaranteed income.</small></div></div>}</section>;
}

function Analysis({items,onSelect}){
  const data=useMemo(()=>{const valid=items.filter(x=>x.buy>0&&x.sell>0);return {gainers:[...valid].sort((a,b)=>b.roi-a.roi).slice(0,8),losers:[...valid].sort((a,b)=>a.roi-b.roi).slice(0,8),volume:[...valid].sort((a,b)=>b.volume-a.volume).slice(0,8),margin:[...valid].sort((a,b)=>b.margin-a.margin).slice(0,8),roi:[...valid].sort((a,b)=>b.roi-a.roi).slice(0,8),taxFree:[...valid].sort((a,b)=>b.grossMargin-a.grossMargin).slice(0,8),limit:[...valid].sort((a,b)=>b.potentialProfit-a.potentialProfit).slice(0,8)}},[items]);
  const Card=({title,subtitle,rows,metric,red})=><div className="analysisCard"><div className="analysisCardHead"><div><strong>{title}</strong><small>{subtitle}</small></div><BarChart3 size={16}/></div>{rows.map((x,i)=><button key={x.id} onClick={()=>onSelect(x)}><span>{i+1}</span><img src={iconUrl(x.icon)}/><strong>{x.name}</strong><b className={red?"redtxt":"green"}>{metric(x)}</b><ChevronRight size={13}/></button>)}</div>;
  return <section><div className="sectionhead"><div><div className="eyebrow">MARKET ANALYSIS</div><h2>What the market is doing.</h2></div><p>Highlight cards inspired by flipping dashboards: gainers, losers, volume, margins, ROI, gross/tax-free spread and limit profit.</p></div><div className="analysisGrid"><Card title="Biggest gainers" subtitle="Highest current spread ROI" rows={data.gainers} metric={x=>pct(x.roi)}/><Card title="Biggest losers" subtitle="Lowest current spread ROI" rows={data.losers} metric={x=>pct(x.roi)} red/><Card title="Volume leaders" subtitle="1h traded volume" rows={data.volume} metric={x=>num(x.volume)}/><Card title="Best margins" subtitle="After 2% GE tax" rows={data.margin} metric={x=>money(x.margin)}/><Card title="Best ROI" subtitle="Margin versus buy price" rows={data.roi} metric={x=>pct(x.roi)}/><Card title="Tax-free spread" subtitle="Gross spread before GE tax" rows={data.taxFree} metric={x=>money(x.grossMargin)}/><Card title="Profit per limit" subtitle="Margin × current buy limit" rows={data.limit} metric={x=>money(x.potentialProfit)}/></div></section>;
}

function AccountModal({onClose}){const [mode,setMode]=useState("email");return <div className="modalback"><div className="modal accountModal"><button className="close" onClick={onClose}><X/></button><div className="eyebrow">OSRSFLIPIT ACCOUNT</div><h2>Keep your setup everywhere.</h2><p className="accountLead">The interface is prepared for Supabase authentication. To make real Google/Discord/email/mobile accounts work across devices, connect Supabase and enable the providers.</p><div className="accountButtons"><button className="accountProvider">Continue with Google</button><button className="accountProvider">Continue with Discord</button></div><div className="accountDivider"><span>or</span></div><div className="accountTabs"><button className={mode==="email"?"active":""} onClick={()=>setMode("email")}>Email</button><button className={mode==="phone"?"active":""} onClick={()=>setMode("phone")}>Mobile</button></div><input placeholder={mode==="email"?"you@example.com":"+44 7…"}/><button className="primary wide">Send {mode==="email"?"magic link":"OTP"}</button><div className="accountSaved"><strong>Would sync to the account</strong><span>Filter profiles</span><span>Market column order</span><span>Watchlist</span><span>Alerts and notifications</span></div></div></div>; }

createRoot(document.getElementById("root")).render(<AppErrorBoundary><App/></AppErrorBoundary>);
