import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Search, Bell, Star, TrendingUp, TrendingDown, X, ArrowUpDown, ChevronRight, RefreshCw, SlidersHorizontal, Save, Trash2 } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis, Legend } from "recharts";
import "./styles.css";

const API = "https://prices.runescape.wiki/api/v1/osrs";
const TAX_RATE = 0.02;
const TAX_CAP = 5_000_000;
const RANGE_CONFIG = {
  "24h": { label: "24 hours", hours: 24, timestep: "1h", points: 24 },
  "48h": { label: "48 hours", hours: 48, timestep: "1h", points: 48 },
  "1w": { label: "1 week", hours: 168, timestep: "1h", points: 168 },
  "1m": { label: "1 month", hours: 24 * 30, timestep: "6h", points: 120 },
  "6m": { label: "6 months", hours: 24 * 182, timestep: "24h", points: 182 },
};

const money = n => n == null || Number.isNaN(Number(n)) ? "—" : Math.round(n).toLocaleString("en-GB") + " gp";
const pct = n => n == null || Number.isNaN(Number(n)) ? "—" : `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`;
const compact = n => n == null ? "—" : Number(n).toLocaleString("en-GB");

function taxFor(sell) { return Math.min(Math.floor((sell || 0) * TAX_RATE), TAX_CAP); }
function enrich(row, mapping) {
  const m = mapping[row.id] || {};
  const buy = row.low ?? 0, sell = row.high ?? 0;
  const tax = taxFor(sell);
  const profit = sell - buy - tax;
  return { ...row, ...m, buy, sell, tax, margin: profit, roi: buy ? profit / buy * 100 : 0, limit: m.limit ?? m.buyLimit ?? m.geLimit ?? null };
}

const defaultFilters = [{ id: crypto.randomUUID(), field: "margin", op: "gte", value: 50000 }];

