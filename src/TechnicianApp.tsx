import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { slaState, timeRemaining, type DemoState, type Store, type WorkOrder, type WorkPhoto, type Asset } from "./demoData";
import { defaultChecklist } from "./WorkingModules";

/* AKARIA Technician app — same records as the web portal, shown inside an iPhone 17 Pro Max frame. */
const TECH = "Khalid Rahman";
const LOGO = `${import.meta.env.BASE_URL}akaria-logo.png`;
const SITE_INFO: Record<string, { address: string; q: string; km: number; min: number }> = {
  "SITE-NR": { address: "King Salman Rd, Al Narjis, Riyadh", q: "Al Narjis Riyadh", km: 8.4, min: 14 },
  "SITE-OL": { address: "Olaya St, Al Olaya, Riyadh", q: "Olaya Street Riyadh", km: 5.1, min: 11 },
  "SITE-JED": { address: "Prince Sultan Rd, Al Zahra, Jeddah", q: "Prince Sultan Road Jeddah", km: 12.6, min: 22 },
  "SITE-DAM": { address: "King Saud St, Al Faisaliyah, Dammam", q: "King Saud Street Dammam", km: 9.8, min: 17 },
};
const STAGES = [
  { key: "accept", label: "Accept job" },
  { key: "travel", label: "Go to job" },
  { key: "scan", label: "Scan machine QR" },
  { key: "checklist", label: "Checklist" },
  { key: "work", label: "Perform job" },
  { key: "parts", label: "Spare parts" },
  { key: "photos", label: "Photos" },
  { key: "close", label: "Sign-off & close" },
] as const;
type StageKey = (typeof STAGES)[number]["key"];
type Tab = "jobs" | "calendar" | "scan" | "alerts" | "profile";

/* ───────── icons ───────── */
const ic = (d: string) => ({ size = 20, className }: { size?: number; className?: string }) => <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden dangerouslySetInnerHTML={{ __html: d }} />;
const IHome = ic('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>');
const ICal = ic('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>');
const IScan = ic('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>');
const IBell = ic('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>');
const IUser = ic('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>');
const IBack = ic('<path d="m15 18-6-6 6-6"/>');
const IChev = ic('<path d="m9 18 6-6-6-6"/>');
const IPin = ic('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>');
const IClock = ic('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>');
const IWrench = ic('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>');
const ICheck = ic('<path d="M20 6 9 17l-5-5"/>');
const ICam = ic('<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>');
const IBox = ic('<path d="m21 8-9-5-9 5 9 5zM3 8v8l9 5 9-5V8M12 13v8"/>');
const IList = ic('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12l2 2 4-4"/>');
const IRoute = ic('<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>');
const ISign = ic('<path d="M3 17c3-3 5-1 7-3s1-5 4-5 2 4 5 4M3 21h18"/>');
const ITicket = ic('<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v14" stroke-dasharray="2 3"/>');
const IPlay = ic('<path d="m6 3 14 9-14 9z"/>');
const IPause = ic('<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>');
const ILogout = ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>');
const stageIcon: Record<StageKey, ReturnType<typeof ic>> = { accept: ICheck, travel: IRoute, scan: IScan, checklist: IList, work: IWrench, parts: IBox, photos: ICam, close: ISign };

/* ───────── helpers ───────── */
const now = () => new Date().toISOString();
const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—");
const fmtDay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : "—");
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const prioTone = (p: string) => (p === "Emergency" || p === "Critical" ? "danger" : p === "High" ? "warn" : p === "Medium" ? "info" : "ok");
const siteName = (d: DemoState, id: string) => d.sites.find((s) => s.id === id)?.name ?? id;
function stepsFor(d: DemoState, wo: WorkOrder) {
  const plan = d.ppmPlans.find((p) => p.id === wo.ppmId);
  const fromPlan = plan?.checklist?.split("\n").map((x) => x.trim()).filter(Boolean) ?? [];
  return fromPlan.length ? fromPlan : defaultChecklist(d.assets.find((a) => a.id === wo.assetId)?.category);
}
function stageDone(d: DemoState, wo: WorkOrder, k: StageKey) {
  switch (k) {
    case "accept": return Boolean(wo.acceptedAt);
    case "travel": return Boolean(wo.arrivedAt);
    case "scan": return Boolean(wo.assetVerifiedAt) || !wo.assetId;
    case "checklist": return Boolean(wo.checklistDone);
    case "work": return Boolean(wo.diagnosis);
    case "parts": return Boolean(wo.partsReviewed) || d.movements.some((m) => m.workOrderId === wo.id);
    case "photos": return (wo.photos?.length ?? 0) > 0;
    case "close": return wo.status === "Closed";
  }
}
const nextStage = (d: DemoState, wo: WorkOrder) => STAGES.find((s) => !stageDone(d, wo, s.key))?.key;
function makeThumb(source: CanvasImageSource, w: number, h: number) {
  const max = 360, scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas"); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  c.getContext("2d")!.drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.72);
}
function samplePhoto(asset: Asset | undefined, stage: string) {
  const c = document.createElement("canvas"); c.width = 360; c.height = 270; const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 360, 270); grad.addColorStop(0, stage === "Before" ? "#5b6b80" : "#2f7d5b"); grad.addColorStop(1, "#1a2638");
  g.fillStyle = grad; g.fillRect(0, 0, 360, 270);
  g.fillStyle = "rgba(255,255,255,.12)"; for (let i = 0; i < 6; i++) g.fillRect(40 + i * 48, 70, 30, 120);
  g.strokeStyle = "rgba(255,255,255,.5)"; g.lineWidth = 3; g.strokeRect(30, 60, 300, 140);
  g.fillStyle = "#fff"; g.font = "600 18px Inter, sans-serif"; g.fillText(`${asset?.tag ?? "Site"} · ${stage}`, 20, 32);
  g.font = "13px Inter, sans-serif"; g.fillText(new Date().toLocaleString(), 20, 250);
  return c.toDataURL("image/jpeg", 0.75);
}
function FakeQr({ value, size = 120 }: { value: string; size?: number }) {
  const n = 21; let seed = [...value].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  const cells: ReactNode[] = [];
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (finder(x, y)) continue;
    if (rnd() > 0.52) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
  }
  const eye = (x: number, y: number) => <g key={`e${x}${y}`}><rect x={x} y={y} width="7" height="7" /><rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" /><rect x={x + 2} y={y + 2} width="3" height="3" /></g>;
  return <svg width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} fill="#0b2141" role="img" aria-label={`QR code ${value}`}><rect x="-1" y="-1" width={n + 2} height={n + 2} fill="#fff" />{cells}{eye(0, 0)}{eye(n - 7, 0)}{eye(0, n - 7)}</svg>;
}

