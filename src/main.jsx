import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Search, Bell, Star, TrendingUp, TrendingDown, SlidersHorizontal, X,
  ArrowUpDown, ChevronRight, RefreshCw, Plus, Trash2, Save, Filter,
  Check, ChevronDown, ExternalLink
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
    potentialProfit: margin * (m.limit || 0)
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
  const [watch, setWatch] = useState(() => JSON.parse(localStorage.getItem("osrsflipit-watch") || "[]"));
  const [alerts, setAlerts] = useState(() => JSON.parse(localStorage.getItem("osrsflipit-alerts") || "[]"));
  const [alertRules, setAlertRules] = useState(() => JSON.parse(localStorage.getItem("osrsflipit-rules") || "[]"));
  const [profiles, setProfiles] = useState(() => JSON.parse(localStorage.getItem("osrsflipit-profiles") || "[]"));
  const [conditions, setConditions] = useState(() => JSON.parse(localStorage.getItem("osrsflipit-filters") || "[]"));
  const [selected, setSelected] = useState(null);
  const [ruleModal, setRuleModal] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [moverMinPrice, setMoverMinPrice] = useState("");
  const [moverMaxPrice, setMoverMaxPrice] = useState("");
  const [moverMinVolume, setMoverMinVolume] = useState("");
  const [moverMaxVolume, setMoverMaxVolume] = useState("");
  const toastTimer = useRef(null);

  const notify = (message, itemId = null) => {
    setToast({ message, itemId });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 15000);
  };

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
  useEffect(() => localStorage.setItem("osrsflipit-filters", JSON.stringify(conditions)), [conditions]);

  const globalMatches = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    return q ? items.filter(x => x.name.toLowerCase().includes(q)).slice(0, 7) : [];
  }, [items, globalSearch]);

  function passesFilters(x) {
    return conditions.every(c => {
      const raw = x[c.field];
      const value = Number(c.value);
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
    const minP = moverMinPrice === "" ? -Infinity : Number(moverMinPrice);
    const maxP = moverMaxPrice === "" ? Infinity : Number(moverMaxPrice);
    const minV = moverMinVolume === "" ? -Infinity : Number(moverMinVolume);
    const maxV = moverMaxVolume === "" ? Infinity : Number(moverMaxVolume);
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
    const next = [...profiles.filter(p => p.name.toLowerCase() !== name.toLowerCase()), { name, conditions }];
    setProfiles(next);
    localStorage.setItem("osrsflipit-profiles", JSON.stringify(next));
    setProfileName("");
    setProfileOpen(false);
    notify(`Profile "${name}" saved`);
  }
  function loadProfile(name) {
    const p = profiles.find(x => x.name === name);
    if (!p) return;
    setConditions(p.conditions || []);
    setProfileOpen(false);
    notify(`Loaded profile "${name}"`);
  }

  function openAlertItem(itemId) {
    const item = items.find(x => x.id === itemId);
    if (item) selectItem(item, "48h");
  }

  return <div className="app">
    <header className="nav">
      <button className="brand" onClick={goMarket} title="Go to Market"><span>OSRS</span>FlipIt</button>
      <div className="navlinks">
        {["market", "movers", "watch", "alerts"].map(key =>
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {key[0].toUpperCase() + key.slice(1)}
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
      <button className="iconbtn" onClick={load} title="Refresh"><RefreshCw size={17}/></button>
      {notificationsOpen && <NotificationPopover alerts={alerts} clear={() => { setAlerts([]); localStorage.setItem("osrsflipit-alerts", "[]"); }} openItem={openAlertItem} close={() => setNotificationsOpen(false)} />}
    </header>

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
          <div className="profileControls">
            <button className="secondary" onClick={() => setProfileOpen(v => !v)}><Save size={15}/> Profiles</button>
            {profileOpen && <div className="profileMenu">
              <div className="profileSave"><input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Profile name…"/><button onClick={saveProfile}><Save size={14}/></button></div>
              {profiles.length ? profiles.map(p => <div className="profileRow" key={p.name}><button onClick={() => loadProfile(p.name)}>{p.name}<small>{p.conditions.length} filters</small></button><button onClick={() => { const n=profiles.filter(x=>x.name!==p.name); setProfiles(n); localStorage.setItem("osrsflipit-profiles", JSON.stringify(n)); }}><Trash2 size={14}/></button></div>) : <div className="profileEmpty">No saved profiles yet.</div>}
            </div>}
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
            <Th t="buy" label="Buy price" sort={sort} on={sortBy}/>
            <Th t="sell" label="Sell price" sort={sort} on={sortBy}/>
            <Th t="margin" label="Margin" sort={sort} on={sortBy}/>
            <Th t="roi" label="ROI" sort={sort} on={sortBy}/>
            <Th t="volume" label="1h volume" sort={sort} on={sortBy}/>
            <Th t="limit" label="GE limit" sort={sort} on={sortBy}/>
            <th></th>
          </tr></thead>
          <tbody>
            {loading && !items.length ? <tr><td colSpan="8" className="empty">Loading the Grand Exchange…</td></tr> :
              filtered.slice(0, marketVisible).map(x =>
                <tr key={x.id} onClick={() => selectItem(x)}>
                  <td><div className="item">
                    <button className={`star ${watch.includes(x.id) ? "on" : ""}`} onClick={e => { e.stopPropagation(); toggleWatch(x.id); }}><Star size={15} fill={watch.includes(x.id) ? "currentColor" : "none"}/></button>
                    <img className="itemIcon" src={iconUrl(x.icon)} onError={e => e.currentTarget.style.display = "none"} />
                    <div><strong>{x.name}</strong><small>{x.members ? "Members" : "Free-to-play"}</small></div>
                  </div></td>
                  <td>{money(x.buy)}</td><td>{money(x.sell)}</td>
                  <td><strong className={x.margin > 0 ? "green" : "redtxt"}>{money(x.margin)}</strong><small className="sub">tax {money(x.tax)}</small></td>
                  <td><strong>{pct(x.roi)}</strong></td>
                  <td>{num(x.volume)}</td><td>{num(x.limit)}</td>
                  <td><ChevronRight size={16} className="chev"/></td>
                </tr>
              )}
            {!loading && !filtered.length && <tr><td colSpan="8" className="empty">No items match those filters.</td></tr>}
          </tbody></table>
        </div>
        {marketVisible < filtered.length && <button className="loadMore" onClick={() => setMarketVisible(v => v + 30)}>Load More <span>{filtered.length - marketVisible} more</span></button>}
      </>}

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
      <input type="number" value={c.value} onChange={e => update(c.id,{value:e.target.value === "" ? "" : Number(e.target.value)})}/>
      {c.field === "roi" && <span>%</span>} {c.field !== "roi" && <span>gp / items</span>}
      <button className="dangerIcon" onClick={() => remove(c.id)}><Trash2 size={15}/></button>
    </div>)}
  </div>
}

