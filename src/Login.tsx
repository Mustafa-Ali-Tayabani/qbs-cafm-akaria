import { useState } from "react";
import type { Store } from "./demoData";
import TechnicianApp, { IPhoneFrame } from "./TechnicianApp";
import type { PartnerSession } from "./PartnerPortal";

const LOGO = `${import.meta.env.BASE_URL}akaria-logo.png`;
const FLOW = [
  ["Raise", "Portal, app or call centre"],
  ["Classify", "Priority and SLA set"],
  ["Assign", "Technician or contractor"],
  ["Execute", "Arrival, diagnosis, parts"],
  ["Evidence", "Before / after photos"],
  ["Confirm", "Requester rates service"],
  ["Report", "History and cost updated"],
];

export type Destination = { mode: "web" | "mobile" | "partner"; label: string; who: string; partner?: PartnerSession };
/** Route an account to its application by role (demo directory; production uses SSO roles). */
export function resolveAccount(store: Store, raw: string): Destination | null {
  const v = raw.trim().toLowerCase(); if (!v) return null;
  if (v === "kr-1042" || v === "khalid.rahman@akaria.sa") return { mode: "mobile", label: "Technician app", who: "Khalid Rahman · HVAC technician" };
  if (v.endsWith("@akaria.sa")) return { mode: "web", label: "Web portal", who: v === "fahad.alsalem@akaria.sa" ? "Fahad Al-Salem · FM Director" : "AKARIA staff" };
  const c = store.data.contractors.find((x) => !x.archived && x.email?.toLowerCase() === v);
  if (c) return { mode: "partner", label: "Partner portal", who: `${c.name} · service partner`, partner: { email: v, contractorId: c.id } };
  const app = store.data.applications.find((x) => x.email.toLowerCase() === v);
  if (app) return { mode: "partner", label: "Partner portal", who: `${app.company} · application ${app.status.toLowerCase()}`, partner: { email: v, applicationId: app.id, contractorId: app.contractorId } };
  return null;
}
const DEMO = [
  { id: "fahad.alsalem@akaria.sa", role: "FM Director", dest: "Web portal" },
  { id: "KR-1042", role: "Technician", dest: "Technician app" },
  { id: "service@gulfhvac.sa", role: "Service partner", dest: "Partner portal" },
];

/** A01 Login: one sign-in; the account's role decides the web portal, technician app or partner portal. */
export function PortalLogin({ store, onEnter }: { store: Store; onEnter: (d: Destination | { mode: "partner"; partner: null }) => void }) {
  const [user, setUser] = useState("fahad.alsalem@akaria.sa");
  const [pw, setPw] = useState("demo-password");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const dest = resolveAccount(store, user);
  const submit = () => { if (!dest) { setError("We couldn't find that account. Use your AKARIA email, employee ID or registered partner email."); return; } if (!pw) { setError("Enter your password."); return; } onEnter(dest); };
  return <div className="lg-page">
    <section className="lg-brand">
      <div className="lg-brand-top"><img src={LOGO} alt="AKARIA" /><span>CAFM</span></div>
      <div className="lg-brand-copy">
        <small>Unified CAFM · Facility management</small>
        <h1>One work order, end to end.</h1>
        <p>Requests, assets, technicians, partners and SLAs on one traceable record, from the moment an issue is raised to the cost posted on the asset.</p>
      </div>
      <ol className="lg-flow">{FLOW.map(([t, d], i) => <li key={t}><i>{i + 1}</i><b>{t}</b><small>{d}</small></li>)}</ol>
      <small className="lg-foot">Every step is time-stamped, so response and completion are measured against the SLA automatically.</small>
    </section>
    <section className="lg-panel">
      <form className="lg-card" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <h2>Sign in</h2>
        <p>Use your AKARIA account. You'll land in the workspace your role has access to.</p>
        <label>Email or employee ID<input value={user} onChange={(e) => { setUser(e.target.value); setError(""); }} autoComplete="username" placeholder="name@akaria.sa · KR-1042 · partner email" /></label>
        <label>Password<span className="lg-pw"><input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /><button type="button" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button></span></label>
        <div className={`lg-dest ${dest ? "ok" : ""}`} aria-live="polite">{dest ? <><span>Opens</span><b>{dest.label}</b><small>{dest.who}</small></> : <small>Enter an account to see where it signs in.</small>}</div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary lg-submit" type="submit">Sign in</button>
        <button className="secondary lg-submit" type="button" onClick={submit}>Sign in with AKARIA SSO</button>
        <div className="lg-demo"><small>Demo accounts</small><div>{DEMO.map((d) => <button type="button" key={d.id} className={user === d.id ? "on" : ""} onClick={() => { setUser(d.id); setError(""); }}><b>{d.role}</b><span>{d.dest}</span></button>)}</div></div>
        <p className="lg-register">New service partner? <button type="button" onClick={() => onEnter({ mode: "partner", partner: null })}>Register for an SLA</button></p>
      </form>
    </section>
  </div>;
}

/** Technician app shown in an iPhone 17 Pro Max frame, beside a short guide. */
export function MobileShell({ store, onExit, onWeb }: { store: Store; onExit: () => void; onWeb: () => void }) {
  const steps = ["Accept job", "Go to job (GPS)", "Scan machine QR · see history", "Checklist", "Perform job", "Request spare parts", "Take photos", "Sign-off & close"];
  return <div className="ms-page">
    <div className="ms-guide">
      <div className="lg-brand-top"><img src={LOGO} alt="AKARIA" /><span>Technician app</span></div>
      <h1>Field work, on the same record.</h1>
      <p>Everything Khalid does in the app updates the work order the FM team sees in the web portal: arrival, checklist, parts, photos and sign-off.</p>
      <ol>{steps.map((s, i) => <li key={s}><i>{i + 1}</i>{s}</li>)}</ol>
      <div className="ms-actions"><button className="primary" onClick={onWeb}>Open web portal to trace the job</button><button className="ms-link" onClick={onExit}>← Back to login</button></div>
      <small>iPhone 17 Pro Max preview · data is shared with the web portal in this browser</small>
    </div>
    <div className="ms-phone"><IPhoneFrame><TechnicianApp store={store} onExit={onExit} /></IPhoneFrame></div>
  </div>;
}