/* ───────── iPhone 17 Pro Max frame (440 × 956 pt) ───────── */
export function IPhoneFrame({ children }: { children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);
  useEffect(() => {
    const fit = () => { const el = box.current; if (!el) return; const h = el.clientHeight, w = el.clientWidth; setScale(Math.min(1, (h - 8) / 980, (w - 8) / 464)); };
    fit(); const ro = new ResizeObserver(fit); if (box.current) ro.observe(box.current); return () => ro.disconnect();
  }, []);
  return <div className="ip-fit" ref={box}><div className="ip-scaled" style={{ width: 464 * scale, height: 980 * scale }}><div className="ip-device" style={{ transform: `scale(${scale})` }}>
    <span className="ip-btn ip-action" /><span className="ip-btn ip-vol1" /><span className="ip-btn ip-vol2" /><span className="ip-btn ip-power" /><span className="ip-btn ip-camera" />
    <div className="ip-screen" id="tx-screen">{children}</div>
    <div className="ip-island" aria-hidden><i /></div>
  </div></div></div>;
}
function StatusBar({ light }: { light?: boolean }) {
  return <div className={`tx-status ${light ? "light" : ""}`}><b>9:41</b><span><i className="sig"><em /><em /><em /><em /></i><svg width="16" height="12" viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M2 6.5a15 15 0 0 1 20 0M5.5 10.5a10 10 0 0 1 13 0M9 14.2a5 5 0 0 1 6 0" /></svg><i className="bat"><em /></i></span></div>;
}

/* ───────── app ───────── */
export default function TechnicianApp({ store, onExit }: { store: Store; onExit?: () => void }) {
  const { data } = store;
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState<Tab>("jobs");
  const [jobId, setJobId] = useState<string | null>(null);
  const [stage, setStage] = useState<StageKey | null>(null);
  const [toast, setToast] = useState("");
  const [assetView, setAssetView] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { document.getElementById("tx-scroll")?.scrollTo({ top: 0 }); }, [tab, jobId, stage, assetView]);
  const mine = data.workOrders.filter((w) => !w.archived && w.assignee === TECH);
  const open = mine.filter((w) => w.status !== "Closed").sort((a, b) => Date.parse(a.resolutionDueAt) - Date.parse(b.resolutionDueAt));
  const job = jobId ? data.workOrders.find((w) => w.id === jobId) : undefined;
  const run = (fn: () => string | void) => { try { const m = fn(); if (m) setToast(m); } catch (e) { setToast(e instanceof Error ? e.message : String(e)); } };
  const openJob = (id: string) => { setJobId(id); setStage(null); setAssetView(null); };
  const goTab = (t: Tab) => { setTab(t); setJobId(null); setStage(null); setAssetView(null); };

  let screen: ReactNode;
  if (!signedIn) screen = <LoginScreen onSignIn={() => setSignedIn(true)} onExit={onExit} />;
  else if (assetView) screen = <AssetScreen data={data} assetId={assetView} onBack={() => setAssetView(null)} onOpenJob={openJob} />;
  else if (job && stage) screen = <StageScreen key={stage} store={store} wo={job} stage={stage} run={run} onBack={() => setStage(null)} onNext={(k) => setStage(k)} onAsset={setAssetView} />;
  else if (job) screen = <JobScreen data={data} wo={job} onBack={() => setJobId(null)} onStage={setStage} onAsset={setAssetView} />;
  else if (tab === "calendar") screen = <CalendarScreen data={data} jobs={mine} onOpen={openJob} />;
  else if (tab === "scan") screen = <ScanScreen data={data} onFound={setAssetView} />;
  else if (tab === "alerts") screen = <AlertsScreen data={data} jobs={open} onOpen={openJob} />;
  else if (tab === "profile") screen = <ProfileScreen data={data} jobs={mine} onSignOut={() => { setSignedIn(false); goTab("jobs"); }} />;
  else screen = <HomeScreen data={data} jobs={open} all={mine} onOpen={openJob} onTab={goTab} />;

  const showNav = signedIn && !job && !assetView;
  return <div className="tx-app">
    {screen}
    {showNav && <div className="tx-nav" role="navigation" aria-label="App sections">
      {([["jobs", "Jobs", IHome], ["calendar", "Calendar", ICal], ["scan", "Scan", IScan], ["alerts", "Alerts", IBell], ["profile", "Profile", IUser]] as const).map(([k, label, Icon]) => <button key={k} className={`${tab === k ? "on" : ""} ${k === "scan" ? "fab" : ""}`} aria-current={tab === k ? "page" : undefined} onClick={() => goTab(k)}><span><Icon size={k === "scan" ? 24 : 21} /></span><small>{label}</small>{k === "alerts" && open.some((w) => slaState(w) !== "On Track") && <i className="tx-dot" />}</button>)}
    </div>}
    {toast && <div className="tx-toast" role="status">{toast}</div>}
  </div>;
}

function Screen({ children, nav, light }: { children: ReactNode; nav?: boolean; light?: boolean }) {
  return <div className={`tx-screen ${nav ? "with-nav" : ""}`}><StatusBar light={light} /><div className="tx-scroll" id="tx-scroll">{children}</div></div>;
}
function Header({ title, sub, onBack, right }: { title: string; sub?: string; onBack?: () => void; right?: ReactNode }) {
  return <div className="tx-header">{onBack && <button className="tx-round" aria-label="Back" onClick={onBack}><IBack /></button>}<div><small>{sub}</small><h1>{title}</h1></div>{right}</div>;
}

/* ───────── login ───────── */
function LoginScreen({ onSignIn, onExit }: { onSignIn: () => void; onExit?: () => void }) {
  const [id, setId] = useState("KR-1042"), [pw, setPw] = useState("••••••••");
  return <div className="tx-screen tx-login"><StatusBar light />
    <div className="tx-login-hero"><img src={LOGO} alt="AKARIA" /><span>Technician</span><h1>Good morning</h1><p>Sign in to see the jobs assigned to you today.</p></div>
    <form className="tx-login-card" onSubmit={(e) => { e.preventDefault(); onSignIn(); }}>
      <label>Employee ID<input value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" /></label>
      <label>Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></label>
      <button className="tx-cta" type="submit">Sign in</button>
      <button className="tx-ghost" type="button" onClick={onSignIn}>Sign in with AKARIA SSO</button>
      <small>Demo sign-in for Khalid Rahman · HVAC technician</small>
      {onExit && <button className="tx-link" type="button" onClick={onExit}>← Back to portal login</button>}
    </form>
  </div>;
}