function App() {
  const [items, setItems] = useState([]);
  const [mapping, setMapping] = useState({});
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "margin", dir: "desc" });
  const [tab, setTab] = useState("market");
  const [watch, setWatch] = useState(() => JSON.parse(localStorage.getItem("osrsflipit-watch") || "[]"));
  const [alerts, setAlerts] = useState(() => JSON.parse(localStorage.getItem("osrsflipit-alerts") || "[]"));
  const [alertRules, setAlertRules] = useState(() => JSON.parse(localStorage.getItem("osrsflipit-rules") || "[]"));
  const [profiles, setProfiles] = useState(() => JSON.parse(localStorage.getItem("osrsflipit-profiles") || "[]"));
  const [filters, setFilters] = useState(() => JSON.parse(localStorage.getItem("osrsflipit-filters") || "[]"));
  const [matchMode, setMatchMode] = useState(() => localStorage.getItem("osrsflipit-match") || "all");
  const [profileName, setProfileName] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedRange, setSelectedRange] = useState("24h");
  const [ruleModal, setRuleModal] = useState(false);
  const [marketVisible, setMarketVisible] = useState(30);
  const [moverSort, setMoverSort] = useState({ key: "change", dir: "desc" });
  const [moverMaxPrice, setMoverMaxPrice] = useState("");
  const [moverMinVolume, setMoverMinVolume] = useState("");
  const [moverDirection, setMoverDirection] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const [latest, map, five] = await Promise.all([
        fetch(`${API}/latest`).then(r => r.json()),
        fetch(`${API}/mapping`).then(r => r.json()),
        fetch(`${API}/5m`).then(r => r.json())
      ]);
      const mapObj = Object.fromEntries(map.map(x => [x.id, x]));
      const rows = Object.entries(latest.data).map(([id, x]) => enrich({ id: +id, ...x }, mapObj)).filter(x => x.name);
      const vol = five.data || {};
      const next = rows.map(x => ({ ...x, volume: vol[x.id]?.highPriceVolume ?? vol[x.id]?.lowPriceVolume ?? 0 }));
      setItems(next);
      setMapping(mapObj);
      setUpdated(new Date());
      checkRules(next);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function checkRules(rows) {
    const now = Date.now();
    const fresh = [];
    for (const rule of alertRules) {
      const item = rows.find(x => x.id === rule.id);
      if (!item) continue;
      const value = rule.metric === "buy" ? item.buy : rule.metric === "sell" ? item.sell : rule.metric === "margin" ? item.margin : item.roi;
      const hit = rule.direction === "above" ? value >= rule.value : value <= rule.value;
      if (hit && now - (rule.lastTriggered || 0) > 10 * 60 * 1000) {
        fresh.push({ id: crypto.randomUUID(), itemId: item.id, name: item.name, metric: rule.metric, value, target: rule.value, at: now });
        rule.lastTriggered = now;
      }
    }
    if (fresh.length) {
      const next = [...fresh, ...alerts].slice(0, 100);
      setAlerts(next); localStorage.setItem("osrsflipit-alerts", JSON.stringify(next));
      localStorage.setItem("osrsflipit-rules", JSON.stringify(alertRules));
    }
  }

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [alertRules]);
  useEffect(() => localStorage.setItem("osrsflipit-watch", JSON.stringify(watch)), [watch]);
  useEffect(() => localStorage.setItem("osrsflipit-filters", JSON.stringify(filters)), [filters]);
  useEffect(() => localStorage.setItem("osrsflipit-match", matchMode), [matchMode]);
  useEffect(() => localStorage.setItem("osrsflipit-profiles", JSON.stringify(profiles)), [profiles]);
  useEffect(() => setMarketVisible(30), [search, filters, matchMode, sort]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let arr = items.filter(x => x.name.toLowerCase().includes(q));
    if (filters.length) arr = arr.filter(item => {
      const results = filters.map(f => {
        const value = Number(item[f.field] ?? 0);
        const target = Number(f.value ?? 0);
        if (f.op === "gt") return value > target;
        if (f.op === "gte") return value >= target;
        if (f.op === "lt") return value < target;
        if (f.op === "lte") return value <= target;
        if (f.op === "eq") return value === target;
        return true;
      });
      return matchMode === "all" ? results.every(Boolean) : results.some(Boolean);
    });
    arr.sort((a, b) => ((a[sort.key] ?? 0) - (b[sort.key] ?? 0)) * (sort.dir === "asc" ? 1 : -1));
    return arr;
  }, [items, search, sort, filters, matchMode]);

  const movers = useMemo(() => {
    let calc = items.filter(x => x.buy > 0 && x.sell > 0).map(x => ({ ...x, change: (x.sell - x.buy) / x.buy * 100 }));
    if (moverMaxPrice !== "") calc = calc.filter(x => x.sell <= Number(moverMaxPrice));
    if (moverMinVolume !== "") calc = calc.filter(x => x.volume >= Number(moverMinVolume));
    if (moverDirection === "rising") calc = calc.filter(x => x.change >= 0);
    if (moverDirection === "falling") calc = calc.filter(x => x.change < 0);
    calc.sort((a, b) => ((a[moverSort.key] ?? 0) - (b[moverSort.key] ?? 0)) * (moverSort.dir === "asc" ? 1 : -1));
    return calc.slice(0, 50);
  }, [items, moverMaxPrice, moverMinVolume, moverDirection, moverSort]);

  const watched = items.filter(x => watch.includes(x.id));
  const activeAlerts = alerts.filter(a => Date.now() - a.at < 60 * 60 * 1000);

  async function selectItem(item, range = "24h") {
    setSelected(item);
    setSelectedRange(range);
    const config = RANGE_CONFIG[range];
    try {
      const res = await fetch(`${API}/timeseries?timestep=${config.timestep}&id=${item.id}`).then(r => r.json());
      const cutoff = Date.now() / 1000 - config.hours * 3600;
      const data = (res.data || []).filter(p => p.timestamp >= cutoff).slice(-config.points).map(p => ({
        timestamp: p.timestamp,
        time: new Date(p.timestamp * 1000).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
        buy: p.avgLowPrice ?? null,
        sell: p.avgHighPrice ?? null,
      }));
      setHistory(h => ({ ...h, [`${item.id}-${range}`]: data }));
    } catch (e) { console.error(e); }
  }

  function toggleWatch(id) { setWatch(w => w.includes(id) ? w.filter(x => x !== id) : w.length < 100 ? [...w, id] : w); }
  function sortBy(key) { setSort(s => s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }); }
  function moverSortBy(key) { setMoverSort(s => s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }); }
  function clearSearch() { setSearch(""); }

  function addFilter() { setFilters(f => [...f, { id: crypto.randomUUID(), field: "margin", op: "gte", value: 50000 }]); }
  function updateFilter(id, patch) { setFilters(fs => fs.map(f => f.id === id ? { ...f, ...patch } : f)); }
  function removeFilter(id) { setFilters(fs => fs.filter(f => f.id !== id)); }
  function saveProfile() {
    const name = profileName.trim();
    if (!name) return;
    const next = [...profiles.filter(p => p.name.toLowerCase() !== name.toLowerCase()), { name, filters, matchMode }];
    setProfiles(next); setProfileName("");
  }
  function loadProfile(name) {
    const p = profiles.find(x => x.name === name);
    if (!p) return;
    setFilters(p.filters || []); setMatchMode(p.matchMode || "all"); setProfileName("");
  }

  return <div className="app">
    <header className="nav">
      <button className="brand" onClick={() => { setTab("market"); setSelected(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span>OSRS</span>FlipIt</button>
      <div className="navlinks">
        <button className={tab === "market" ? "active" : ""} onClick={() => setTab("market")}>Market</button>
        <button className={tab === "movers" ? "active" : ""} onClick={() => setTab("movers")}>Movers</button>
        <button className={tab === "watch" ? "active" : ""} onClick={() => setTab("watch")}>Watchlist <b>{watch.length}</b></button>
        <button className={tab === "alerts" ? "active" : ""} onClick={() => setTab("alerts")}>Alerts {activeAlerts.length > 0 && <b className="red">{activeAlerts.length}</b>}</button>
      </div>
      <button className="iconbtn" onClick={load} title="Refresh"><RefreshCw size={17} /></button>
    </header>

    <main>
      <section className="hero">
        <div><div className="eyebrow">GRAND EXCHANGE ANALYTICS</div><h1>Find the flip.<br /><em>Keep the profit.</em></h1><p>Live market data, tax-aware margins and clean analytics for OSRS.</p></div>
        <div className="status"><span className="dot" />Live <small>{updated ? `· ${Math.max(0, Math.round((Date.now() - updated) / 1000))}s ago` : ""}</small></div>
      </section>

      {tab === "market" && <>
        <div className="toolbar">
          <div className="search"><Search size={18} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" />{search && <button className="searchclear" onClick={clearSearch} aria-label="Clear search"><X size={17} /></button>}</div>
          <div className="chips"><span>After GE tax</span><span>Live prices</span></div>
        </div>

        <FilterPanel filters={filters} matchMode={matchMode} setMatchMode={setMatchMode} addFilter={addFilter} updateFilter={updateFilter} removeFilter={removeFilter} profiles={profiles} profileName={profileName} setProfileName={setProfileName} saveProfile={saveProfile} loadProfile={loadProfile} setFilters={setFilters} />

        <div className="stats"><Stat label="Items tracked" value={items.length.toLocaleString()} /><Stat label="Best margin" value={items.length ? money(Math.max(...items.map(x => x.margin))) : "—"} /><Stat label="Highest ROI" value={items.length ? pct(Math.max(...items.map(x => x.roi))) : "—"} /><Stat label="Tracked" value={watch.length} /></div>
        <div className="tablewrap"><table><thead><tr><th>Item</th><Th t="buy" label="Buy price" sort={sort} on={sortBy} /><Th t="sell" label="Sell price" sort={sort} on={sortBy} /><Th t="margin" label="Margin" sort={sort} on={sortBy} /><Th t="roi" label="ROI" sort={sort} on={sortBy} /><Th t="volume" label="Volume" sort={sort} on={sortBy} /><th /></tr></thead>
          <tbody>{loading && !items.length ? <tr><td colSpan="7" className="empty">Loading the Grand Exchange…</td></tr> : filtered.slice(0, marketVisible).map(x => <MarketRow key={x.id} x={x} watched={watch.includes(x.id)} onSelect={selectItem} toggleWatch={toggleWatch} />)}</tbody>
        </table></div>
        {!loading && filtered.length > marketVisible && <button className="loadmore" onClick={() => setMarketVisible(v => v + 30)}>Load more · {Math.min(30, filtered.length - marketVisible)} more</button>}
        {!loading && !filtered.length && <div className="emptybox">No items match those filters.</div>}
      </>}

      {tab === "movers" && <Movers movers={movers} sort={moverSort} sortBy={moverSortBy} filters={{ moverMaxPrice, setMoverMaxPrice, moverMinVolume, setMoverMinVolume, moverDirection, setMoverDirection }} onSelect={selectItem} />}
      {tab === "watch" && <Watch watched={watched} onSelect={selectItem} toggleWatch={toggleWatch} />}
      {tab === "alerts" && <Alerts alerts={activeAlerts} all={alerts} rules={alertRules} setRules={setAlertRules} setAlerts={setAlerts} open={() => setRuleModal(true)} onSelect={id => { const item = items.find(x => x.id === id); if (item) selectItem(item, "48h"); }} />}
    </main>

    {selected && <ItemPanel item={selected} history={history[`${selected.id}-${selectedRange}`] || []} range={selectedRange} setRange={range => selectItem(selected, range)} watch={watch} toggleWatch={toggleWatch} close={() => setSelected(null)} />}
    {ruleModal && <RuleModal items={items} onClose={() => setRuleModal(false)} onSave={rule => { if (alertRules.length >= 20) { alert("You can have up to 20 alert rules."); return; } const next = [...alertRules, { ...rule, lastTriggered: 0 }]; setAlertRules(next); localStorage.setItem("osrsflipit-rules", JSON.stringify(next)); setRuleModal(false); }} />}
  </div>;
}

function Stat({ label, value }) { return <div className="stat"><small>{label}</small><strong>{value}</strong></div>; }
function Th({ t, label, sort, on }) { return <th><button className="thbtn" onClick={() => on(t)}>{label}<ArrowUpDown size={13} />{sort.key === t && <span>{sort.dir === "desc" ? "↓" : "↑"}</span>}</button></th>; }
function ItemIcon({ item, size = 28 }) { return item.icon ? <img className="itemicon" src={item.icon} alt="" width={size} height={size} loading="lazy" /> : <span className="itemicon placeholder" style={{ width: size, height: size }} />; }

function MarketRow({ x, watched, onSelect, toggleWatch }) {
  return <tr onClick={() => onSelect(x)}><td><div className="item"><button className={`star ${watched ? "on" : ""}`} onClick={e => { e.stopPropagation(); toggleWatch(x.id); }}><Star size={15} fill={watched ? "currentColor" : "none"} /></button><ItemIcon item={x} /><div><strong>{x.name}</strong><small>{x.members ? "Members" : "Free-to-play"}</small></div></div></td><td>{money(x.buy)}</td><td>{money(x.sell)}</td><td><strong className={x.margin > 0 ? "green" : "redtxt"}>{money(x.margin)}</strong><small className="sub">tax {money(x.tax)}</small></td><td><strong>{pct(x.roi)}</strong></td><td>{compact(x.volume)}</td><td><ChevronRight size={16} className="chev" /></td></tr>;
}

function FilterPanel({ filters, matchMode, setMatchMode, addFilter, updateFilter, removeFilter, profiles, profileName, setProfileName, saveProfile, loadProfile, setFilters }) {
  return <section className="filterpanel"><div className="filtertop"><div><div className="eyebrow"><SlidersHorizontal size={12} /> MARKET FILTERS</div><strong>Build your own market view</strong></div><div className="filteractions"><select value={matchMode} onChange={e => setMatchMode(e.target.value)}><option value="all">Match all filters</option><option value="any">Match any filter</option></select><button className="secondary" onClick={() => setFilters([])}>Clear</button><button className="secondary" onClick={addFilter}>+ Add filter</button></div></div>{filters.length > 0 && <div className="filterlist">{filters.map(f => <div className="filterrow" key={f.id}><select value={f.field} onChange={e => updateFilter(f.id, { field: e.target.value })}><option value="margin">Margin</option><option value="volume">Volume</option><option value="buy">Buy price</option><option value="sell">Sell price</option><option value="roi">ROI</option></select><select value={f.op} onChange={e => updateFilter(f.id, { op: e.target.value })}><option value="gt">greater than</option><option value="gte">equal to or greater than</option><option value="eq">equal to</option><option value="lte">equal to or less than</option><option value="lt">less than</option></select><input type="number" value={f.value} onChange={e => updateFilter(f.id, { value: e.target.value })} /><span className="unit">{f.field === "roi" ? "%" : "gp"}</span><button className="removefilter" onClick={() => removeFilter(f.id)}><X size={15} /></button></div>)}</div>}
    <div className="profiles"><div className="profileinput"><input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Profile name e.g. High volume 50k profit" /><button className="secondary" onClick={saveProfile}><Save size={14} /> Save profile</button></div>{profiles.length > 0 && <div className="profilechips">{profiles.map(p => <button key={p.name} onClick={() => loadProfile(p.name)} title="Load profile">{p.name}</button>)}</div>}</div></section>;
}

function Movers({ movers, onSelect, filters, sort, sortBy }) {
  return <section className="movers"><div className="sectionhead"><div><div className="eyebrow">MARKET MOVERS</div><h2>Top 50 movers.</h2></div><p>Filter and sort the biggest current buy/sell spread changes.</p></div><div className="moverfilters"><label>Max price<input type="number" value={filters.moverMaxPrice} onChange={e => filters.setMoverMaxPrice(e.target.value)} placeholder="Any" /></label><label>Min volume<input type="number" value={filters.moverMinVolume} onChange={e => filters.setMoverMinVolume(e.target.value)} placeholder="Any" /></label><label>Direction<select value={filters.moverDirection} onChange={e => filters.setMoverDirection(e.target.value)}><option value="all">All</option><option value="rising">Rising</option><option value="falling">Falling</option></select></label><button className="secondary" onClick={() => { filters.setMoverMaxPrice(""); filters.setMoverMinVolume(""); filters.setMoverDirection("all"); }}>Reset</button></div><div className="movergrid50">{movers.map((x, i) => <button className="moverrow" key={x.id} onClick={() => onSelect(x)}><span className="rank">{String(i + 1).padStart(2, "0")}</span><ItemIcon item={x} size={26} /><span className="mname"><strong>{x.name}</strong><small>{compact(x.volume)} volume</small></span><span className="mprice">{money(x.sell)}</span><b className={x.change >= 0 ? "green" : "redtxt"}>{pct(x.change)}</b><ChevronRight size={15} /></button>)}</div>{!movers.length && <div className="emptybox">No movers match those filters.</div>}</section>;
}

function Watch({ watched, onSelect, toggleWatch }) { return <section><div className="sectionhead"><div><div className="eyebrow">WATCHLIST</div><h2>Your items.</h2></div><p>{watched.length}/100 saved locally in this browser.</p></div><div className="cards">{watched.length ? watched.map(x => <button className="watchcard" key={x.id} onClick={() => onSelect(x)}><ItemIcon item={x} size={34} /><div><strong>{x.name}</strong><small>{money(x.buy)} → {money(x.sell)}</small></div><b className={x.margin >= 0 ? "green" : "redtxt"}>{money(x.margin)}</b><span onClick={e => { e.stopPropagation(); toggleWatch(x.id); }}><X size={16} /></span></button>) : <div className="emptybox">Star items in the market table to keep them here.</div>}</div></section>; }

function Alerts({ alerts, all, rules, setRules, setAlerts, open, onSelect }) { return <section><div className="sectionhead"><div><div className="eyebrow">PRICE ALERTS</div><h2>Stay ahead of the move.</h2></div><button className="primary" onClick={open}>+ New alert</button></div><div className="alertintro"><Bell size={19} /><div><strong>20 alert rules max</strong><p>Click any alert notification to open its live item chart.</p></div></div><div className="rulelist">{rules.map((r, i) => <div className="rule" key={i}><span className="ruleicon"><Bell size={15} /></span><div><strong>{r.name || `Item #${r.id}`}</strong><small>{r.metric} {r.direction} {r.value.toLocaleString()} {r.metric === "roi" ? "%" : "gp"}</small></div><button onClick={() => { const n = rules.filter((_, j) => j !== i); setRules(n); localStorage.setItem("osrsflipit-rules", JSON.stringify(n)); }}><X size={16} /></button></div>)}</div><h3 className="historytitle">Recent notifications</h3>{all.length ? <div className="notificationlist">{all.map(a => <button className="notification" key={a.id} onClick={() => onSelect(a.itemId)}><span className="ndot" /><div><strong>{a.name}</strong><small>{a.metric} hit {a.target.toLocaleString()}{a.metric === "roi" ? "%" : " gp"} · {new Date(a.at).toLocaleString("en-GB")}</small></div><ChevronRight size={15} /></button>)}</div> : <div className="emptybox">No alerts yet.</div>}<button className="clear" onClick={() => { setAlerts([]); localStorage.setItem("osrsflipit-alerts", "[]"); }}><Trash2 size={13} /> Clear all notifications</button></section>; }

function RuleModal({ items, onClose, onSave }) { const [q, setQ] = useState(""); const [id, setId] = useState(items[0]?.id); const [metric, setMetric] = useState("sell"); const [direction, setDirection] = useState("above"); const [value, setValue] = useState(100000); const found = items.filter(x => x.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5); return <div className="modalback"><div className="modal"><button className="close" onClick={onClose}><X /></button><div className="eyebrow">NEW ALERT</div><h2>Watch a price.</h2><label>Item</label><input value={q} onChange={e => { setQ(e.target.value); const f = items.find(x => x.name.toLowerCase().includes(e.target.value.toLowerCase())); if (f) setId(f.id); }} placeholder="Search item…" />{q && <div className="suggest">{found.map(x => <button key={x.id} onClick={() => { setId(x.id); setQ(x.name); }}>{x.name}</button>)}</div>}<div className="twocol"><div><label>Metric</label><select value={metric} onChange={e => setMetric(e.target.value)}><option value="sell">Sell price</option><option value="buy">Buy price</option><option value="margin">Margin</option><option value="roi">ROI</option></select></div><div><label>Condition</label><select value={direction} onChange={e => setDirection(e.target.value)}><option value="above">rises above</option><option value="below">drops below</option></select></div></div><label>Threshold</label><input type="number" value={value} onChange={e => setValue(+e.target.value)} /><button className="primary wide" onClick={() => { const x = items.find(x => x.id === id); onSave({ id, name: x?.name || "Unknown", metric, direction, value: +value }); }}>Create alert</button></div></div>; }

function ItemPanel({ item, history, range, setRange, watch, toggleWatch, close }) {
  return <div className="drawerback" onClick={close}><aside className="drawer" onClick={e => e.stopPropagation()}><button className="close" onClick={close}><X /></button><div className="eyebrow">ITEM ANALYTICS</div><div className="itemtitle"><div className="itemheading"><ItemIcon item={item} size={40} /><div><h2>{item.name}</h2><p>Grand Exchange · {item.members ? "Members" : "Free-to-play"}</p></div></div><button className={`star big ${watch.includes(item.id) ? "on" : ""}`} onClick={() => toggleWatch(item.id)}><Star fill={watch.includes(item.id) ? "currentColor" : "none"} /></button></div><div className="panelstats"><Stat label="Buy" value={money(item.buy)} /><Stat label="Sell" value={money(item.sell)} /><Stat label="Margin" value={money(item.margin)} /><Stat label="ROI" value={pct(item.roi)} /></div><div className="limitbox"><div><span>Max buy limit</span><strong>{item.limit != null ? compact(item.limit) : "—"}</strong></div><small>GE buy limit per 4 hours</small></div><div className="chartbox"><div className="charthead"><div><strong>Buy & sell price history</strong><span>Hover for exact date, time and prices</span></div><div className="rangebuttons">{Object.entries(RANGE_CONFIG).map(([key, cfg]) => <button className={range === key ? "active" : ""} key={key} onClick={() => setRange(key)}>{key === "1w" ? "Weekly" : key === "1m" ? "Monthly" : key === "6m" ? "6 months" : cfg.label.replace(" hours", "h")}</button>)}</div></div>{history.length ? <ResponsiveContainer width="100%" height={330}><LineChart data={history} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}><CartesianGrid strokeDasharray="3 5" vertical={false} opacity={0.35} /><XAxis dataKey="time" minTickGap={45} tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={v => compact(v)} width={68} /><Tooltip content={<PriceTooltip />} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} /><Line type="monotone" dataKey="buy" name="Buy" stroke="#111" strokeWidth={2} dot={false} connectNulls /><Line type="monotone" dataKey="sell" name="Sell" stroke="#d43c3c" strokeWidth={2} dot={false} connectNulls /></LineChart></ResponsiveContainer> : <div className="chartloading">Loading {RANGE_CONFIG[range].label.toLowerCase()} history…</div>}</div><div className="detailgrid"><div><span>GE tax</span><strong>{money(item.tax)}</strong></div><div><span>Volume</span><strong>{compact(item.volume)}</strong></div></div></aside></div>;
}

function PriceTooltip({ active, payload, label }) { if (!active || !payload?.length) return null; const buy = payload.find(p => p.dataKey === "buy")?.value; const sell = payload.find(p => p.dataKey === "sell")?.value; return <div className="pricetooltip"><strong>{label}</strong>{buy != null && <div><span className="buydot" />Buy <b>{money(buy)}</b></div>}{sell != null && <div><span className="selldot" />Sell <b>{money(sell)}</b></div>}</div>; }

createRoot(document.getElementById("root")).render(<App />);