function Movers({movers,onSelect,filters}) {
  return <section className="movers"><div className="sectionhead"><div><div className="eyebrow">MARKET MOVERS</div><h2>What moved today.</h2></div><p>Top 50 current 1-hour movers, with price and volume filters.</p></div>
    <div className="moverFilters">
      <label>Min price<input type="number" value={filters.moverMinPrice} onChange={e=>filters.setMoverMinPrice(e.target.value)} placeholder="0"/></label>
      <label>Max price<input type="number" value={filters.moverMaxPrice} onChange={e=>filters.setMoverMaxPrice(e.target.value)} placeholder="Any"/></label>
      <label>Min volume<input type="number" value={filters.moverMinVolume} onChange={e=>filters.setMoverMinVolume(e.target.value)} placeholder="0"/></label>
      <label>Max volume<input type="number" value={filters.moverMaxVolume} onChange={e=>filters.setMoverMaxVolume(e.target.value)} placeholder="Any"/></label>
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
  const [metric,setMetric]=useState("sell"); const [direction,setDirection]=useState("above"); const [value,setValue]=useState(100000);
  const found=items.filter(x=>x.name.toLowerCase().includes(q.toLowerCase())).slice(0,7);
  return <div className="modalback"><div className="modal"><button className="close" onClick={onClose}><X/></button><div className="eyebrow">NEW ALERT</div><h2>Watch a price.</h2>
    <label>Item</label><input value={q} onChange={e=>{setQ(e.target.value);const f=items.find(x=>x.name.toLowerCase().includes(e.target.value.toLowerCase()));if(f)setId(f.id)}} placeholder="Search item…"/>
    {q&&<div className="suggest">{found.map(x=><button key={x.id} onClick={()=>{setId(x.id);setQ(x.name)}}>{x.name}</button>)}</div>}
    <div className="twocol"><div><label>Metric</label><select value={metric} onChange={e=>setMetric(e.target.value)}><option value="sell">Sell price</option><option value="buy">Buy price</option><option value="margin">Margin</option><option value="roi">ROI</option></select></div><div><label>Condition</label><select value={direction} onChange={e=>setDirection(e.target.value)}><option value="above">rises above</option><option value="below">drops below</option></select></div></div>
    <label>Threshold</label><input type="number" value={value} onChange={e=>setValue(+e.target.value)}/><button className="primary wide" onClick={()=>{const x=items.find(x=>x.id===id);onSave({id,name:x?.name||"Unknown",metric,direction,value:+value})}}>Create alert</button>
  </div></div>
}