/* ───────── home (assigned jobs) ───────── */
function JobCard({ data, wo, onOpen }: { data: DemoState; wo: WorkOrder; onOpen: (id: string) => void }) {
  const asset = data.assets.find((a) => a.id === wo.assetId); const st = slaState(wo);
  const done = STAGES.filter((s) => stageDone(data, wo, s.key)).length;
  return <button className="tx-job" onClick={() => onOpen(wo.id)}>
    <div className="tx-job-top"><b>{wo.id}</b><span className={`tx-pill ${prioTone(wo.priority)}`}>{wo.priority}</span></div>
    <strong>{wo.title}</strong>
    <div className="tx-job-meta"><span><IPin size={14} />{siteName(data, wo.siteId)}{asset ? ` · ${asset.tag}` : ""}</span><span><IClock size={14} />{fmtDay(wo.scheduledAt ?? wo.resolutionDueAt)} {fmtTime(wo.scheduledAt ?? wo.resolutionDueAt)}</span></div>
    <div className="tx-job-foot"><div className="tx-progress"><i style={{ width: `${(done / STAGES.length) * 100}%` }} /></div><span className={st === "Breached" ? "bad" : st === "At Risk" ? "warn" : ""}>{wo.status === "Closed" ? "Closed" : timeRemaining(wo.resolutionDueAt)}</span></div>
  </button>;
}
function HomeScreen({ data, jobs, all, onOpen, onTab }: { data: DemoState; jobs: WorkOrder[]; all: WorkOrder[]; onOpen: (id: string) => void; onTab: (t: Tab) => void }) {
  const [filter, setFilter] = useState("All");
  const today = new Date();
  const dueToday = jobs.filter((w) => sameDay(new Date(w.scheduledAt ?? w.resolutionDueAt), today)).length;
  const risk = jobs.filter((w) => slaState(w) !== "On Track").length;
  const closedMonth = all.filter((w) => w.status === "Closed" && w.resolvedAt && new Date(w.resolvedAt).getMonth() === today.getMonth()).length;
  const shown = jobs.filter((w) => filter === "All" || (filter === "Today" ? sameDay(new Date(w.scheduledAt ?? w.resolutionDueAt), today) : filter === "Preventive" ? w.type === "Preventive" : w.type !== "Preventive"));
  const next = jobs[0];
  return <Screen nav>
    <div className="tx-home-head"><div className="tx-avatar">KR</div><div><small>{today.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</small><h1>Hello, Khalid</h1></div><button className="tx-round" aria-label="Alerts" onClick={() => onTab("alerts")}><IBell />{risk > 0 && <i className="tx-dot" />}</button></div>
    {next && <button className="tx-hero" onClick={() => onOpen(next.id)}>
      <small>Next job</small><h2>{next.title}</h2>
      <p>{next.id} · {siteName(data, next.siteId)}</p>
      <div className="tx-hero-foot"><span className={`tx-pill on-dark ${prioTone(next.priority)}`}>{next.priority}</span><span><IClock size={14} /> {timeRemaining(next.resolutionDueAt)}</span><b>Open <IChev size={16} /></b></div>
    </button>}
    <div className="tx-kpis">{[["Assigned", jobs.length, "info"], ["Due today", dueToday, "warn"], ["SLA at risk", risk, risk ? "danger" : "ok"], ["Closed this month", closedMonth, "ok"]].map(([l, v, t]) => <div key={String(l)} className={`tx-kpi ${t}`}><b>{v}</b><small>{l}</small></div>)}</div>
    <div className="tx-section-head"><h3>My work orders</h3><span>{shown.length}</span></div>
    <div className="tx-chips">{["All", "Today", "Corrective", "Preventive"].map((f) => <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>)}</div>
    <div className="tx-list">{shown.map((w) => <JobCard key={w.id} data={data} wo={w} onOpen={onOpen} />)}{!shown.length && <p className="tx-empty">No jobs match this filter.</p>}</div>
  </Screen>;
}

/* ───────── calendar ───────── */
function CalendarScreen({ data, jobs, onOpen }: { data: DemoState; jobs: WorkOrder[]; onOpen: (id: string) => void }) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, i) => new Date(start.getTime() + i * 86400000));
  const [day, setDay] = useState(start.getTime());
  const when = (w: WorkOrder) => new Date(w.scheduledAt ?? w.resolutionDueAt);
  const onDay = jobs.filter((w) => sameDay(when(w), new Date(day))).sort((a, b) => when(a).getTime() - when(b).getTime());
  const plans = data.ppmPlans.filter((p) => !p.archived && p.assignee === TECH && sameDay(new Date(p.nextDueAt), new Date(day)));
  return <Screen nav>
    <Header title="Calendar" sub={new Date(day).toLocaleDateString(undefined, { month: "long", year: "numeric" })} />
    <div className="tx-week">{days.map((d) => { const n = jobs.filter((w) => sameDay(when(w), d)).length; return <button key={d.getTime()} className={d.getTime() === day ? "on" : ""} onClick={() => setDay(d.getTime())}><small>{d.toLocaleDateString(undefined, { weekday: "short" })}</small><b>{d.getDate()}</b><i>{Array.from({ length: Math.min(n, 3) }, (_, k) => <em key={k} />)}</i></button>; })}</div>
    <div className="tx-section-head"><h3>{sameDay(new Date(day), start) ? "Today" : fmtDay(new Date(day).toISOString())}</h3><span>{onDay.length + plans.length}</span></div>
    <div className="tx-agenda">{onDay.map((w) => <button key={w.id} className="tx-slot" onClick={() => onOpen(w.id)}><time>{fmtTime(when(w).toISOString())}</time><div className={`tx-slot-card ${prioTone(w.priority)}`}><b>{w.title}</b><small>{w.id} · {siteName(data, w.siteId)} · {w.status}</small></div></button>)}
      {plans.map((p) => <div key={p.id} className="tx-slot"><time>{fmtTime(p.nextDueAt)}</time><div className="tx-slot-card info"><b>{p.title}</b><small>{p.id} · PPM due · work order is generated ahead of time</small></div></div>)}
      {!onDay.length && !plans.length && <p className="tx-empty">Nothing scheduled. Pick another day.</p>}</div>
  </Screen>;
}

