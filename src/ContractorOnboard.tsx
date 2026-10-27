import { useMemo, useState } from "react";
import { chooseSla, type Store } from "./demoData";

/** Create contractor → assign SLA → review. Also used to change the SLA of an existing contractor. */
const PRIORITIES = ["Emergency", "High", "Medium", "Low"] as const;
const TRADES = ["HVAC", "Elevators", "Electrical", "Plumbing", "Fire safety", "Cleaning", "Civil works", "General"];
const TIERS = [
  { id: "Standard", factor: 1, note: "Same as AKARIA global SLA" },
  { id: "Priority", factor: 0.75, note: "25% faster than global" },
  { id: "Premium", factor: 0.5, note: "Twice as fast as global" },
  { id: "Custom", factor: 1, note: "Set each priority yourself" },
] as const;
const fmt = (m: number) => (m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60} min`);
const round15 = (m: number) => Math.max(15, Math.round(m / 15) * 15);
type Rule = { priority: string; responseMinutes: number; resolutionMinutes: number };

export default function ContractorOnboard({ store, contractorId, onDone, onCancel }: { store: Store; contractorId?: string; onDone: (id: string) => void; onCancel: () => void }) {
  const { data } = store;
  const existing = contractorId ? data.contractors.find((c) => c.id === contractorId) : undefined;
  const steps = existing ? ["SLA assignment", "Review"] : ["Company details", "SLA assignment", "Review"];
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: string; rules: string[]; contract?: string } | null>(null);
  const [form, setForm] = useState({ name: "", service: "HVAC", contactName: "", phone: "", email: "", registration: "", status: "Active", sites: [] as string[] });
  const globalRule = (p: string) => chooseSla({ ...data, slaRules: data.slaRules.filter((r) => !r.contractorId) }, p);
  const currentRule = (p: string) => (existing ? chooseSla(data, p, existing.id) : globalRule(p));
  const [tier, setTier] = useState<string>(existing?.slaTier ?? "Standard");
  const [rules, setRules] = useState<Rule[]>(() => PRIORITIES.map((p) => { const r = currentRule(p); return { priority: p, responseMinutes: r.responseMinutes, resolutionMinutes: r.resolutionMinutes }; }));
  const [penalty, setPenalty] = useState(1);
  const [withContract, setWithContract] = useState(!existing);
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const [contract, setContract] = useState({ value: 120000, startAt: today, endAt: nextYear });
  const stepName = steps[step];

  const applyTier = (id: string) => {
    setTier(id);
    const t = TIERS.find((x) => x.id === id);
    if (!t || id === "Custom") return;
    setRules(PRIORITIES.map((p) => { const g = globalRule(p); return { priority: p, responseMinutes: round15(g.responseMinutes * t.factor), resolutionMinutes: round15(g.resolutionMinutes * t.factor) }; }));
  };
  const setRule = (p: string, key: "responseMinutes" | "resolutionMinutes", v: number) => { setTier("Custom"); setRules((old) => old.map((r) => (r.priority === p ? { ...r, [key]: v } : r))); };
  const toggleSite = (id: string) => setForm((f) => ({ ...f, sites: f.sites.includes(id) ? f.sites.filter((x) => x !== id) : [...f.sites, id] }));

  const validate = () => {
    if (stepName === "Company details") {
      if (!form.name.trim() || !form.contactName.trim() || !form.phone.trim() || !form.email.trim()) return "Company name, contact person, phone and email are required.";
      if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Enter a valid email address.";
      if (data.contractors.some((c) => !c.archived && c.name.trim().toLowerCase() === form.name.trim().toLowerCase())) return `${form.name} is already registered as a contractor.`;
      if (!form.sites.length) return "Choose at least one site this contractor will cover.";
    }
    if (stepName === "SLA assignment") {
      for (const r of rules) {
        if (!Number.isInteger(r.responseMinutes) || r.responseMinutes <= 0 || !Number.isInteger(r.resolutionMinutes) || r.resolutionMinutes <= 0) return `${r.priority}: enter whole minutes greater than zero.`;
        if (r.resolutionMinutes < r.responseMinutes) return `${r.priority}: resolution time cannot be shorter than response time.`;
      }
      if (penalty < 0 || penalty > 100) return "Penalty per breach must be between 0 and 100%.";
      if (withContract && (contract.value <= 0 || contract.endAt <= contract.startAt)) return "Contract value must be above zero and the end date must follow the start date.";
    }
    return "";
  };
  const next = () => { const e = validate(); setError(e); if (!e) setStep((s) => s + 1); };
  const submit = () => {
    try {
      const id = existing?.id ?? store.createRecord("contractors", { ...form, name: form.name.trim(), contractId: "", expiresAt: withContract ? contract.endAt : nextYear, slaTier: tier });
      if (existing) store.updateRecord("contractors", id, { slaTier: tier }, { label: `SLA tier changed to ${tier}` });
      const ruleIds = store.assignContractorSla(id, rules);
      let contractId: string | undefined;
      if (withContract) {
        const siteId = (existing?.sites ?? form.sites)[0] ?? data.sites[0].id;
        contractId = store.createRecord("contracts", { title: `${existing?.service ?? form.service} service contract`, contractorId: id, siteId, service: existing?.service ?? form.service, startAt: contract.startAt, endAt: contract.endAt, value: contract.value, penaltyPercent: penalty, tier, status: "Active" });
        store.updateRecord("contractors", id, { contractId, expiresAt: contract.endAt }, { label: `Contract ${contractId} linked` });
      }
      setResult({ id, rules: ruleIds, contract: contractId });
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const siteNames = useMemo(() => Object.fromEntries(data.sites.map((s) => [s.id, s.name])), [data.sites]);

  if (result) return <section className="register flow-panel co-done">
    <span className="sla-check" aria-hidden>✓</span>
    <h2>{existing ? "SLA updated" : "Contractor created"}</h2>
    <p>{existing ? existing.name : form.name} is set up with the {tier} SLA. New work orders assigned to them use these response and resolution times; existing work orders keep their original deadlines.</p>
    <div className="co-ids"><span><small>Contractor</small><b>{result.id}</b></span><span><small>SLA rules</small><b>{result.rules.length} priorities</b></span>{result.contract && <span><small>Contract</small><b>{result.contract}</b></span>}</div>
    <div className="flow-button-row" style={{ justifyContent: "center" }}><button className="secondary" onClick={onCancel}>Back to contractors</button><button className="primary" onClick={() => onDone(result.id)}>View contractor</button></div>
  </section>;

  return <section className="register flow-panel co-wizard">
    <div className="register-title"><div><h2>{existing ? `Change SLA · ${existing.name}` : "Create contractor"}</h2><p>{existing ? "Choose a new SLA tier or set each priority. A new SLA version is saved; history is kept." : "Register the service partner, then assign the SLA they will be measured against."}</p></div><button className="secondary" onClick={onCancel}>Cancel</button></div>
    <ol className="co-steps">{steps.map((s, i) => <li key={s} className={i < step ? "done" : i === step ? "active" : ""}><i>{i < step ? "✓" : i + 1}</i><span>{s}</span></li>)}</ol>

    {stepName === "Company details" && <div className="co-body">
      <div className="sla-grid">
        <label>Company name *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gulf HVAC Solutions" /></label>
        <label>Trade / service *<select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>{TRADES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Commercial registration no.<input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} placeholder="10 digits" /></label>
        <label>Contact person *<input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></label>
        <label>Phone *<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+966 5X XXX XXXX" /></label>
        <label>Email *<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ops@company.sa" /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Pending</option></select></label>
      </div>
      <div className="co-sites"><b>Sites covered *</b><div>{data.sites.map((s) => <button type="button" key={s.id} className={form.sites.includes(s.id) ? "on" : ""} aria-pressed={form.sites.includes(s.id)} onClick={() => toggleSite(s.id)}>{form.sites.includes(s.id) ? "✓ " : ""}{s.name}<small>{s.city}</small></button>)}</div></div>
    </div>}

    {stepName === "SLA assignment" && <div className="co-body">
      <b className="co-label">SLA tier</b>
      <div className="co-tiers">{TIERS.map((t) => <button type="button" key={t.id} className={tier === t.id ? "on" : ""} aria-pressed={tier === t.id} onClick={() => applyTier(t.id)}><b>{t.id}</b><small>{t.note}</small></button>)}</div>
      <div className="workflow-table-wrap"><table className="workflow-table co-table"><thead><tr><th>Priority</th><th>Respond within (min)</th><th>Resolve within (min)</th><th>Global default</th></tr></thead><tbody>{rules.map((r) => { const g = globalRule(r.priority); return <tr key={r.priority}><td><span className={`rv-pill ${r.priority === "Emergency" ? "danger" : r.priority === "High" ? "warn" : "info"}`}>{r.priority}</span></td><td><input type="number" min={1} step={15} aria-label={`${r.priority} response minutes`} value={r.responseMinutes} onChange={(e) => setRule(r.priority, "responseMinutes", Number(e.target.value))} /><small>{fmt(r.responseMinutes)}</small></td><td><input type="number" min={1} step={15} aria-label={`${r.priority} resolution minutes`} value={r.resolutionMinutes} onChange={(e) => setRule(r.priority, "resolutionMinutes", Number(e.target.value))} /><small>{fmt(r.resolutionMinutes)}</small></td><td className="tr-muted">{fmt(g.responseMinutes)} / {fmt(g.resolutionMinutes)}</td></tr>; })}</tbody></table></div>
      <div className="sla-grid co-contract">
        <label>Penalty per breached job (% of contract value)<input type="number" min={0} max={100} step={0.5} value={penalty} onChange={(e) => setPenalty(Number(e.target.value))} /></label>
        <label className="co-toggle"><input type="checkbox" checked={withContract} onChange={(e) => setWithContract(e.target.checked)} /> Create the service contract now</label>
        {withContract && <><label>Contract value (SAR)<input type="number" min={0} value={contract.value} onChange={(e) => setContract({ ...contract, value: Number(e.target.value) })} /></label>
        <label>Start date<input type="date" value={contract.startAt} onChange={(e) => setContract({ ...contract, startAt: e.target.value })} /></label>
        <label>End date<input type="date" value={contract.endAt} onChange={(e) => setContract({ ...contract, endAt: e.target.value })} /></label></>}
      </div>
    </div>}

    {stepName === "Review" && <div className="co-body co-review">
      <article><h3>Contractor</h3><dl>{(existing ? [["Company", existing.name], ["Trade", existing.service], ["Contact", existing.contactName ?? "—"], ["Sites", (existing.sites ?? []).map((x) => siteNames[x]).join(", ") || "—"]] : [["Company", form.name], ["Trade", form.service], ["Contact", `${form.contactName} · ${form.phone}`], ["Email", form.email], ["Sites", form.sites.map((x) => siteNames[x]).join(", ")], ["Status", form.status]]).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></article>
      <article><h3>SLA · {tier}</h3><dl>{rules.map((r) => <div key={r.priority}><dt>{r.priority}</dt><dd>Respond {fmt(r.responseMinutes)} · resolve {fmt(r.resolutionMinutes)}</dd></div>)}<div><dt>Penalty</dt><dd>{penalty}% per breached job</dd></div>{withContract && <div><dt>Contract</dt><dd>SAR {contract.value.toLocaleString()} · {contract.startAt} to {contract.endAt}</dd></div>}</dl></article>
    </div>}

    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions">{step > 0 && <button className="secondary" onClick={() => { setError(""); setStep((s) => s - 1); }}>Back</button>}{stepName === "Review" ? <button className="primary" onClick={submit}>{existing ? "Save new SLA" : "Create contractor & assign SLA"}</button> : <button className="primary" onClick={next}>Next: {steps[step + 1]}</button>}</div>
  </section>;
}
