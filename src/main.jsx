import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Search, Bell, Star, TrendingUp, TrendingDown, SlidersHorizontal, X,
  ArrowUpDown, ChevronRight, RefreshCw, Plus, Trash2, Save, Filter,
  Check, ChevronDown, ExternalLink, Moon, Sun, UserRound, GripVertical, RotateCcw
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, Tooltip, CartesianGrid, XAxis, YAxis
} from "recharts";
import "./styles.css";

const API = "https://prices.runescape.wiki/api/v1/osrs";
const TAX_RATE = 0.02;
const TAX_CAP = 5_000_000;
const REFRESH_MS = 60_000;

const money = n => n == null || Number.isNaN(Number(n)) ? "—" : Math.round(n).toLocaleString("en-GB") + " gp";
const num = n => n == null || Number.isNaN(Number(n)) ? "—" : Math.round(n).toLocaleString("en-GB");
const pct = n => n == null || Number.isNaN(Number(n)) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const taxFor = sell => Math.min(Math.floor((sell || 0) * TAX_RATE), TAX_CAP);


function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}
function parseGp(value) {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const s = String(value).trim().toLowerCase().replace(/,/g, "").replace(/\s+/g, "");
  const m = s.match(/^(-?[\d.]+)([kmb])?$/);
  if (!m) return Number(s.replace(/[^\d.-]/g, "")) || 0;
  const mult = m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : m[2] === "b" ? 1e9 : 1;
  return Math.round(Number(m[1]) * mult);
}
const gpInput = value => value == null ? "" : String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function enrich(row, mapping, hourly = {}) {
  const m = mapping[row.id] || {};
  const buy = row.low ?? 0;
  const sell = row.high ?? 0;
  const tax = taxFor(sell);
  const margin = sell - buy - tax;
  const volume = hourly[row.id]
    ? (hourly[row.id].highPriceVolume || 0) + (hourly[row.id].lowPriceVolume || 0)
    : 0;
  return {
    ...row, ...m, buy, sell, tax, margin,
    roi: buy ? margin / buy * 100 : 0,
    volume,
    potentialProfit: margin * (m.limit || 0),
    buyUpdated: row.highTime ? row.highTime * 1000 : null,
    sellUpdated: row.lowTime ? row.lowTime * 1000 : null,
    lastUpdated: Math.max(row.highTime || 0, row.lowTime || 0) * 1000 || null
  };
}

