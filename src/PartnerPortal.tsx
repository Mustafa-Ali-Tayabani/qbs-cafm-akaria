import { useState } from "react";
import { chooseSla, slaState, timeRemaining, type Store } from "./demoData";
import { SlaPortal } from "./OperationalFlows";

/** Separate Partner Portal for contractors / sub-contractors. Access is decided by the signed-in partner account. */
const LOGO = `${import.meta.env.BASE_URL}akaria-logo.png`;
export type PartnerSession = { email: string; contractorId?: string; applicationId?: string } | null;
const fmt = (m: number) => (m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60} min`);
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
const tone = (s: string) => (/breach|reject|overdue|escalat/i.test(s) ? "danger" : /risk|review|request|pending|submit|await/i.test(s) ? "warn" : /closed|approved|active|within|track/i.test(s) ? "ok" : "info");

export default function PartnerPortal({ store, session, onSignOut, onSession }: { store: Store; session: PartnerSession; onSignOut: () => void; onSession: (s: PartnerSession) => void }) {
  const { data } = store;
  const app = session?.applicationId ? data.applications.find((a) => a.id === session.applicationId) : session ? data.applications.find((a) => a.email.toLowerCase() === session.email.toLowerCase()) : undefined;
  const contractorId = session?.contractorId ?? app?.contractorId;
  const contractor = contractorId ? data.contractors.find((c) => c.id === contractorId) : undefined;
  const company = contractor?.name ?? app?.company ?? "New partner";
  const [tab, setTab] = useState(session ? "Overview" : "Register");
  const jobs = contractor ? data.workOrders.filter((w) => !w.archived && (w.contractorId === contractor.id || w.assignee === contractor.name)) : [];
  const open = jobs.filter((w) => w.status !== "Closed");
  const closed = jobs.filter((w) => w.status === "Closed");
  const within = closed.filter((w) => slaState(w) === "Within SLA").length;
  const contracts = contractor ? data.contracts.filter((c) => c.contractorId === contractor.id && !c.archived) : [];
  const terms = data.terms.filter((t) => t.status === "Published").sort((a, b) => b.version - a.version)[0];
  const rule = (p: string) => chooseSla(data, p, contractor?.id);
  const tabs = session ? (contractor ? ["Overview", "Work orders", "SLA & contract", "Company"] : ["Overview", "Application"]) : ["Register"];

  return <div className="pp-page">
    <div className="pp-bar">
      <div className="pp-brand"><img src={LOGO} alt="AKARIA" /><span>Partner Portal</span></div>
      <div className="pp-user">{session ? <><span><b>{company}</b><small>{session.email}</small></span><button onClick={onSignOut}>Sign out</button></> : <button onClick={onSignOut}>← Back to sign in</button>}</div>
    </div>
    <main className="pp-main">
      <div className="pp-head"><div><small>AKARIA service partners</small><h1>{session ? company : "Register as a service partner"}</h1><p>{session ? (contractor ? `${contractor.service} partner · ${contractor.id}` : `Application ${app?.id ?? ""} · ${app?.status ?? "not found"}`) : "Submit your company details, bank information and documents, and accept the AKARIA Service Level Agreement."}</p></div>
        {contractor && <span className={`rv-pill ${tone(contractor.status)}`}>{contractor.status} partner</span>}</div>
      {tabs.length > 1 && <div className="flow-tabs module-tabs" role="tablist">{tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>{t}</button>)}</div>}

      {tab === "Register" && <SlaPortal store={store} onSubmitted={(id, email) => onSession({ email, applicationId: id })} />}

      {tab === "Overview" && !contractor && <section className="register flow-panel">
        {app ? <><div className="register-title"><div><h2>Application {app.id}</h2><p>Submitted {day(app.createdAt)} · SLA version {app.termsVersion}</p></div><span className={`rv-pill ${tone(app.status)}`}>{app.status}</span></div>
          <ol className="pp-track">{["Submitted", "Under Review", "Approved", "Active"].map((s, i, all) => { const idx = all.indexOf(app.status); const done = app.status === "Rejected" ? i === 0 : i <= idx; return <li key={s} className={done ? "done" : ""}><i>{done ? "✓" : i + 1}</i><b>{s}</b></li>; })}</ol>
          {app.status === "Documents Requested" && <p className="workflow-note">AKARIA has requested more documents. {app.reviewerNote}</p>}
          {app.status === "Rejected" && <p className="workflow-note">Your application was not approved. {app.reviewerNote}</p>}
          <p className="workflow-caption">Once AKARIA approves the application, a contractor account is created with your assigned SLA, and this portal shows your work orders and SLA performance.</p></> : <p className="working-empty">No application is linked to {session?.email}.</p>}
      </section>}

      {tab === "Application" && app && <section className="register flow-panel"><div className="register-title"><div><h2>{app.company}</h2><p>{app.applicantType} · {app.city}, {app.country}</p></div></div><dl className="rv-dl">{[["Commercial registration", app.registration], ["Email", app.email], ["Phone", app.phone], ["VAT", app.vat || "—"], ["Bank", app.bank], ["IBAN", app.iban], ["Documents", app.files.map((f) => f.name).join(", ") || "None"], ["SLA accepted", `${app.termsVersion} · ${day(app.acceptedAt)}`]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>}

      {tab === "Overview" && contractor && <>
        <div className="pp-kpis">{[["Open work orders", open.length, "info"], ["SLA at risk", open.filter((w) => slaState(w) !== "On Track").length, open.some((w) => slaState(w) === "Breached") ? "danger" : "warn"], ["SLA compliance", closed.length ? `${Math.round((within / closed.length) * 100)}%` : "—", "ok"], ["Contract ends", day(contracts[0]?.endAt ?? contractor.expiresAt), "info"]].map(([l, v, t]) => <article key={String(l)} className={`card pp-kpi ${t}`}><small>{l}</small><b>{v}</b></article>)}</div>
        <section className="register flow-panel"><div className="register-title"><div><h2>Jobs needing action</h2><p>Work orders assigned to {contractor.name}, measured against your SLA</p></div></div>
          <PartnerJobs store={store} jobs={open} />
        </section>
      </>}
      {tab === "Work orders" && contractor && <section className="register flow-panel"><div className="register-title"><div><h2>All work orders</h2><p>{jobs.length} jobs · {closed.length} closed</p></div></div><PartnerJobs store={store} jobs={jobs} /></section>}
      {tab === "SLA & contract" && contractor && <>
        <section className="register flow-panel"><div className="register-title"><div><h2>Your SLA · {contractor.slaTier ?? "Standard"}</h2><p>Response and resolution times you are measured against</p></div></div>
          <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Priority</th><th>Respond within</th><th>Resolve within</th><th>Rule</th></tr></thead><tbody>{["Emergency", "High", "Medium", "Low"].map((p) => { const r = rule(p); return <tr key={p}><td><span className={`rv-pill ${p === "Emergency" ? "danger" : p === "High" ? "warn" : "info"}`}>{p}</span></td><td>{fmt(r.responseMinutes)}</td><td>{fmt(r.resolutionMinutes)}</td><td>{r.contractorId ? `${r.id} · v${r.version}` : "AKARIA global default"}</td></tr>; })}</tbody></table></div></section>
        <section className="register flow-panel"><div className="register-title"><div><h2>Contracts</h2></div></div><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Contract</th><th>Service</th><th>Period</th><th>Value (SAR)</th><th>Penalty / breach</th><th>Status</th></tr></thead><tbody>{contracts.map((c) => <tr key={c.id}><td>{c.id}<p>{c.title}</p></td><td>{c.service}</td><td>{day(c.startAt)} – {day(c.endAt)}</td><td>{c.value.toLocaleString()}</td><td>{c.penaltyPercent}%</td><td><span className={`rv-pill ${tone(c.status)}`}>{c.status}</span></td></tr>)}</tbody></table>{!contracts.length && <div className="working-empty">No contract is linked yet.</div>}</div></section>
        {terms && <section className="register flow-panel"><div className="register-title"><div><h2>Service Level Agreement</h2><p>Published version {terms.id} · {day(terms.publishedAt)}</p></div></div><pre className="flow-terms sla-terms">{terms.content}</pre></section>}
      </>}
      {tab === "Company" && contractor && <section className="register flow-panel"><div className="register-title"><div><h2>Company profile</h2><p>Contact AKARIA FM to change these details</p></div></div><dl className="rv-dl">{[["Company", contractor.name], ["Trade", contractor.service], ["Contact person", contractor.contactName ?? "—"], ["Phone", contractor.phone ?? "—"], ["Email", contractor.email ?? session?.email ?? "—"], ["Sites covered", (contractor.sites ?? []).map((id) => data.sites.find((s) => s.id === id)?.name ?? id).join(", ") || "—"]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>}
    </main>
  </div>;
}

function PartnerJobs({ store, jobs }: { store: Store; jobs: Store["data"]["workOrders"] }) {
  const { data } = store;
  const [openId, setOpenId] = useState<string | null>(null);
  return <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Work order</th><th>Machine / site</th><th>Priority</th><th>Status</th><th>SLA</th><th></th></tr></thead><tbody>{jobs.map((w) => { const a = data.assets.find((x) => x.id === w.assetId); const st = slaState(w); return [<tr key={w.id}><td><b>{w.id}</b><p>{w.title}</p></td><td>{a ? `${a.tag} · ` : ""}{data.sites.find((s) => s.id === w.siteId)?.name}</td><td><span className={`rv-pill ${w.priority === "Emergency" ? "danger" : w.priority === "High" ? "warn" : "info"}`}>{w.priority}</span></td><td><span className={`rv-pill ${tone(w.status)}`}>{w.status}</span></td><td><span className={`rv-pill ${tone(st)}`}>{st}</span><p>{w.status === "Closed" ? day(w.resolvedAt) : timeRemaining(w.resolutionDueAt)}</p></td><td><button className="record-link" onClick={() => setOpenId(openId === w.id ? null : w.id)}>{openId === w.id ? "Hide" : "Details"}</button></td></tr>,
    openId === w.id && <tr key={`${w.id}-d`} className="pp-detail"><td colSpan={6}><div className="pp-detail-grid"><div><small>Scope</small><p>{w.notes ?? data.requests.find((r) => r.id === w.requestId)?.description ?? w.title}</p></div><div><small>Machine</small><p>{a ? `${a.title} · ${a.location}` : "—"}</p></div><div><small>Respond by</small><p>{new Date(w.responseDueAt).toLocaleString()}</p></div><div><small>Resolve by</small><p>{new Date(w.resolutionDueAt).toLocaleString()}</p></div></div>
      {w.status !== "Closed" && <div className="flow-button-row" style={{ justifyContent: "flex-start" }}>{w.status === "Assigned" && <button className="primary" onClick={() => store.setWorkOrderStatus(w.id, "In Progress", w.assignee)}>Accept & start</button>}<span className="workflow-caption">Technicians record arrival, photos and sign-off in the AKARIA technician app.</span></div>}</td></tr>]; })}</tbody></table>{!jobs.length && <div className="working-empty">No work orders here.</div>}</div>;
}