function ChartTooltip({active,payload,label}) {
  if (!active || !payload?.length) return null;
  return <div className="chartTooltip"><strong>{label}</strong>{payload.map(p=><div key={p.dataKey}><span className={`legendDot ${p.dataKey}`}/>{p.dataKey==="buy"?"Buy":"Sell"}: <b>{money(p.value)}</b></div>)}</div>;
}

function ItemPanel({item,history,watch,toggleWatch,close,selectRange}) {
  const [range,setRange] = useState(item.chartRange || "24h");
  useEffect(()=>{ if (!history[range]) selectRange(range); }, [range, history]);
  const data=history[range] || [];
  const vals=data.flatMap(p=>[p.buy,p.sell]).filter(v=>v != null);
  const min=vals.length ? Math.min(...vals) : 0, max=vals.length ? Math.max(...vals) : 1;
  const pad=Math.max((max-min)*0.08, Math.max(max*0.005, 10));
  const domain=[Math.max(0,min-pad),max+pad];
  const labels={ "24h":"24 hours","48h":"48 hours","7d":"1 week","30d":"1 month","6m":"6 months" };
  return <div className="drawerback" onClick={close}><aside className="drawer" onClick={e=>e.stopPropagation()}>
    <button className="close" onClick={close}><X/></button><div className="eyebrow">ITEM ANALYTICS</div>
    <div className="itemtitle"><div className="itemHeading"><img className="titleIcon" src={iconUrl(item.icon)} onError={e=>e.currentTarget.style.display="none"}/><div><h2>{item.name}</h2><p>Grand Exchange · {item.members?"Members":"Free-to-play"}</p></div></div>
      <button className={`star big ${watch.includes(item.id)?"on":""}`} onClick={()=>toggleWatch(item.id)}><Star fill={watch.includes(item.id)?"currentColor":"none"}/></button></div>
    <div className="panelstats"><Stat label="Buy" value={money(item.buy)}/><Stat label="Sell" value={money(item.sell)}/><Stat label="Margin" value={money(item.margin)}/><Stat label="ROI" value={pct(item.roi)}/></div>
    <div className="detailgrid topDetails"><div><span>Max buy limit</span><strong>{num(item.limit)} per 4 hours</strong></div><div><span>1h volume</span><strong>{num(item.volume)}</strong></div><div><span>GE tax</span><strong>{money(item.tax)}</strong></div><div><span>Profit per limit</span><strong>{money(item.potentialProfit)}</strong></div></div>
    <div className="chartbox"><div className="charthead"><div><strong>Price history</strong><small>Buy = black · Sell = red</small></div><span>{labels[range]}</span></div>
      <div className="rangeButtons">{Object.entries(labels).map(([k,v])=><button key={k} className={range===k?"active":""} onClick={()=>{setRange(k);selectRange(k)}}>{v}</button>)}</div>
      {data.length ? <ResponsiveContainer width="100%" height={350}><LineChart data={data} margin={{top:10,right:8,left:0,bottom:5}}>
        <CartesianGrid strokeDasharray="3 5" vertical={false} opacity={0.35}/>
        <XAxis dataKey="timestamp" type="number" domain={["dataMin","dataMax"]} tickFormatter={t=>new Date(t).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})} tick={{fontSize:10,fill:"#999"}}/>
        <YAxis domain={domain} tickFormatter={v=>v>=1000000?`${(v/1000000).toFixed(1)}m`:v>=1000?`${Math.round(v/1000)}k`:v} tick={{fontSize:10,fill:"#999"}} width={48}/>
        <Tooltip content={<ChartTooltip/>}/>
        <Line type="monotone" dataKey="sell" name="Sell" stroke="#d43c3c" strokeWidth={2} dot={false} connectNulls/>
        <Line type="monotone" dataKey="buy" name="Buy" stroke="#111" strokeWidth={2} dot={false} connectNulls/>
      </LineChart></ResponsiveContainer> : <div className="chartloading">Loading history…</div>}
    </div>
    <div className="chartNote"><TrendingUp size={15}/><span>The chart scales to this item's own recent price range, so a large move is visually obvious instead of being flattened by unrelated high-priced items.</span></div>
    <a className="wikiLink" href={`https://prices.runescape.wiki/osrs/item/${item.id}`} target="_blank" rel="noreferrer">Open OSRS Wiki price page <ExternalLink size={14}/></a>
  </aside></div>
}

createRoot(document.getElementById("root")).render(<App/>);