async function api(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { "User-Agent": "OSRSFlipIt/1.0 (Grand Exchange flipping analytics)" }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
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
  const [watch, setWatch] = useState(() => readStore("osrsflipit-watch", []));
  const [alerts, setAlerts] = useState(() => readStore("osrsflipit-alerts", []));
  const [alertRules, setAlertRules] = useState(() => readStore("osrsflipit-rules", []));
  const [profiles, setProfiles] = useState(() => readStore("osrsflipit-profiles", []).filter(p => p && typeof p.name === "string"));
  const [conditions, setConditions] = useState(() => readStore("osrsflipit-filters", []));
  const [selected, setSelected] = useState(null);
  const [ruleModal, setRuleModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [dark, setDark] = useState(() => localStorage.getItem("osrsflipit-theme") === "dark");
  const [accountOpen, setAccountOpen] = useState(false);
  const [columns, setColumns] = useState(() => readStore("osrsflipit-columns", ["buy","sell","margin","roi","volume","limit","potentialProfit","updated"]));
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [dragColumn, setDragColumn] = useState(null);
  const [clockZone, setClockZone] = useState(() => localStorage.getItem("osrsflipit-clock-zone") || "local");
  const [moverMinPrice, setMoverMinPrice] = useState("");
  const [moverMaxPrice, setMoverMaxPrice] = useState("");
  const [moverMinVolume, setMoverMinVolume] = useState("");
  const [moverMaxVolume, setMoverMaxVolume] = useState("");
  const [tickerPaused, setTickerPaused] = useState(false);
  const [recipeCategory, setRecipeCategory] = useState("All");
  const [recipeSort, setRecipeSort] = useState("gpHour");
  const [recipeFavourites, setRecipeFavourites] = useState(() => readStore("osrsflipit-recipe-favs", []));
  const [makerQuery, setMakerQuery] = useState("");
  const [makerMember, setMakerMember] = useState("all");
  const [makerDifficulty, setMakerDifficulty] = useState("all");
  const [makers, setMakers] = useState([]);
  const [makersUpdated, setMakersUpdated] = useState(null);
  const [screenerSearch, setScreenerSearch] = useState("");

  const toastTimer = useRef(null);

  const notify = (message, itemId = null) => {
    setToast({ message, itemId });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 15000);
  };

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; localStorage.setItem("osrsflipit-theme", dark ? "dark" : "light"); }, [dark]);
  useEffect(() => {
    const onKey = e => {
      if (e.key === "Escape") {
        setSelected(null); setRuleModal(false); setAccountOpen(false);
        setNotificationsOpen(false); setFilterOpen(false); setProfileOpen(false); setColumnMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => localStorage.setItem("osrsflipit-columns", JSON.stringify(columns)), [columns]);

  async function load() {
    setLoading(true);
    try {
      const [latest, map, hour] = await Promise.all([
        api("/latest"),
        api("/mapping"),
        api("/1h")
      ]);
      const mapObj = Object.fromEntries(map.map(x => [x.id, x]));
      const hourData = hour.data || {};
      const rows = Object.entries(latest.data || {})
        .map(([id, x]) => enrich({ id: +id, ...x }, mapObj, hourData))
        .filter(x => x.name && (x.buy > 0 || x.sell > 0));
      setItems(rows);
      setMapping(mapObj);
      setUpdated(new Date());
      checkRules(rows);
    } catch (e) {
      console.error(e);
      notify("Could not refresh OSRS prices. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  function checkRules(rows) {
    const now = Date.now();
    const fresh = [];
    const changedRules = alertRules.map(rule => {
      const item = rows.find(x => x.id === rule.id);
      if (!item) return rule;
      const value = rule.metric === "buy" ? item.buy
        : rule.metric === "sell" ? item.sell
        : rule.metric === "margin" ? item.margin
        : item.roi;
      const hit = rule.direction === "above" ? value >= rule.value : value <= rule.value;
      if (hit && now - (rule.lastTriggered || 0) > 10 * 60 * 1000) {
        fresh.push({
          id: crypto.randomUUID(), itemId: item.id, name: item.name,
          metric: rule.metric, value, target: rule.value, at: now
        });
        return { ...rule, lastTriggered: now };
      }
      return rule;
    });
    if (fresh.length) {
      const next = [...fresh, ...alerts].slice(0, 100);
      setAlerts(next);
      setAlertRules(changedRules);
      localStorage.setItem("osrsflipit-alerts", JSON.stringify(next));
      localStorage.setItem("osrsflipit-rules", JSON.stringify(changedRules));
      notify(`${fresh.length === 1 ? fresh[0].name : `${fresh.length} alerts`} triggered`, fresh[0]?.itemId);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => localStorage.setItem("osrsflipit-watch", JSON.stringify(watch)), [watch]);
  useEffect(() => localStorage.setItem("osrsflipit-recipe-favs", JSON.stringify(recipeFavourites)), [recipeFavourites]);
  useEffect(() => localStorage.setItem("osrsflipit-filters", JSON.stringify(conditions)), [conditions]);

  const globalMatches = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return q ? items.filter(x => x.name.toLowerCase().includes(q)).slice(0, 7) : [];
  }, [items, globalSearch]);

  function passesFilters(x) {
    return conditions.every(c => {
      const raw = x[c.field];
      const value = parseGp(c.value);
      if (c.field === "members") return c.value === "members" ? !!x.members : !x.members;
      if (raw == null) return false;
      if (c.op === "gt") return raw > value;
      if (c.op === "gte") return raw >= value;
      if (c.op === "eq") return raw === value;
      if (c.op === "lte") return raw <= value;
      return raw < value;
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = items.filter(x => x.name.toLowerCase().includes(q) && passesFilters(x));
    arr.sort((a, b) => {
      const av = a[sort.key] ?? 0, bv = b[sort.key] ?? 0;
      return (av - bv) * (sort.dir === "asc" ? 1 : -1);
    });
    return arr;
  }, [items, search, sort, conditions]);

  const movers = useMemo(() => {
    const minP = moverMinPrice === "" ? -Infinity : parseGp(moverMinPrice);
    const maxP = moverMaxPrice === "" ? Infinity : parseGp(moverMaxPrice);
    const minV = moverMinVolume === "" ? -Infinity : parseGp(moverMinVolume);
    const maxV = moverMaxVolume === "" ? Infinity : parseGp(moverMaxVolume);
    const calc = items
      .filter(x => x.buy > 0 && x.sell > 0 && x.sell >= minP && x.sell <= maxP && x.volume >= minV && x.volume <= maxV)
      .map(x => ({ ...x, change: ((x.sell - x.buy) / x.buy) * 100 }));
    return {
      up: [...calc].sort((a, b) => b.change - a.change).slice(0, 50),
      down: [...calc].sort((a, b) => a.change - b.change).slice(0, 50)
    };
  }, [items, moverMinPrice, moverMaxPrice, moverMinVolume, moverMaxVolume]);

  const watched = items.filter(x => watch.includes(x.id));
  const activeAlerts = alerts.filter(a => Date.now() - a.at < 60 * 60 * 1000);

  async function selectItem(item, range = "24h") {
    setSelected({ ...item, chartRange: range });
    if (history[item.id]?.[range]) return;
    const config = {
      "24h": { timestep: "5m", points: 288 },
      "48h": { timestep: "1h", points: 48 },
      "7d": { timestep: "1h", points: 168 },
      "30d": { timestep: "6h", points: 120 },
      "6m": { timestep: "24h", points: 180 }
    }[range];
    try {
      const res = await api(`/timeseries?timestep=${config.timestep}&id=${item.id}`);
      const data = (res.data || []).slice(-config.points).map(p => ({
        timestamp: p.timestamp * 1000,
        label: new Date(p.timestamp * 1000).toLocaleString("en-GB", {
          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
        }),
        buy: p.avgHighPrice ?? null,
        sell: p.avgLowPrice ?? null,
        buyVolume: p.highPriceVolume ?? 0,
        sellVolume: p.lowPriceVolume ?? 0
      })).filter(p => p.buy != null || p.sell != null);
      setHistory(h => ({ ...h, [item.id]: { ...(h[item.id] || {}), [range]: data } }));
    } catch (e) {
      console.error(e);
      notify("Could not load that chart.");
    }
  }

  function toggleWatch(id) {
    setWatch(w => w.includes(id) ? w.filter(x => x !== id) : w.length < 100 ? [...w, id] : w);
  }
  function sortBy(key) {
    setSort(s => s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" });
  }
  function clearSearch() { setSearch(""); setMarketVisible(30); }
  function goMarket() { setTab("market"); setSearch(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  useEffect(() => {
    if (tab !== "money") return;
    let cancelled = false;
    async function loadMoneyMakers() {
      try {
        const url = "https://oldschool.runescape.wiki/api.php?action=parse&page=Money_making_guide&prop=text&format=json&origin=*";
        const res = await fetch(url);
        const json = await res.json();
        const html = json?.parse?.text?.["*"] || "";
        const doc = new DOMParser().parseFromString(html, "text/html");
        const rows = [];
        doc.querySelectorAll("table").forEach(table => {
          table.querySelectorAll("tr").forEach(tr => {
            const cells = [...tr.querySelectorAll("th,td")].map(c => c.textContent.replace(/\s+/g," ").trim());
            if (cells.length >= 3 && cells.some(c => /gp\/h|gp per hour|profit/i.test(c))) rows.push(cells);
          });
        });
        const parsed = rows.slice(0, 250).map((r,i) => {
          const gpCell = r.find(x => /gp\/h|gp per hour|profit/i.test(x)) || r[r.length-1] || "";
          const nums = gpCell.match(/[\d,.]+(?:\s*[kmb])?/gi) || [];
          const gp = nums.length ? parseGp(nums[nums.length-1]) : 0;
          const text = r.join(" · ");
          return { id: i, name: r[0] || `Money maker ${i+1}`, requirement: r[1] || "See guide", gpHour: gp, members: /members/i.test(text), difficulty: /easy/i.test(text) ? "Easy" : /hard/i.test(text) ? "Hard" : "Medium", description: text };
        }).filter(x => x.name && x.name.length < 100);
        if (!cancelled && parsed.length) { setMakers(parsed); setMakersUpdated(new Date()); }
      } catch (e) {
        console.warn("Money making guide could not be refreshed", e);
      }
    }
    loadMoneyMakers();
    return () => { cancelled = true; };
  }, [tab]);


  function addCondition() {
    setConditions(c => [...c, { id: crypto.randomUUID(), field: "margin", op: "gte", value: 50000 }]);
  }
  function updateCondition(id, patch) {
    setConditions(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));
  }
  function removeCondition(id) {
    setConditions(cs => cs.filter(c => c.id !== id));
  }
  function saveProfile() {
    const name = profileName.trim();
    if (!name) return;
    const next = [...profiles.filter(p => p?.name?.toLowerCase() !== name.toLowerCase()), { name, conditions: Array.isArray(conditions) ? conditions : [] }];
    setProfiles(next);
    localStorage.setItem("osrsflipit-profiles", JSON.stringify(next));
    setProfileName("");
    setProfileOpen(false);
    notify(`Profile "${name}" saved`);
  }
  function loadProfile(name) {
    const p = profiles.find(x => x?.name === name);
    if (!p) return;
    setConditions(Array.isArray(p.conditions) ? p.conditions : []);
    setProfileOpen(false);
    notify(`Loaded profile "${name}"`);
  }

  function openAlertItem(itemId) {
    const item = items.find(x => x.id === itemId);
    if (item) selectItem(item, "48h");
  }

  const columnOptions = [
    ["buy", "Insta buy"], ["sell", "Insta sell"], ["margin", "Margin"], ["roi", "ROI"],
    ["volume", "1h volume"], ["limit", "GE limit"], ["potentialProfit", "Profit / limit"], ["updated", "Last update"]
  ];
  function toggleColumn(key) { setColumns(cs => cs.includes(key) ? cs.filter(x => x !== key) : [...cs, key]); }
  function moveColumn(from, to) {
    setColumns(cs => { const next=[...cs]; const i=next.indexOf(from), j=next.indexOf(to); if(i<0||j<0||i===j)return cs; next.splice(i,1); next.splice(j,0,from); return next; });
  }
  const formatClock = ts => new Intl.DateTimeFormat(undefined, { hour:"2-digit", minute:"2-digit", second:"2-digit", timeZone: clockZone === "local" ? undefined : "UTC" }).format(ts);
  const formatStamp = ts => ts ? new Intl.DateTimeFormat(undefined, { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }).format(ts) : "—";
  const age = ts => { if(!ts) return "—"; const sec=Math.max(0, Math.round((now-ts)/1000)); return sec<60 ? `${sec}s ago` : sec<3600 ? `${Math.floor(sec/60)}m ago` : `${Math.floor(sec/3600)}h ago`; };

  return <div className="app">
    <header className="nav">
      <button className="brand" onClick={goMarket} title="Go to Market"><span>OSRS</span>FlipIt</button>
      <div className="navlinks">
        {[
          ["market","Market"],["screener","Screener"],["analysis","Analysis"],["recipes","Recipes"],["money","Money Makers"],["movers","Movers"],["watch","Watch"],["alerts","Alerts"]
        ].map(([key,label]) =>
          <button key={key} className={tab === key ? "active" : ""} onClick={() => { setTab(key); setSelected(null); }}>
            {label}
            {key === "watch" && <b>{watch.length}</b>}
            {key === "alerts" && activeAlerts.length > 0 && <b className="red">{activeAlerts.length}</b>}
          </button>
        )}
      </div>
      <div className="globalSearch">
        <Search size={16}/>
        <input value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} placeholder="Search any item…" />
        {globalSearch && <button onClick={() => setGlobalSearch("")}><X size={14}/></button>}
        {globalMatches.length > 0 && <div className="globalResults">
          {globalMatches.map(x => <button key={x.id} onClick={() => { setGlobalSearch(""); selectItem(x); }}>
            <img src={iconUrl(x.icon)} onError={e => e.currentTarget.style.display="none"} />
            <span><strong>{x.name}</strong><small>{money(x.sell)} · {money(x.margin)} margin</small></span>
            <ChevronRight size={14}/>
          </button>)}
        </div>}
      </div>
      <button className="iconbtn bellbtn" onClick={() => setNotificationsOpen(v => !v)} title="Notifications">
        <Bell size={17}/>{activeAlerts.length > 0 && <i/>}
      </button>
      <div className="topClock" title={`Timezone: ${clockZone === "local" ? (Intl.DateTimeFormat().resolvedOptions().timeZone || "Local") : "UTC"}`}>
        <span>{formatClock(now)}</span><small>{clockZone === "local" ? "LOCAL" : "UTC"}</small>
      </div>
      <button className="iconbtn" onClick={() => setDark(v=>!v)} title={dark ? "Use light mode" : "Use dark mode"}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button>
      <button className="iconbtn" onClick={() => setAccountOpen(true)} title="Account"><UserRound size={17}/></button>
      <button className="iconbtn" onClick={load} title="Refresh"><RefreshCw size={17}/></button>
      {notificationsOpen && <NotificationPopover alerts={alerts} clear={() => { setAlerts([]); localStorage.setItem("osrsflipit-alerts", "[]"); }} openItem={openAlertItem} close={() => setNotificationsOpen(false)} />}
    </header>
    <div className={`ticker ${tickerPaused ? "paused" : ""}`} onMouseEnter={() => setTickerPaused(true)} onMouseLeave={() => setTickerPaused(false)}>
      <div className="tickerTrack">
        {[...watched, ...watched].map((x,i) => {
          const change = x.buy ? ((x.sell-x.buy)/x.buy)*100 : 0;
          return <button key={`${x.id}-${i}`} className="tickerItem" onClick={() => selectItem(x)}>
            <img src={iconUrl(x.icon)} onError={e=>e.currentTarget.style.display="none"}/>
            <strong>{x.name}</strong><span className={change >= 0 ? "tickerUp" : "tickerDown"}>{change >= 0 ? "↗" : "↘"} {Math.abs(change).toFixed(2)}%</span>
          </button>;
        })}
        {!watched.length && <span className="tickerEmpty">Star items to pin them here · your watchlist becomes a live market ticker</span>}
      </div>
    </div>

    <main>
      <section className="hero">
        <div>
          <div className="eyebrow">GRAND EXCHANGE ANALYTICS</div>
          <h1>Find the flip.<br/><em>Keep the profit.</em></h1>
          <p>Live market data, tax-aware margins and clean analytics for OSRS.</p>
        </div>
        <div className="status"><span className="dot"/>Live <small>{updated ? `· ${Math.max(0, Math.round((Date.now() - updated) / 1000))}s ago` : ""}</small></div>
      </section>

      {tab === "market" && <>
        <div className="toolbar">
          <div className="search">
            <Search size={18}/>
            <input value={search} onChange={e => { setSearch(e.target.value); setMarketVisible(30); }} placeholder="Search items…" />
            {search && <button className="clearSearch" onClick={clearSearch} title="Clear search"><X size={17}/></button>}
          </div>
          <div className="chips"><span>After GE tax</span><span>Live prices</span><span>Match all: {conditions.length}</span></div>
        </div>

        <div className="filterbar">
          <button className={`filterButton ${conditions.length ? "hasFilters" : ""}`} onClick={() => setFilterOpen(v => !v)}>
            <SlidersHorizontal size={16}/> Match all filters {conditions.length ? `(${conditions.length})` : ""}<ChevronDown size={14}/>
          </button>
          <div className="filterActions">
            <div className="columnControls">
              <button className="secondary" onClick={() => setColumnMenuOpen(v=>!v)}><SlidersHorizontal size={15}/> Columns <ChevronDown size={13}/></button>
              {columnMenuOpen && <div className="columnMenu"><div className="columnMenuHead"><strong>Market columns</strong><button onClick={()=>setColumns(columnOptions.map(x=>x[0]))}><RotateCcw size={13}/> Reset</button></div>{columnOptions.map(([key,label])=><label key={key}><input type="checkbox" checked={columns.includes(key)} onChange={()=>toggleColumn(key)}/><span>{label}</span><GripVertical size={13}/></label>)}<small>Drag the table headers to reorder.</small></div>}
            </div>
          <div className="profileControls">
            <button className="secondary" onClick={() => setProfileOpen(v => !v)}><Save size={15}/> Profiles</button>
            {profileOpen && <div className="profileMenu">
              <div className="profileSave"><input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Profile name…"/><button onClick={saveProfile}><Save size={14}/></button></div>
              {profiles.length ? profiles.map(p => <div className="profileRow" key={p.name}><button onClick={() => loadProfile(p.name)}>{p.name}<small>{Array.isArray(p.conditions) ? p.conditions.length : 0} filters</small></button><button onClick={() => { const n=profiles.filter(x=>x.name!==p.name); setProfiles(n); localStorage.setItem("osrsflipit-profiles", JSON.stringify(n)); }}><Trash2 size={14}/></button></div>) : <div className="profileEmpty">No saved profiles yet.</div>}
            </div>}
          </div>
          </div>
        </div>

        {filterOpen && <FilterBuilder conditions={conditions} add={addCondition} update={updateCondition} remove={removeCondition} clear={() => setConditions([])} />}

        <div className="stats">
          <Stat label="Items tracked" value={items.length.toLocaleString()}/>
          <Stat label="Best margin" value={items.length ? money(Math.max(...items.map(x => x.margin))) : "—"}/>
          <Stat label="Highest ROI" value={items.length ? pct(Math.max(...items.map(x => x.roi))) : "—"}/>
          <Stat label="Showing" value={`${Math.min(marketVisible, filtered.length)} / ${filtered.length}`}/>
        </div>

        <div className="tablewrap">
          <table><thead><tr>
            <th>Item</th>
            {columns.map(key => { const opt=columnOptions.find(x=>x[0]===key); return <th key={key} draggable onDragStart={()=>setDragColumn(key)} onDragOver={e=>e.preventDefault()} onDrop={()=>{moveColumn(dragColumn,key);setDragColumn(null)}}><button className="thbtn" onClick={() => key!=="updated" && sortBy(key)}>{opt?.[1]}{key!=="updated" && <ArrowUpDown size={13}/>} {key!=="updated" && sort.key===key && <span>{sort.dir==="desc"?"↓":"↑"}</span>}</button></th>; })}
            <th></th>
          </tr></thead>
          <tbody>
            {loading && !items.length ? <tr><td colSpan={columns.length+2} className="empty">Loading the Grand Exchange…</td></tr> :
              filtered.slice(0, marketVisible).map(x =>
                <tr key={x.id} onClick={() => selectItem(x)}>
                  <td><div className="item">
                    <button className={`star ${watch.includes(x.id) ? "on" : ""}`} onClick={e => { e.stopPropagation(); toggleWatch(x.id); }}><Star size={15} fill={watch.includes(x.id) ? "currentColor" : "none"}/></button>
                    <img className="itemIcon" src={iconUrl(x.icon)} onError={e => e.currentTarget.style.display = "none"} />
                    <div><strong>{x.name}</strong><small>{x.members ? "Members" : "Free-to-play"}</small></div>
                  </div></td>
                  {columns.map(key => {
                    if(key==="buy") return <td key={key}><span>{money(x.buy)}</span><small className="instantLabel">Instant buy</small></td>;
                    if(key==="sell") return <td key={key}><span>{money(x.sell)}</span><small className="instantLabel">Instant sell</small></td>;
                    if(key==="margin") return <td key={key}><strong className={x.margin>0?"green":"redtxt"}>{money(x.margin)}</strong><small className="sub">tax {money(x.tax)}</small></td>;
                    if(key==="roi") return <td key={key}><strong>{pct(x.roi)}</strong></td>;
                    if(key==="volume") return <td key={key}>{num(x.volume)}</td>;
                    if(key==="limit") return <td key={key}>{num(x.limit)}</td>;
                    if(key==="potentialProfit") return <td key={key}><strong>{money(x.potentialProfit)}</strong></td>;
                    return <td key={key}><small className="lastUpdate">{age(x.lastUpdated)}<br/>{formatStamp(x.lastUpdated)}</small></td>;
                  })}
                  <td><ChevronRight size={16} className="chev"/></td>
                </tr>
              )}
            {!loading && !filtered.length && <tr><td colSpan={columns.length+2} className="empty">No items match those filters.</td></tr>}
          </tbody></table>
        </div>
        {marketVisible < filtered.length && <button className="loadMore" onClick={() => setMarketVisible(v => v + 30)}>Load More <span>{filtered.length - marketVisible} more</span></button>}
      </>}

      {tab === "screener" && <Screener items={filtered} search={screenerSearch} setSearch={setScreenerSearch} columns={columns} sort={sort} sortBy={sortBy} onSelect={selectItem} watch={watch} toggleWatch={toggleWatch}/>}
      {tab === "analysis" && <Analysis items={items} movers={movers} onSelect={selectItem}/>}
      {tab === "recipes" && <Recipes items={items} category={recipeCategory} setCategory={setRecipeCategory} sort={recipeSort} setSort={setRecipeSort} favourites={recipeFavourites} setFavourites={setRecipeFavourites} onSelect={selectItem}/>}
      {tab === "money" && <MoneyMakers makers={makers} updated={makersUpdated} query={makerQuery} setQuery={setMakerQuery} member={makerMember} setMember={setMakerMember} difficulty={makerDifficulty} setDifficulty={setMakerDifficulty}/>}
      {tab === "movers" && <Movers movers={movers} onSelect={selectItem} filters={{moverMinPrice,setMoverMinPrice,moverMaxPrice,setMoverMaxPrice,moverMinVolume,setMoverMinVolume,moverMaxVolume,setMoverMaxVolume}}/>}
      {tab === "watch" && <Watch watched={watched} onSelect={selectItem} toggleWatch={toggleWatch}/>}
      {tab === "alerts" && <Alerts alerts={activeAlerts} all={alerts} rules={alertRules} setRules={setAlertRules} setAlerts={setAlerts} open={() => setRuleModal(true)} openItem={openAlertItem}/>}

    </main>

    {toast && <div className="toast" onClick={() => toast.itemId && openAlertItem(toast.itemId)}>
      <span className="toastIcon"><Bell size={15}/></span><div><strong>{toast.message}</strong><small>Click to view</small></div><button onClick={e => {e.stopPropagation();setToast(null)}}><X size={15}/></button>
    </div>}

    {selected && <ItemPanel item={selected} history={history[selected.id] || {}} watch={watch} toggleWatch={toggleWatch} close={() => setSelected(null)} selectRange={range => selectItem(selected, range)} />}
    {ruleModal && <RuleModal items={items} onClose={() => setRuleModal(false)} onSave={rule => {
      if (alertRules.length >= 20) { notify("You can have up to 20 alert rules."); return; }
      const next = [...alertRules, { ...rule, lastTriggered: 0 }];
      setAlertRules(next); localStorage.setItem("osrsflipit-rules", JSON.stringify(next)); setRuleModal(false);
    }}/>}
    {accountOpen && <AccountModal onClose={() => setAccountOpen(false)} dark={dark}/>}
  </div>
}

function iconUrl(icon) {
  if (!icon) return "";
  return `https://oldschool.runescape.wiki/images/${encodeURIComponent(icon.replace(/ /g, "_"))}`;
}

function Stat({label,value}) {
  return <div className="stat"><small>{label}</small><strong>{value}</strong></div>;
}
function Th({t,label,sort,on}) {
  return <th><button className="thbtn" onClick={() => on(t)}>{label}<ArrowUpDown size={13}/>{sort.key === t && <span>{sort.dir === "desc" ? "↓" : "↑"}</span>}</button></th>;
}

const FIELD_OPTIONS = [
  ["margin","Margin"],["roi","ROI"],["buy","Buy price"],["sell","Sell price"],
  ["volume","1h volume"],["limit","GE limit"],["potentialProfit","Limit profit"]
];
const OP_OPTIONS = [["gt",">"],["gte","≥"],["eq","="],["lte","≤"],["lt","<"]];

function FilterBuilder({conditions,add,update,remove,clear}) {
  return <div className="filterPanel">
    <div className="filterHeader"><div><strong>Match all filters</strong><small>Every condition below must be true.</small></div><div><button className="secondary" onClick={clear}>Clear</button><button className="primary small" onClick={add}><Plus size={14}/> Add filter</button></div></div>
    {!conditions.length && <div className="filterEmpty"><Filter size={17}/> Add a filter such as <b>Margin ≥ 50,000 gp</b> and <b>1h volume ≥ 10,000</b>.</div>}
    {conditions.map(c => <div className="condition" key={c.id}>
      <select value={c.field} onChange={e => update(c.id,{field:e.target.value})}>{FIELD_OPTIONS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select value={c.op} onChange={e => update(c.id,{op:e.target.value})}>{OP_OPTIONS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select>
      <input value={c.value} onChange={e => update(c.id,{value:e.target.value})} placeholder="50k, 1.5m…"/>
      {c.field === "roi" && <span>%</span>} {c.field !== "roi" && <span>gp / items</span>}
      <button className="dangerIcon" onClick={() => remove(c.id)}><Trash2 size={15}/></button>
    </div>)}
  </div>
}

function Movers({movers,onSelect,filters}) {
  return <section className="movers"><div className="sectionhead"><div><div className="eyebrow">MARKET MOVERS</div><h2>What moved today.</h2></div><p>Top 50 current 1-hour movers, with price and volume filters.</p></div>
    <div className="moverFilters">
      <label>Min price<input value={filters.moverMinPrice} onChange={e=>filters.setMoverMinPrice(e.target.value)} placeholder="0"/></label>
      <label>Max price<input value={filters.moverMaxPrice} onChange={e=>filters.setMoverMaxPrice(e.target.value)} placeholder="Any"/></label>
      <label>Min volume<input value={filters.moverMinVolume} onChange={e=>filters.setMoverMinVolume(e.target.value)} placeholder="0"/></label>
      <label>Max volume<input value={filters.moverMaxVolume} onChange={e=>filters.setMoverMaxVolume(e.target.value)} placeholder="Any"/></label>
    </div>
    <div className="movegrid"><MoveCol title="Rising" icon={<TrendingUp/>} rows={movers.up} onSelect={onSelect}/><MoveCol title="Falling" icon={<TrendingDown/>} rows={movers.down} onSelect={onSelect}/></div>
  </section>
}
function MoveCol({title,icon,rows,onSelect}) {
  return <div className="movecol"><div className="movetitle">{icon}<strong>{title}</strong><span>Top 50</span></div>
    {rows.map((x,i)=><button className="moverow" key={x.id} onClick={()=>onSelect(x)}>
      <span className="rank">{String(i+1).padStart(2,"0")}</span>
      <img className="itemIcon" src={iconUrl(x.icon)} onError={e=>e.currentTarget.style.display="none"}/>
      <span className="mname"><strong>{x.name}</strong><small>{money(x.sell)} · {num(x.volume)}/h</small></span>
      <b className={x.change>=0?"green":"redtxt"}>{pct(x.change)}</b><ChevronRight size={15}/>
    </button>)}
  </div>
}
function Watch({watched,onSelect,toggleWatch}) {
  return <section><div className="sectionhead"><div><div className="eyebrow">WATCHLIST</div><h2>Your items.</h2></div><p>{watched.length}/100 saved locally in this browser.</p></div>
    <div className="cards">{watched.length ? watched.map(x=><button className="watchcard" key={x.id} onClick={()=>onSelect(x)}>
      <img className="itemIcon bigIcon" src={iconUrl(x.icon)} onError={e=>e.currentTarget.style.display="none"}/><div><strong>{x.name}</strong><small>{money(x.buy)} → {money(x.sell)}</small></div><b className={x.margin>=0?"green":"redtxt"}>{money(x.margin)}</b><span onClick={e=>{e.stopPropagation();toggleWatch(x.id)}}><X size={16}/></span>
    </button>) : <div className="emptybox">Star items in the market table to keep them here.</div>}</div>
  </section>
}

function Alerts({alerts,all,rules,setRules,setAlerts,open,openItem}) {
  return <section><div className="sectionhead"><div><div className="eyebrow">PRICE ALERTS</div><h2>Stay ahead of the move.</h2></div><button className="primary" onClick={open}>+ New alert</button></div>
    <div className="alertintro"><Bell size={19}/><div><strong>20 alert rules max</strong><p>Triggered alerts now appear as small 15-second popups and stay here for 1 hour. Click an alert to open its graph.</p></div></div>
    <div className="rulelist">{rules.map((r,i)=><div className="rule" key={i}><span className="ruleicon"><Bell size={15}/></span><div><strong>{r.name || `Item #${r.id}`}</strong><small>{r.metric} {r.direction} {num(r.value)}{r.metric==="roi"?"%":" gp"}</small></div><button onClick={()=>{const n=rules.filter((_,j)=>j!==i);setRules(n);localStorage.setItem("osrsflipit-rules",JSON.stringify(n))}}><X size={16}/></button></div>)}</div>
    <h3 className="historytitle">Recent notifications</h3>
    {all.length ? <div className="notificationlist">{all.map(a=><button className="notification" key={a.id} onClick={()=>openItem(a.itemId)}><span className="ndot"/><div><strong>{a.name}</strong><small>{a.metric} hit {num(a.target)}{a.metric==="roi"?"%":" gp"} · {new Date(a.at).toLocaleString("en-GB")}</small></div><ChevronRight size={15}/></button>)}</div> : <div className="emptybox">No alerts yet.</div>}
    <button className="clear" onClick={()=>{setAlerts([]);localStorage.setItem("osrsflipit-alerts","[]")}}>Clear all notifications</button>
  </section>
}

function NotificationPopover({alerts,clear,openItem,close}) {
  return <div className="notificationPopover"><div className="popoverHead"><strong>Notifications</strong><button onClick={close}><X size={16}/></button></div>
    {alerts.length ? <div className="popoverList">{alerts.slice(0,10).map(a=><button key={a.id} onClick={()=>{openItem(a.itemId);close()}}><span className="ndot"/><div><strong>{a.name}</strong><small>{a.metric} hit {num(a.target)}{a.metric==="roi"?"%":" gp"}</small></div></button>)}</div> : <div className="popoverEmpty"><Check size={17}/> You're all caught up.</div>}
    {alerts.length > 0 && <button className="clearPopover" onClick={clear}>Clear all notifications</button>}
  </div>
}

function RuleModal({items,onClose,onSave}) {
  const [q,setQ]=useState(""); const [id,setId]=useState(items[0]?.id);
  const [metric,setMetric]=useState("sell"); const [direction,setDirection]=useState("above"); const [value,setValue]=useState("100k");
  const found=items.filter(x=>x.name.toLowerCase().includes(q.toLowerCase())).slice(0,7);
  return <div className="modalback"><div className="modal"><button className="close" onClick={onClose}><X/></button><div className="eyebrow">NEW ALERT</div><h2>Watch a price.</h2>
    <label>Item</label><input value={q} onChange={e=>{setQ(e.target.value);const f=items.find(x=>x.name.toLowerCase().includes(e.target.value.toLowerCase()));if(f)setId(f.id)}} placeholder="Search item…"/>
    {q&&<div className="suggest">{found.map(x=><button key={x.id} onClick={()=>{setId(x.id);setQ(x.name)}}>{x.name}</button>)}</div>}
    <div className="twocol"><div><label>Metric</label><select value={metric} onChange={e=>setMetric(e.target.value)}><option value="sell">Sell price</option><option value="buy">Buy price</option><option value="margin">Margin</option><option value="roi">ROI</option></select></div><div><label>Condition</label><select value={direction} onChange={e=>setDirection(e.target.value)}><option value="above">rises above</option><option value="below">drops below</option></select></div></div>
    <label>Threshold</label><input value={value} onChange={e=>setValue(e.target.value)} placeholder="100k, 2.5m…"/><button className="primary wide" onClick={()=>{const x=items.find(x=>x.id===id);onSave({id,name:x?.name||"Unknown",metric,direction,value:parseGp(value)})}}>Create alert</button>
  </div></div>
}

function PriceChartTooltip({active,payload,label}) {
  if (!active || !payload?.length) return null;
  return <div className="chartTooltip"><strong>{label}</strong>{payload.map(p=><div key={p.dataKey}><span className={`legendDot ${p.dataKey}`}/>{p.dataKey==="buy"?"Buy":"Sell"}: <b>{money(p.value)}</b></div>)}</div>;
}

function ItemPanel({item,history,watch,toggleWatch,close,selectRange}) {
  const [range,setRange] = useState(item.chartRange || "24h");
  const [zoom,setZoom] = useState(null);
  const [pan,setPan] = useState(0);
  const pointers = useRef(new Map());
  const pinchStart = useRef(null);
  const dragStart = useRef(null);

  useEffect(()=>{ if (!history[range]) selectRange(range); setZoom(null); setPan(0); }, [range]);
  const fullData=history[range] || [];
  const current = zoom || [0, Math.max(0, fullData.length-1)];
  const shifted = (() => {
    if (!fullData.length) return [0,0];
    const size=current[1]-current[0]+1;
    const maxStart=Math.max(0,fullData.length-size);
    const a=Math.max(0,Math.min(maxStart,current[0]+pan));
    return [a,Math.min(fullData.length-1,a+size-1)];
  })();
  const data=fullData.slice(shifted[0], shifted[1]+1);
  const vals=data.flatMap(p=>[p.buy,p.sell]).filter(v=>v != null);
  const min=vals.length ? Math.min(...vals) : 0, max=vals.length ? Math.max(...vals) : 1;
  const pad=Math.max((max-min)*0.08, Math.max(max*0.005, 10));
  const domain=[Math.max(0,min-pad),max+pad];
  const labels={ "24h":"24 hours","48h":"48 hours","7d":"1 week","30d":"1 month","6m":"6 months" };

  const zoomBy = (factor, centerRatio=.5) => {
    if(fullData.length<8) return;
    const base=zoom || [0,fullData.length-1], size=base[1]-base[0]+1;
    const nextSize=Math.max(8,Math.min(fullData.length,Math.round(size*factor)));
    const center=base[0]+Math.round(size*centerRatio);
    let a=Math.max(0,center-Math.round(nextSize*centerRatio)), b=Math.min(fullData.length-1,a+nextSize-1);
    if(b-a+1<nextSize)a=Math.max(0,b-nextSize+1);
    setZoom(nextSize>=fullData.length ? null : [a,b]); setPan(0);
  };
  const resetZoom=()=>{setZoom(null);setPan(0)};
  const pointerDown=e=>{
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size===1) dragStart.current={x:e.clientX,pan};
    if(pointers.current.size===2){
      const pts=[...pointers.current.values()];
      pinchStart.current={dist:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y), size:current[1]-current[0]+1};
    }
  };
  const pointerMove=e=>{
    if(!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size===2 && pinchStart.current){
      const pts=[...pointers.current.values()];
      const dist=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      const factor=Math.max(.55,Math.min(1.8,pinchStart.current.dist/dist));
      const desired=Math.max(8,Math.min(fullData.length,Math.round(pinchStart.current.size*factor)));
      const center=Math.round((current[0]+current[1])/2);
      let a=Math.max(0,center-Math.floor(desired/2)),b=Math.min(fullData.length-1,a+desired-1);
      if(b-a+1<desired)a=Math.max(0,b-desired+1);
      setZoom(desired>=fullData.length ? null : [a,b]); setPan(0); e.preventDefault?.();
    } else if(pointers.current.size===1 && dragStart.current && fullData.length>8){
      const rect=e.currentTarget.getBoundingClientRect();
      const px=e.clientX-dragStart.current.x;
      const size=current[1]-current[0]+1;
      const delta=Math.round(-px/Math.max(1,rect.width)*size);
      setPan(dragStart.current.pan+delta);
    }
  };
  const pointerUp=e=>{pointers.current.delete(e.pointerId);if(pointers.current.size<2)pinchStart.current=null;dragStart.current=null};

  return <div className="drawerback" onClick={close}><aside className="drawer" onClick={e=>e.stopPropagation()}>
    <button className="close" onClick={close}><X/></button><div className="eyebrow">ITEM ANALYTICS</div>
    <div className="itemtitle"><div className="itemHeading"><img className="titleIcon" src={iconUrl(item.icon)} onError={e=>e.currentTarget.style.display="none"}/><div><h2>{item.name}</h2><p>Grand Exchange · {item.members?"Members":"Free-to-play"}</p></div></div>
      <button className={`star big ${watch.includes(item.id)?"on":""}`} onClick={()=>toggleWatch(item.id)}><Star fill={watch.includes(item.id)?"currentColor":"none"}/></button></div>
    <div className="panelstats"><Stat label="Buy" value={money(item.buy)}/><Stat label="Sell" value={money(item.sell)}/><Stat label="Margin" value={money(item.margin)}/><Stat label="ROI" value={pct(item.roi)}/></div>
    <div className="detailgrid topDetails"><div><span>Max buy limit</span><strong>{num(item.limit)} per 4 hours</strong></div><div><span>1h volume</span><strong>{num(item.volume)}</strong></div><div><span>GE tax</span><strong>{money(item.tax)}</strong></div><div><span>Profit per limit</span><strong>{money(item.potentialProfit)}</strong></div></div>
    <div className="chartbox"><div className="charthead"><div><strong>Price history</strong><small>5-minute points · drag to pan · scroll to zoom · pinch on touch</small></div><span>{labels[range]}</span></div>
      <div className="rangeButtons">{Object.entries(labels).map(([k,v])=><button key={k} className={range===k?"active":""} onClick={()=>{setRange(k);selectRange(k)}}>{v}</button>)}<button onClick={resetZoom} className={zoom?"zoomReset active":"zoomReset"}><RotateCcw size={11}/> Reset view</button></div>
      {data.length ? <div className="chartTouch" onWheel={e=>{e.preventDefault();zoomBy(e.deltaY<0?.7:1.4,.5)}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
        <ResponsiveContainer width="100%" height={390}><LineChart data={data} margin={{top:18,right:12,left:2,bottom:10}}>
          <CartesianGrid strokeDasharray="2 4" vertical={true} opacity={0.2}/>
          <XAxis dataKey="timestamp" type="number" domain={['dataMin','dataMax']} tickFormatter={t=>new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit"}).format(t)} tick={{fontSize:10}} minTickGap={55}/>
          <YAxis domain={domain} tickFormatter={v=>v>=1000000?`${(v/1000000).toFixed(1)}m`:v>=1000?`${Math.round(v/1000)}k`:Math.round(v)} tick={{fontSize:10}} width={52} tickCount={8}/>
          <Tooltip content={<PriceChartTooltip/>}/>
          <Line type="monotone" dataKey="sell" name="Sell" stroke="#ff4fa3" strokeWidth={2.8} dot={{r:1.7,strokeWidth:0}} activeDot={{r:5}} connectNulls />
          <Line type="monotone" dataKey="buy" name="Buy" stroke="#59d8ff" strokeWidth={2.8} dot={{r:1.7,strokeWidth:0}} activeDot={{r:5}} connectNulls />
        </LineChart></ResponsiveContainer>
      </div> : <div className="chartloading">Loading history…</div>}
    </div>
    <div className="chartNote"><TrendingUp size={15}/><span>Every point is a 5-minute market snapshot on the 24h view. Drag with one finger or left mouse to move through history after zooming. Hover a point for the exact local date and time.</span></div>
    <a className="wikiLink" href={`https://prices.runescape.wiki/osrs/item/${item.id}`} target="_blank" rel="noreferrer">Open OSRS Wiki price page <ExternalLink size={14}/></a>
  </aside></div>
}


const RECIPE_DEFS = [
  ["Herb cleaning","Cleaning Grimy ranarr weed","Grimy ranarr weed","Ranarr weed",1,1400,420],
  ["Herb cleaning","Cleaning Grimy snapdragon","Grimy snapdragon","Snapdragon",1,1500,420],
  ["Herb cleaning","Cleaning Grimy toadflax","Grimy toadflax","Toadflax",1,1200,420],
  ["Herblore","Making Prayer potions","Ranarr potion (unf)","Prayer potion(3)",1,500,220],
  ["Herblore","Making Super combat potions","Super attack(4)","Super combat potion(4)",1,650,170],
  ["Herblore","Making Saradomin brews","Toadflax potion (unf)","Saradomin brew(3)",1,900,180],
  ["Magic","High alching Dragon platelegs","Dragon platelegs","Coins",1,1200,1200],
  ["Magic","High alching Rune platebody","Rune platebody","Coins",1,700,1200],
  ["Magic","High alching Rune 2h sword","Rune 2h sword","Coins",1,800,1200],
  ["Fletching","Making magic longbows","Magic logs","Magic longbow",1,180,1500],
  ["Fletching","Stringing magic longbows","Magic longbow (u)","Magic longbow",1,250,1800],
  ["Fletching","Making dragon bolts","Dragon bolt tips","Dragonstone bolts",10,140,1100],
  ["Cooking","Cooking sharks","Raw shark","Shark",1,500,1300],
  ["Cooking","Cooking anglerfish","Raw anglerfish","Anglerfish",1,600,1250],
  ["Crafting","Crafting air battlestaves","Unpowered orb","Air battlestaff",1,300,1100],
  ["Crafting","Crafting water battlestaves","Unpowered orb","Water battlestaff",1,350,1100],
  ["Crafting","Cutting diamonds","Uncut diamond","Diamond",1,250,1400],
  ["Smithing","Making rune bars products","Runite bar","Rune items",1,800,700],
  ["Tanning","Tanning green dragonhide","Green dragonhide","Green d'hide",1,250,1800],
  ["Tanning","Tanning blue dragonhide","Blue dragonhide","Blue d'hide",1,300,1800],
  ["Tanning","Tanning red dragonhide","Red dragonhide","Red d'hide",1,350,1800],
  ["Tanning","Tanning black dragonhide","Black dragonhide","Black d'hide",1,400,1800]
];
function findItem(items,name) {
  const q=name.toLowerCase();
  return items.find(x=>x.name.toLowerCase()===q) || items.find(x=>x.name.toLowerCase().includes(q));
}
function Recipes({items,category,setCategory,sort,setSort,favourites,setFavourites,onSelect}) {
  const cats=["All",...new Set(RECIPE_DEFS.map(r=>r[0]))];
  const rows=RECIPE_DEFS.map((r,i)=>{
    const input=findItem(items,r[2]), output=findItem(items,r[3]);
    const cost=(input?.buy||0)*r[4], revenue=output?.sell||0;
    const profit=Math.max(0,revenue-cost-taxFor(revenue));
    return {id:i,cat:r[0],name:r[1],input,output,qty:r[4],profit,perHour:profit*r[6],actions:r[6]};
  }).filter(x=>category==="All"||x.cat===category);
  rows.sort((a,b)=>{ const af=favourites.includes(a.id), bf=favourites.includes(b.id); if(af!==bf)return bf-af; return sort==="profit" ? b.profit-a.profit : b.perHour-a.perHour; });
  return <section className="dataPage"><div className="sectionhead"><div><div className="eyebrow">MARKET RECIPES</div><h2>Turn actions into profit.</h2></div><p>Live GE prices · tax-aware estimates · favourites-ready.</p></div>
    <div className="recipeIntro">Recipe profit is calculated from the current market. Actual GP/hr varies with your speed, banking, world choice and GE prices.</div>
    <div className="pageControls"><select value={category} onChange={e=>setCategory(e.target.value)}>{cats.map(c=><option key={c}>{c}</option>)}</select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="gpHour">Highest GP/hour</option><option value="profit">Highest GP/action</option></select></div>
    <div className="recipeGrid">{rows.map(x=><button className="recipeCard" key={x.id} onClick={()=>x.input&&onSelect(x.input)}><div className="recipeTop"><span>{x.cat}</span><span className="recipeFav" onClick={e=>{e.stopPropagation();setFavourites(f=>f.includes(x.id)?f.filter(id=>id!==x.id):[...f,x.id])}}><Star size={13} fill={favourites.includes(x.id)?"currentColor":"none"}/> {favourites.includes(x.id)?"Saved":"Save"}</span><strong>{money(x.perHour)}/h</strong></div><h3>{x.name}</h3><p>{x.input?.name||"Input unavailable"} → {x.output?.name||"Output unavailable"}</p><div className="recipeNumbers"><span>{money(x.profit)} / action</span><span>{num(x.actions)} actions/h</span></div></button>)}</div>
  </section>
}
function Analysis({items,movers,onSelect}) {
  const gainers=[...movers.up].slice(0,12), losers=[...movers.down].slice(0,12);
  const best=[...items].sort((a,b)=>b.margin-a.margin).slice(0,12);
  return <section className="dataPage"><div className="sectionhead"><div><div className="eyebrow">MARKET ANALYSIS</div><h2>Gainers, losers & flip edges.</h2></div><p>Tax-aware snapshots from the live market.</p></div>
    <div className="analysisGrid">
      <AnalysisCard title="Top gainers" rows={gainers} onSelect={onSelect} positive/>
      <AnalysisCard title="Top losers" rows={losers} onSelect={onSelect}/>
      <AnalysisCard title="Highest tax-free margin" rows={best} onSelect={onSelect} margin/>
    </div>
  </section>
}
function AnalysisCard({title,rows,onSelect,positive,margin}) {
  return <div className="analysisCard"><div className="cardTitle"><strong>{title}</strong><small>{margin?"After GE tax":"24h-style current edge"}</small></div>{rows.map(x=><button className="analysisRow" key={x.id} onClick={()=>onSelect(x)}><img src={iconUrl(x.icon)}/><span><strong>{x.name}</strong><small>{money(x.buy)} → {money(x.sell)}</small></span><b className={(positive||margin)?"green":"redtxt"}>{margin?money(x.margin):pct(x.change)}</b><ChevronRight size={14}/></button>)}</div>
}
function Screener({items,search,setSearch,columns,sort,sortBy,onSelect,watch,toggleWatch}) {
  const rows=items.filter(x=>x.name.toLowerCase().includes(search.toLowerCase())).slice(0,300);
  const labels={buy:"Insta buy",sell:"Insta sell",margin:"Margin",roi:"ROI",volume:"1h volume",limit:"GE limit",potentialProfit:"Profit / limit",updated:"Last update"};
  return <section className="screenerPage"><div className="screenerHead"><div><div className="eyebrow">FULL MARKET SCREENER</div><h2>Every item. More room.</h2></div><div className="search screenerSearch"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search the full market…"/></div></div>
    <div className="screenerWrap"><table><thead><tr><th>Item</th>{columns.map(k=><th key={k}><button className="thbtn" onClick={()=>sortBy(k)}>{labels[k]||k}<ArrowUpDown size={13}/></button></th>)}</tr></thead><tbody>{rows.map(x=><tr key={x.id} onClick={()=>onSelect(x)}><td><div className="item"><button className={`star ${watch.includes(x.id)?"on":""}`} onClick={e=>{e.stopPropagation();toggleWatch(x.id)}}><Star size={14} fill={watch.includes(x.id)?"currentColor":"none"}/></button><img className="itemIcon" src={iconUrl(x.icon)}/><div><strong>{x.name}</strong><small>{x.members?"Members":"F2P"}</small></div></div></td>{columns.map(k=><td key={k}>{k==="buy"?money(x.buy):k==="sell"?money(x.sell):k==="margin"?money(x.margin):k==="roi"?pct(x.roi):k==="volume"?num(x.volume):k==="limit"?num(x.limit):k==="potentialProfit"?money(x.potentialProfit):age(x.lastUpdated)}</td>)}</tr>)}</tbody></table></div></section>
}
function MoneyMakers({makers,updated,query,setQuery,member,setMember,difficulty,setDifficulty}) {
  const fallback=[
    {name:"Fletching high-level bows",requirement:"Fletching",gpHour:1500000,members:true,difficulty:"Medium",description:"Skilling method; profit varies with logs, strings and output prices."},
    {name:"Tanning dragonhides",requirement:"Coins + access to a tanner",gpHour:1200000,members:true,difficulty:"Easy",description:"Buy hides, tan them and sell the leather."},
    {name:"High level alchemy",requirement:"55 Magic",gpHour:900000,members:false,difficulty:"Easy",description:"Alch profitable items; rune costs and item prices vary."},
    {name:"Zulrah",requirement:"Regicide + 75 Magic + 70 Ranged recommended",gpHour:2500000,members:true,difficulty:"Hard",description:"Bossing method with variable kill times and unique drops."},
    {name:"Vorkath",requirement:"Dragon Slayer II + 70 Defence",gpHour:3500000,members:true,difficulty:"Hard",description:"High-level bossing; kills and loot vary substantially."}
  ];
  const source=makers.length?makers:fallback;
  const rows=source.filter(x=>x.name.toLowerCase().includes(query.toLowerCase())&&(member==="all"||(member==="members"&&x.members)||(member==="f2p"&&!x.members))&&(difficulty==="all"||x.difficulty===difficulty)).sort((a,b)=>b.gpHour-a.gpHour);
  return <section className="dataPage moneyPage"><div className="sectionhead"><div><div className="eyebrow">MONEY MAKING GUIDE</div><h2>Best ways to make GP.</h2></div><p>Guide data refreshes when this page opens{updated?` · ${updated.toLocaleTimeString("en-GB")}`:""}.</p></div>
    <div className="moneyNotice"><strong>Estimates, not guarantees.</strong> GP/hour depends on your skill, kill speed, banking, world, competition and Grand Exchange prices. Loot and margins can change quickly.</div>
    <div className="pageControls moneyFilters"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search money makers…"/><select value={member} onChange={e=>setMember(e.target.value)}><option value="all">All accounts</option><option value="members">Members</option><option value="f2p">Free-to-play</option></select><select value={difficulty} onChange={e=>setDifficulty(e.target.value)}><option value="all">All difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
    <div className="moneyTable"><div className="moneyHeader"><span>#</span><span>Method</span><span>Requirements / skills</span><span>Members</span><span>Difficulty</span><span>Estimated GP/hour</span></div>{rows.map((x,i)=><div className="moneyRow" key={`${x.name}-${i}`}><b>{i+1}</b><div><strong>{x.name}</strong><small>{x.description}</small></div><span>{x.requirement}</span><span>{x.members?"Yes":"No"}</span><span className={`difficulty ${x.difficulty.toLowerCase()}`}>{x.difficulty}</span><strong>{money(x.gpHour)}/h</strong></div>)}</div>
  </section>
}
function AccountModal({onClose}) {
  const [mode,setMode]=useState("email");
  return <div className="modalback"><div className="modal accountModal"><button className="close" onClick={onClose}><X/></button><div className="eyebrow">OSRSFLIPIT ACCOUNT</div><h2>Keep your setup everywhere.</h2><p className="accountLead">Accounts need a small hosted authentication/database service. This UI is prepared for a Supabase connection, but real sign-in and cross-device saving still need that connection configured.</p>
    <div className="accountButtons"><button className="accountProvider">Continue with Google</button><button className="accountProvider">Continue with Discord</button></div>
    <div className="accountDivider"><span>or</span></div>
    <div className="accountTabs"><button className={mode==="email"?"active":""} onClick={()=>setMode("email")}>Email</button><button className={mode==="phone"?"active":""} onClick={()=>setMode("phone")}>Mobile</button></div>
    <input placeholder={mode==="email"?"you@example.com":"+44 7…"}/><button className="primary wide" onClick={()=>alert("Connect Supabase, enable the selected provider, and then this button can send the magic link or OTP.")}>Send {mode==="email"?"magic link":"OTP"}</button>
    <div className="accountSaved"><strong>What will sync?</strong><span>Market filter profiles</span><span>Watchlist</span><span>Notifications & alert rules</span></div>
  </div></div>
}


createRoot(document.getElementById("root")).render(<App/>);