/* ───────── scan tab + asset history ───────── */
function ScanScreen({ data, onFound, expected, onVerified }: { data: DemoState; onFound?: (id: string) => void; expected?: Asset; onVerified?: (ok: boolean, a?: Asset) => void }) {
  const [code, setCode] = useState(""), [scanning, setScanning] = useState(false), [err, setErr] = useState("");
  const find = (raw: string) => data.assets.find((a) => [a.tag, a.id].some((x) => x.toLowerCase() === raw.trim().toLowerCase()));
  const submit = (raw: string) => { const a = find(raw); if (!a) { setErr(`No machine found for "${raw}". Check the tag and try again.`); return; } setErr(""); if (onVerified) onVerified(!expected || a.id === expected.id, a); else onFound?.(a.id); };
  const simulate = () => { setScanning(true); setErr(""); setTimeout(() => { setScanning(false); submit((expected ?? data.assets[0]).tag); }, 1300); };
  const body = <>
    <div className={`tx-viewfinder ${scanning ? "busy" : ""}`}><div className="tx-vf-corners" /><div className="tx-vf-line" /><FakeQr value={(expected ?? data.assets[0]).id} size={130} /><small>{scanning ? "Reading QR code…" : "Point the camera at the QR tag on the machine"}</small></div>
    <button className="tx-cta" onClick={simulate} disabled={scanning}><IScan size={18} /> {scanning ? "Scanning…" : "Scan QR code"}</button>
    <form className="tx-manual" onSubmit={(e) => { e.preventDefault(); submit(code); }}><input aria-label="Asset tag" placeholder="Or type the asset tag, e.g. AHU-04" value={code} onChange={(e) => setCode(e.target.value)} /><button type="submit">Find</button></form>
    {err && <p className="tx-error" role="alert">{err}</p>}
    {!expected && <><div className="tx-section-head"><h3>Machines at your sites</h3></div><div className="tx-list">{data.assets.filter((a) => !a.archived).map((a) => <button key={a.id} className="tx-row" onClick={() => onFound?.(a.id)}><span className="tx-row-ic"><IBox size={18} /></span><span><b>{a.tag} · {a.title}</b><small>{siteName(data, a.siteId)} · {a.location}</small></span><IChev size={16} /></button>)}</div></>}
  </>;
  if (expected) return body;
  return <Screen nav><Header title="Scan machine" sub="QR / barcode" />{body}</Screen>;
}
function AssetCard({ data, asset }: { data: DemoState; asset: Asset }) {
  const warrantyLeft = Math.round((Date.parse(asset.warrantyUntil) - Date.now()) / 86400000);
  return <div className="tx-asset">
    <div className="tx-asset-top"><FakeQr value={asset.id} size={64} /><div><small>{asset.category} · {asset.criticality}</small><b>{asset.title}</b><span>{asset.tag} · {asset.id}</span></div></div>
    <dl>{[["Location", `${siteName(data, asset.siteId)} · ${asset.location}`], ["Make / model", `${asset.manufacturer} ${asset.model}`], ["Serial", asset.serial], ["Installed", asset.installDate || "—"], ["Warranty", warrantyLeft < 0 ? "Expired" : `${asset.warrantyUntil} (${warrantyLeft} days)`], ["Lifetime cost", `SAR ${asset.lifetimeCost.toLocaleString()}`], ["Status", asset.status]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
  </div>;
}
function AssetHistory({ data, asset, onOpenJob }: { data: DemoState; asset: Asset; onOpenJob?: (id: string) => void }) {
  const jobs = data.workOrders.filter((w) => w.assetId === asset.id && !w.archived).sort((a, b) => Date.parse(b.openedAt) - Date.parse(a.openedAt));
  const plans = data.ppmPlans.filter((p) => p.assetId === asset.id && !p.archived);
  return <>
    <div className="tx-section-head"><h3>Maintenance history</h3><span>{jobs.length}</span></div>
    <div className="tx-timeline">{jobs.map((w) => <button key={w.id} onClick={() => onOpenJob?.(w.id)} disabled={!onOpenJob || w.assignee !== TECH} className={w.status === "Closed" ? "closed" : "open"}><i /><span><b>{w.title}</b><small>{w.id} · {w.type} · {w.status} · {fmtDay(w.resolvedAt ?? w.openedAt)}{w.materialCost ? ` · SAR ${w.materialCost}` : ""}</small><small>{w.assignee ?? "Unassigned"}</small></span></button>)}</div>
    {plans.length > 0 && <><div className="tx-section-head"><h3>Preventive plans</h3></div>{plans.map((p) => <div key={p.id} className="tx-row static"><span className="tx-row-ic"><ICal size={18} /></span><span><b>{p.title}</b><small>{p.id} · {p.recurrence} · next {fmtDay(p.nextDueAt)}</small></span></div>)}</>}
  </>;
}
function AssetScreen({ data, assetId, onBack, onOpenJob }: { data: DemoState; assetId: string; onBack: () => void; onOpenJob: (id: string) => void }) {
  const asset = data.assets.find((a) => a.id === assetId);
  return <Screen><Header title={asset?.tag ?? "Machine"} sub="Machine details" onBack={onBack} />{asset ? <><AssetCard data={data} asset={asset} /><AssetHistory data={data} asset={asset} onOpenJob={onOpenJob} /></> : <p className="tx-empty">Machine not found.</p>}</Screen>;
}

/* ───────── alerts & profile ───────── */
function AlertsScreen({ data, jobs, onOpen }: { data: DemoState; jobs: WorkOrder[]; onOpen: (id: string) => void }) {
  const items = [
    ...jobs.filter((w) => slaState(w) !== "On Track").map((w) => ({ id: `sla-${w.id}`, wo: w.id, tone: slaState(w) === "Breached" ? "danger" : "warn", title: slaState(w) === "Breached" ? "SLA breached" : "SLA deadline approaching", body: `${w.id} · ${w.title} · ${timeRemaining(w.resolutionDueAt)}` })),
    ...jobs.filter((w) => !w.acceptedAt).map((w) => ({ id: `new-${w.id}`, wo: w.id, tone: "info", title: "New job assigned", body: `${w.id} · ${w.title} · ${siteName(data, w.siteId)}` })),
    ...data.purchaseRequests.filter((p) => p.requestedBy === TECH).map((p) => ({ id: p.id, wo: p.workOrderId ?? "", tone: "warn", title: "Spare part on order", body: `${p.id} · ${data.parts.find((x) => x.id === p.partId)?.name ?? p.partId} × ${p.quantity} · ${p.status}` })),
  ];
  return <Screen nav><Header title="Alerts" sub={`${items.length} notifications`} />
    <div className="tx-list">{items.map((n) => <button key={n.id} className="tx-alert" onClick={() => n.wo && onOpen(n.wo)}><i className={n.tone} /><span><b>{n.title}</b><small>{n.body}</small></span></button>)}{!items.length && <p className="tx-empty">You're all caught up.</p>}</div>
  </Screen>;
}
function ProfileScreen({ data, jobs, onSignOut }: { data: DemoState; jobs: WorkOrder[]; onSignOut: () => void }) {
  const closed = jobs.filter((w) => w.status === "Closed");
  const onTime = closed.length ? Math.round((closed.filter((w) => slaState(w) === "Within SLA").length / closed.length) * 100) : 100;
  const rated = data.requests.filter((r) => r.rating && jobs.some((w) => w.id === r.linkedWorkOrderId));
  const avg = rated.length ? (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1) : "—";
  return <Screen nav><Header title="Profile" />
    <div className="tx-profile"><div className="tx-avatar lg">KR</div><b>Khalid Rahman</b><small>HVAC technician · KR-1042</small><span>North Riyadh · Olaya Tower</span></div>
    <div className="tx-kpis three">{[["Jobs closed", closed.length], ["On-time", `${onTime}%`], ["Rating", avg]].map(([l, v]) => <div key={String(l)} className="tx-kpi info"><b>{v}</b><small>{l}</small></div>)}</div>
    <div className="tx-list">{[["Language", "English · العربية"], ["Notifications", "On"], ["Offline sync", "Up to date"], ["App version", "1.0 (demo)"]].map(([k, v]) => <div key={k} className="tx-row static"><span><b>{k}</b></span><small>{v}</small></div>)}</div>
    <button className="tx-ghost danger" onClick={onSignOut}><ILogout size={18} /> Sign out</button>
  </Screen>;
}

/* ───────── job detail ───────── */
function JobScreen({ data, wo, onBack, onStage, onAsset }: { data: DemoState; wo: WorkOrder; onBack: () => void; onStage: (k: StageKey) => void; onAsset: (id: string) => void }) {
  const sr = data.requests.find((r) => r.id === wo.requestId); const asset = data.assets.find((a) => a.id === wo.assetId);
  const plan = data.ppmPlans.find((p) => p.id === wo.ppmId); const site = SITE_INFO[wo.siteId];
  const next = nextStage(data, wo); const st = slaState(wo);
  const nextLabel = STAGES.find((s) => s.key === next)?.label;
  return <Screen><Header title={wo.id} sub={wo.type} onBack={onBack} right={<span className={`tx-pill ${prioTone(wo.priority)}`}>{wo.priority}</span>} />
    <div className="tx-hero static"><small>{wo.status}</small><h2>{wo.title}</h2><div className="tx-hero-foot"><span><IClock size={14} /> {wo.status === "Closed" ? `Closed ${fmtTime(wo.resolvedAt)}` : timeRemaining(wo.resolutionDueAt)}</span><span className={`tx-pill on-dark ${st === "Breached" ? "danger" : st === "At Risk" ? "warn" : "ok"}`}>SLA {st.toLowerCase()}</span></div></div>
    <div className="tx-links">
      {sr && <div className="tx-link-card"><span className="tx-row-ic"><ITicket size={18} /></span><span><small>Service request</small><b>{sr.id}</b><em>{sr.requester} · {sr.channel}</em></span></div>}
      {plan && <div className="tx-link-card"><span className="tx-row-ic"><ICal size={18} /></span><span><small>PPM plan</small><b>{plan.id}</b><em>{plan.recurrence}</em></span></div>}
      {asset && <button className="tx-link-card" onClick={() => onAsset(asset.id)}><span className="tx-row-ic"><IBox size={18} /></span><span><small>Machine</small><b>{asset.tag}</b><em>{asset.title}</em></span><IChev size={16} /></button>}
    </div>
    <div className="tx-card"><dl>{[["Site", `${siteName(data, wo.siteId)}`], ["Address", site?.address ?? "—"], ["Location", asset?.location ?? "—"], ["Scheduled", `${fmtDay(wo.scheduledAt ?? wo.resolutionDueAt)} · ${fmtTime(wo.scheduledAt ?? wo.resolutionDueAt)}`], ["Resolve by", `${fmtDay(wo.resolutionDueAt)} · ${fmtTime(wo.resolutionDueAt)}`]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {(sr?.description || wo.notes) && <div className="tx-note"><b>Instructions</b><p>{sr?.description}{sr?.description && wo.notes ? " " : ""}{wo.notes}</p></div>}</div>
    <div className="tx-section-head"><h3>Job steps</h3><span>{STAGES.filter((s) => stageDone(data, wo, s.key)).length}/{STAGES.length}</span></div>
    <div className="tx-stages">{STAGES.map((s, i) => { const done = stageDone(data, wo, s.key); const Icon = stageIcon[s.key]; const locked = wo.status === "Closed" ? false : !done && s.key !== next && !(s.key === "parts" || s.key === "photos") ; return <button key={s.key} disabled={locked} className={`${done ? "done" : ""} ${s.key === next ? "next" : ""}`} onClick={() => onStage(s.key)}><i>{done ? <ICheck size={16} /> : <Icon size={16} />}</i><span><b>{s.label}</b><small>{done ? stageNote(data, wo, s.key) : s.key === next ? "Up next" : locked ? `After step ${i}` : "Optional now"}</small></span><IChev size={16} /></button>; })}</div>
    {next && wo.status !== "Closed" && <div className="tx-sticky"><button className="tx-cta" onClick={() => onStage(next)}>{next === "accept" ? "Accept job" : `Continue: ${nextLabel}`}</button></div>}
  </Screen>;
}
function stageNote(d: DemoState, wo: WorkOrder, k: StageKey) {
  if (k === "accept") return `Accepted ${fmtTime(wo.acceptedAt)}`;
  if (k === "travel") return `Arrived ${fmtTime(wo.arrivedAt)}`;
  if (k === "scan") return wo.assetVerifiedAt ? `Verified ${fmtTime(wo.assetVerifiedAt)}` : "No machine linked";
  if (k === "checklist") { const s = stepsFor(d, wo); return `${s.filter((x) => wo.checklistResults?.[x]).length}/${s.length} steps done`; }
  if (k === "work") return wo.diagnosis ?? "";
  if (k === "parts") { const m = d.movements.filter((x) => x.workOrderId === wo.id); return m.length ? `${m.length} part line(s) · SAR ${wo.materialCost}` : "No parts used"; }
  if (k === "photos") return `${wo.photos?.length ?? 0} photo(s)`;
  return `Closed ${fmtTime(wo.resolvedAt)}`;
}

/* ───────── stage screens ───────── */
function StageScreen({ store, wo, stage, run, onBack, onNext, onAsset }: { store: Store; wo: WorkOrder; stage: StageKey; run: (fn: () => string | void) => void; onBack: () => void; onNext: (k: StageKey) => void; onAsset: (id: string) => void }) {
  const { data } = store; const meta = { actor: TECH };
  const asset = data.assets.find((a) => a.id === wo.assetId);
  const idx = STAGES.findIndex((s) => s.key === stage);
  const goNext = () => { const n = STAGES[idx + 1]; if (n) onNext(n.key); else onBack(); };
  const upd = (patch: Record<string, unknown>, label: string) => store.updateRecord("workOrders", wo.id, patch, { ...meta, label });
  const stepBar = <div className="tx-stepbar" aria-label={`Step ${idx + 1} of ${STAGES.length}`}>{STAGES.map((s, i) => <i key={s.key} className={i < idx || stageDone(data, wo, s.key) ? "done" : i === idx ? "on" : ""} />)}</div>;
  const frame = (title: string, body: ReactNode, cta?: ReactNode) => <Screen><Header title={title} sub={`${wo.id} · step ${idx + 1} of ${STAGES.length}`} onBack={onBack} />{stepBar}{body}{cta && <div className="tx-sticky">{cta}</div>}</Screen>;

  if (stage === "accept") {
    const sr = data.requests.find((r) => r.id === wo.requestId);
    return frame("Accept job", <>
      <div className="tx-card"><b className="tx-card-title">{wo.title}</b><p className="tx-muted">{sr?.description ?? wo.notes ?? "Preventive maintenance as per plan."}</p><dl>{[["Priority", wo.priority], ["Site", siteName(data, wo.siteId)], ["Machine", asset ? `${asset.tag} · ${asset.title}` : "—"], ["Respond by", `${fmtTime(wo.responseDueAt)} (${timeRemaining(wo.responseDueAt)})`]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></div>
      <p className="tx-hint">Accepting tells the FM supervisor you have taken this job. The response SLA is met when you arrive on site.</p>
    </>, wo.acceptedAt ? <button className="tx-cta" onClick={goNext}>Accepted · go to job</button> : <button className="tx-cta" onClick={() => run(() => { upd({ acceptedAt: now() }, "Job accepted on mobile app"); goNext(); return `${wo.id} accepted`; })}>Accept job</button>);
  }

  if (stage === "travel") return <TravelStage data={data} wo={wo} frame={frame} run={run} upd={upd} store={store} goNext={goNext} />;

  if (stage === "scan") return frame("Scan machine QR", asset ? <>
    {wo.assetVerifiedAt ? <><div className="tx-success"><ICheck size={18} /> {asset.tag} verified at {fmtTime(wo.assetVerifiedAt)}</div><AssetCard data={data} asset={asset} /><AssetHistory data={data} asset={asset} /></> :
      <ScanScreen data={data} expected={asset} onVerified={(ok, found) => run(() => { if (!ok) return `Wrong machine: scanned ${found?.tag}. This job is for ${asset.tag}.`; upd({ assetVerifiedAt: now() }, `Machine ${asset.tag} verified by QR scan`); return `${asset.tag} verified`; })} />}
  </> : <p className="tx-empty">No machine is linked to this job.</p>, wo.assetVerifiedAt || !asset ? <button className="tx-cta" onClick={goNext}>Continue to checklist</button> : undefined);

  if (stage === "checklist") {
    const steps = stepsFor(data, wo); const res = wo.checklistResults ?? {}; const done = steps.filter((x) => res[x]).length;
    return frame("Checklist", <>
      <div className="tx-card"><div className="tx-ring-row"><div className="tx-ring" style={{ background: `conic-gradient(var(--tx-blue) ${(done / steps.length) * 360}deg, var(--tx-line) 0)` }}><span>{done}/{steps.length}</span></div><div><b>{wo.ppmId ? "PPM checklist" : `${asset?.category ?? "General"} checklist`}</b><small className="tx-muted">{wo.ppmId ? `From plan ${wo.ppmId}` : "Standard steps for this asset type"}</small></div></div></div>
      <div className="tx-checks">{steps.map((s) => <label key={s} className={res[s] ? "on" : ""}><input type="checkbox" checked={Boolean(res[s])} disabled={wo.status === "Closed"} onChange={(e) => upd({ checklistResults: { ...res, [s]: e.target.checked } }, `Checklist: ${s} ${e.target.checked ? "done" : "unchecked"}`)} /><i><ICheck size={14} /></i><span>{s}</span></label>)}</div>
    </>, wo.checklistDone ? <button className="tx-cta" onClick={goNext}>Checklist complete · continue</button> : <button className="tx-cta" disabled={done < steps.length} onClick={() => run(() => { upd({ checklistDone: true }, `Checklist completed (${steps.length}/${steps.length})`); goNext(); return "Checklist saved"; })}>{done < steps.length ? `Complete all steps (${steps.length - done} left)` : "Save checklist"}</button>);
  }

  if (stage === "work") return <WorkStage wo={wo} frame={frame} run={run} upd={upd} goNext={goNext} store={store} />;
  if (stage === "parts") return <PartsStage store={store} wo={wo} frame={frame} run={run} upd={upd} goNext={goNext} />;
  if (stage === "photos") return <PhotoStage wo={wo} asset={asset} frame={frame} run={run} upd={upd} goNext={goNext} />;
  return <CloseStage store={store} wo={wo} frame={frame} run={run} upd={upd} onBack={onBack} onAsset={onAsset} />;
}
type FrameFn = (title: string, body: ReactNode, cta?: ReactNode) => ReactNode;
type StageProps = { wo: WorkOrder; frame: FrameFn; run: (fn: () => string | void) => void; upd: (patch: Record<string, unknown>, label: string) => void };

function TravelStage({ data, wo, frame, run, upd, store, goNext }: StageProps & { data: DemoState; store: Store; goNext: () => void }) {
  const site = SITE_INFO[wo.siteId] ?? { address: siteName(data, wo.siteId), q: siteName(data, wo.siteId), km: 6, min: 12 };
  const [driving, setDriving] = useState(Boolean(wo.travelStartedAt) && !wo.arrivedAt);
  return frame("Go to job", <>
    <div className="tx-map" aria-label="Route map">
      <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice"><rect width="400" height="260" fill="#e8eef7" />
        <g stroke="#fff" strokeWidth="14" fill="none" strokeLinecap="round"><path d="M-10 200 L120 170 L210 190 L410 120" /><path d="M60 -10 L90 120 L120 170 L140 270" /><path d="M250 -10 L240 80 L210 190 L230 270" /><path d="M-10 60 L240 80 L410 50" /></g>
        <g fill="#d7e6d4"><rect x="270" y="150" width="70" height="50" rx="10" /><rect x="20" y="80" width="50" height="60" rx="10" /></g>
        <path className={driving ? "tx-route live" : "tx-route"} d="M70 210 L120 170 L210 190 L240 80 L320 66" fill="none" stroke="#2e61db" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="70" cy="210" r="9" fill="#fff" stroke="#2e61db" strokeWidth="4" /><g transform="translate(320 66)"><circle r="16" fill="#0b2141" /><circle r="6" fill="#c9a27e" /></g>
      </svg>
      <div className="tx-map-eta"><b>{site.min} min</b><small>{site.km} km · fastest route</small></div>
    </div>
    <div className="tx-card"><div className="tx-row static"><span className="tx-row-ic"><IPin size={18} /></span><span><b>{siteName(data, wo.siteId)}</b><small>{site.address}</small></span></div>
      <a className="tx-ghost" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.q)}`} target="_blank" rel="noreferrer">Open in Google Maps</a></div>
    {wo.arrivedAt && <div className="tx-success"><ICheck size={18} /> Arrived at {fmtTime(wo.arrivedAt)} · response SLA {wo.arrivedAt <= wo.responseDueAt ? "met" : "missed"}</div>}
    <p className="tx-hint">Arrival is recorded with your GPS position and stops the response SLA clock.</p>
  </>, wo.arrivedAt ? <button className="tx-cta" onClick={goNext}>Continue to QR scan</button> : driving ? <button className="tx-cta" onClick={() => run(() => { const t = now(); upd({ arrivedAt: t }, `Arrived on site · GPS check-in ${siteName(data, wo.siteId)}`); store.setWorkOrderStatus(wo.id, "In Progress", TECH); goNext(); return "Arrival recorded · job in progress"; })}>I've arrived</button> : <button className="tx-cta" onClick={() => run(() => { setDriving(true); upd({ travelStartedAt: now() }, "Travelling to site"); return "Navigation started"; })}><IRoute size={18} /> Start navigation</button>);
}

function WorkStage({ wo, frame, run, upd, goNext, store }: StageProps & { goNext: () => void; store: Store }) {
  const [diag, setDiag] = useState(wo.diagnosis ?? ""), [cause, setCause] = useState(""), [notes, setNotes] = useState(wo.notes ?? "");
  const [tick, setTick] = useState(0); useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const running = Boolean(wo.startedAt) && wo.status !== "Awaiting Parts";
  const secs = wo.startedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(wo.startedAt)) / 1000)) : 0; void tick;
  const hh = String(Math.floor(secs / 3600)).padStart(2, "0"), mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0"), ss = String(secs % 60).padStart(2, "0");
  const causes = ["Worn bearing", "Belt misalignment", "Low refrigerant", "Clogged filter", "Electrical fault", "Sensor / control fault", "Other"];
  return frame("Perform job", <>
    <div className="tx-timer"><small>{wo.startedAt ? (running ? "Time on job" : "Paused · waiting for parts") : "Not started"}</small><b>{hh}:{mm}:{ss}</b>
      <div>{!wo.startedAt ? <button className="tx-cta sm" onClick={() => run(() => { upd({ startedAt: now() }, "Work started on site"); return "Timer started"; })}><IPlay size={16} /> Start work</button> : running ? <button className="tx-ghost sm" onClick={() => run(() => { store.setWorkOrderStatus(wo.id, "Awaiting Parts", TECH); return "Job paused · supervisor notified"; })}><IPause size={16} /> Pause</button> : <button className="tx-cta sm" onClick={() => run(() => { store.setWorkOrderStatus(wo.id, "In Progress", TECH); return "Job resumed"; })}><IPlay size={16} /> Resume</button>}</div></div>
    <div className="tx-card tx-form">
      <label>Root cause<select value={cause} onChange={(e) => setCause(e.target.value)}><option value="">Select the root cause</option>{causes.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>Diagnosis & work done<textarea rows={4} value={diag} onChange={(e) => setDiag(e.target.value)} placeholder="What did you find and what did you fix?" /></label>
      <label>Notes for supervisor (optional)<textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
    </div>
  </>, <button className="tx-cta" onClick={() => run(() => { if (!diag.trim()) return "Describe the diagnosis and work done first."; const text = cause ? `${cause} · ${diag.trim()}` : diag.trim(); upd({ diagnosis: text, notes, ...(wo.startedAt ? {} : { startedAt: now() }) }, `Diagnosis recorded: ${text}`); goNext(); return "Work saved"; })}>Save work & continue</button>);
}

function PartsStage({ store, wo, frame, run, upd, goNext }: StageProps & { store: Store; goNext: () => void }) {
  const { data } = store;
  const parts = data.parts.filter((p) => !p.archived && p.siteId === wo.siteId);
  const used = data.movements.filter((m) => m.workOrderId === wo.id);
  const prs = data.purchaseRequests.filter((p) => p.workOrderId === wo.id);
  const [qty, setQty] = useState<Record<string, number>>({});
  const q = (id: string) => qty[id] ?? 1;
  const request = (partId: string) => run(() => {
    const p = data.parts.find((x) => x.id === partId)!; const n = q(partId);
    if (p.qty >= n) { const id = store.issuePart(partId, wo.id, n, "Issue", TECH); return `${id}: ${n} × ${p.name} issued · SAR ${(p.unitCost * n).toLocaleString()} charged to the asset`; }
    const pr = store.createReplenishment(partId, n, TECH, wo.id); store.setWorkOrderStatus(wo.id, "Awaiting Parts", TECH);
    return `Out of stock · purchase request ${pr} raised. Job set to Awaiting Parts.`;
  });
  return frame("Spare parts", <>
    <p className="tx-hint">Request a part from the {siteName(data, wo.siteId)} store. In-stock parts are issued against this work order and the cost is charged to the machine.</p>
    <div className="tx-list">{parts.map((p) => <div key={p.id} className="tx-part"><div><b>{p.name}</b><small>{p.sku ?? p.id} · SAR {p.unitCost} · <em className={p.qty === 0 ? "bad" : p.qty <= p.reorderLevel ? "warn" : "ok"}>{p.qty === 0 ? "Out of stock" : `${p.qty} in stock`}</em></small></div><div className="tx-stepper"><button aria-label={`Less ${p.name}`} onClick={() => setQty({ ...qty, [p.id]: Math.max(1, q(p.id) - 1) })}>−</button><span>{q(p.id)}</span><button aria-label={`More ${p.name}`} onClick={() => setQty({ ...qty, [p.id]: q(p.id) + 1 })}>+</button></div><button className={p.qty >= q(p.id) ? "tx-cta sm" : "tx-ghost sm"} onClick={() => request(p.id)}>{p.qty >= q(p.id) ? "Request" : "Order"}</button></div>)}{!parts.length && <p className="tx-empty">No stock held at this site.</p>}</div>
    {(used.length > 0 || prs.length > 0) && <><div className="tx-section-head"><h3>On this job</h3><span>SAR {wo.materialCost.toLocaleString()}</span></div>
      <div className="tx-list">{used.map((m) => <div key={m.id} className="tx-row static"><span className="tx-row-ic ok"><ICheck size={16} /></span><span><b>{Math.abs(m.qty)} × {data.parts.find((p) => p.id === m.partId)?.name}</b><small>{m.id} · issued {fmtTime(m.createdAt)}</small></span></div>)}{prs.map((p) => <div key={p.id} className="tx-row static"><span className="tx-row-ic warn"><IBox size={16} /></span><span><b>{p.quantity} × {data.parts.find((x) => x.id === p.partId)?.name}</b><small>{p.id} · {p.status}</small></span></div>)}</div></>}
  </>, <button className="tx-cta" onClick={() => run(() => { upd({ partsReviewed: true }, used.length ? "Parts confirmed for this job" : "No spare parts needed"); goNext(); })}>{used.length ? "Done with parts" : "No parts needed · continue"}</button>);
}

function PhotoStage({ wo, asset, frame, run, upd, goNext }: StageProps & { asset?: Asset; goNext: () => void }) {
  const [stage, setStage] = useState<"Before" | "After" | "Evidence">("Before");
  const input = useRef<HTMLInputElement>(null);
  const photos = wo.photos ?? [];
  const add = (thumb: string, name: string) => run(() => { if (photos.length >= 8) return "Up to 8 photos per job in this demo."; const p: WorkPhoto = { id: crypto.randomUUID(), name, stage, at: now(), thumb }; upd({ photos: [...photos, p] }, `${stage} photo added (${name})`); return `${stage} photo saved`; });
  const onFile = (f?: File) => { if (!f) return; const url = URL.createObjectURL(f); const img = new Image(); img.onload = () => { add(makeThumb(img, img.naturalWidth, img.naturalHeight), f.name); URL.revokeObjectURL(url); }; img.src = url; };
  return frame("Photos", <>
    <div className="tx-chips">{(["Before", "After", "Evidence"] as const).map((s) => <button key={s} className={stage === s ? "on" : ""} onClick={() => setStage(s)}>{s}</button>)}</div>
    <div className="tx-photo-actions"><button className="tx-cta" onClick={() => input.current?.click()}><ICam size={18} /> Take {stage.toLowerCase()} photo</button><button className="tx-ghost" onClick={() => add(samplePhoto(asset, stage), `${asset?.tag ?? "job"}-${stage.toLowerCase()}.jpg`)}>Use sample photo</button>
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} /></div>
    <div className="tx-gallery">{photos.map((p) => <figure key={p.id}><img src={p.thumb} alt={`${p.stage} photo`} /><figcaption>{p.stage} · {fmtTime(p.at)}</figcaption><button aria-label="Remove photo" onClick={() => upd({ photos: photos.filter((x) => x.id !== p.id) }, `Photo removed (${p.name})`)}>×</button></figure>)}{!photos.length && <p className="tx-empty">No photos yet. Take a before and an after photo.</p>}</div>
  </>, <button className="tx-cta" disabled={!photos.length} onClick={goNext}>{photos.length ? "Continue to sign-off" : "Add at least one photo"}</button>);
}

function CloseStage({ store, wo, frame, run, upd, onBack, onAsset }: StageProps & { store: Store; onBack: () => void; onAsset: (id: string) => void }) {
  const { data } = store; const sr = data.requests.find((r) => r.id === wo.requestId);
  const [name, setName] = useState(wo.signedBy ?? sr?.requester ?? ""); const [drawn, setDrawn] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null); const drawing = useRef(false);
  const pos = (e: React.PointerEvent) => { const r = canvas.current!.getBoundingClientRect(); return [(e.clientX - r.left) * (canvas.current!.width / r.width), (e.clientY - r.top) * (canvas.current!.height / r.height)]; };
  const missing = STAGES.filter((s) => s.key !== "close" && !stageDone(data, wo, s.key)).map((s) => s.label);
  if (wo.status === "Closed") {
    const mins = wo.arrivedAt && wo.resolvedAt ? Math.round((Date.parse(wo.resolvedAt) - Date.parse(wo.arrivedAt)) / 60000) : 0;
    return frame("Job closed", <>
      <div className="tx-done"><span><ICheck size={30} /></span><h2>{wo.id} closed</h2><p>The requester has been notified to confirm and rate the service. History and cost are posted to the machine.</p></div>
      <div className="tx-kpis three">{[["On site", `${mins} min`], ["Parts", `SAR ${wo.materialCost}`], ["SLA", slaState(wo)]].map(([l, v]) => <div key={l} className="tx-kpi info"><b>{v}</b><small>{l}</small></div>)}</div>
      {wo.assetId && <button className="tx-ghost" onClick={() => onAsset(wo.assetId!)}>View machine history</button>}
    </>, <button className="tx-cta" onClick={onBack}>Back to job</button>);
  }
  return frame("Sign-off & close", <>
    {missing.length > 0 && <div className="tx-warnbox"><b>Before closing</b><p>Finish: {missing.join(", ")}.</p></div>}
    <div className="tx-card tx-form"><label>Requester / supervisor name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Who is signing off?" /></label>
      <div className="tx-sign"><div className="tx-sign-head"><b>Signature</b><button onClick={() => { const c = canvas.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); setDrawn(false); }}>Clear</button></div>
        <canvas ref={canvas} width={720} height={260} aria-label="Signature pad" onPointerDown={(e) => { drawing.current = true; const [x, y] = pos(e); const g = canvas.current!.getContext("2d")!; g.lineWidth = 5; g.lineCap = "round"; g.strokeStyle = "#0b2141"; g.beginPath(); g.moveTo(x, y); (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId); }} onPointerMove={(e) => { if (!drawing.current) return; const [x, y] = pos(e); const g = canvas.current!.getContext("2d")!; g.lineTo(x, y); g.stroke(); setDrawn(true); }} onPointerUp={() => { drawing.current = false; }} />
        {!drawn && <small>Sign here with your finger</small>}</div>
      <button className="tx-link" onClick={() => { const c = canvas.current!, g = c.getContext("2d")!; g.lineWidth = 5; g.strokeStyle = "#0b2141"; g.beginPath(); g.moveTo(80, 170); g.bezierCurveTo(160, 40, 220, 230, 300, 120); g.bezierCurveTo(360, 50, 420, 200, 520, 110); g.lineTo(640, 150); g.stroke(); setDrawn(true); }}>Use sample signature</button>
    </div>
  </>, wo.signedOff ? <button className="tx-cta" disabled={missing.length > 0} onClick={() => run(() => { store.setWorkOrderStatus(wo.id, "Closed", TECH); return `${wo.id} closed`; })}>Close job</button> : <button className="tx-cta" disabled={!drawn || !name.trim()} onClick={() => run(() => { upd({ signedOff: true, signedBy: name.trim() }, `Signed off on site by ${name.trim()}`); if (!missing.length) store.setWorkOrderStatus(wo.id, "Closed", TECH); return missing.length ? "Sign-off saved. Finish the remaining steps to close." : `${wo.id} signed off and closed`; })}>{missing.length ? "Save sign-off" : "Sign off & close job"}</button>);
}

export function useTechnicianJobs(data: DemoState) { return useMemo(() => data.workOrders.filter((w) => w.assignee === TECH && !w.archived), [data.workOrders]); }
