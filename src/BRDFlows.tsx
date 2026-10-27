import { useMemo, useState, type FormEvent } from "react";
import { slaState, responseSlaState, timeRemaining, type DemoState, type Store } from "./demoData";
import { RecordsModule } from "./WorkingModules";
import { SearchableEntity } from "./UXControls";

/** Connected BRD v0.1 screens — existing AKARIA components/tokens, no new UI kit. */
type Open = (type:"request"|"workOrder"|"asset",id:string)=>void;
const prettyDate=(s?:string)=>s?new Date(s).toLocaleString():"—";
const siteName=(d:DemoState,id:string)=>d.sites.find(s=>s.id===id)?.name??id;
const tabs=(items:string[],active:string,onSelect:(s:string)=>void)=><div className="module-tabs flow-tabs" role="tablist" aria-label="Module views">{items.map(item=><button type="button" role="tab" aria-selected={active===item} className={active===item?"active":""} key={item} onClick={()=>onSelect(item)}>{item}</button>)}</div>;
const hint=(t:string)=><p className="workflow-caption">{t}</p>;
function Block({title,children,subtitle}:{title:string;children:React.ReactNode;subtitle?:string}){return <section className="register flow-panel"><div className="register-title"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div></div>{children}</section>}
function Notice({text}:{text:string}){return text?<p className="workflow-note" role="status">{text}</p>:null}
const closed=(status:string)=>["Closed","Cancelled","Archived"].includes(status);

/** BRD R01–R05. Local demo identities are NOT production authentication. */
export function RequesterPortal({store,site}:{store:Store;site:string}){
 const [view,setView]=useState("My Requests"),[requester,setRequester]=useState("Omar Saeed"),[title,setTitle]=useState(""),[description,setDescription]=useState(""),[siteId,setSiteId]=useState(site==="ALL"?store.data.sites[0]?.id??"":site),[assetId,setAssetId]=useState(""),[selected,setSelected]=useState<string|null>(null),[response,setResponse]=useState(""),[rating,setRating]=useState(5),[message,setMessage]=useState("");
 const mine=store.data.requests.filter(r=>!r.archived&&r.requester.toLowerCase()===requester.trim().toLowerCase()&&(site==="ALL"||r.siteId===site));
 const current=mine.find(r=>r.id===selected);
 const create=(e:FormEvent)=>{e.preventDefault();try{if(!requester.trim()||!title.trim()||!description.trim())throw new Error("Requester, summary and description are required.");const id=store.createRequest({title:title.trim(),description:description.trim(),requester:requester.trim(),siteId,channel:"Portal"});if(assetId)store.updateRecord("requests",id,{assetId});setTitle("");setDescription("");setSelected(id);setView("My Requests");setMessage(`${id} created. Keep this unique reference for tracking.`);}catch(err){setMessage(String(err))}};
 const decide=(approved:boolean)=>{if(!current)return;try{store.confirmRequest(current.id,approved,response);setMessage(approved?`${current.id} confirmed and closed.`:`${current.id} reopened for review.`);setResponse("")}catch(err){setMessage(String(err))}};
 const submitRating=()=>{if(!current)return;try{store.rateRequest(current.id,rating,response);setMessage(`Thank you. Rating saved against ${current.id}.`);setResponse("")}catch(err){setMessage(String(err))}};
 return <>{tabs(["My Requests","Raise Request"],view,setView)}<Block title="Requester self-service · demo identity" subtitle="BRD R01–R05 · same SR records as Help Desk and Work Orders"><div className="brd-toolbar"><label>Requester name (demo, not login)<input value={requester} onChange={e=>{setRequester(e.target.value);setSelected(null)}}/></label>{hint("Change the name to preview another requester's saved records. Production identity must come from authenticated SSO/role access.")}</div><Notice text={message}/>
 {view==="Raise Request"?<form className="form-grid flow-form" onSubmit={create}><label>Issue summary *<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Describe the issue briefly"/></label><label>Site *<select required value={siteId} onChange={e=>{setSiteId(e.target.value);setAssetId("")}}>{store.data.sites.filter(x=>site==="ALL"||x.id===site).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="full">Description *<textarea required rows={4} value={description} onChange={e=>setDescription(e.target.value)} placeholder="What happened, and where?"/></label><label>Linked asset (optional)<select value={assetId} onChange={e=>setAssetId(e.target.value)}><option value="">No associated asset</option>{store.data.assets.filter(a=>a.siteId===siteId&&!a.archived).map(a=><option key={a.id} value={a.id}>{a.tag} · {a.title}</option>)}</select></label><div className="form-actions"><button className="secondary" type="button" onClick={()=>setView("My Requests")}>Cancel</button><button className="primary" type="submit">Submit service request</button></div></form>:<><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Request ID</th><th>Issue</th><th>Site</th><th>Status</th><th>Due date</th><th>Action</th></tr></thead><tbody>{mine.map(r=><tr key={r.id}><td><button className="record-link" onClick={()=>setSelected(r.id)}>{r.id}</button></td><td>{r.title}</td><td>{siteName(store.data,r.siteId)}</td><td>{r.status}</td><td>{prettyDate(r.dueAt)}</td><td><button className="record-link" onClick={()=>setSelected(r.id)}>Track</button></td></tr>)}</tbody></table>{!mine.length&&<div className="working-empty">No requests for this demo identity. Use Raise Request to create one.</div>}</div>{current&&<div className="workflow-card brd-detail"><div className="register-title"><div><h3>{current.id} · {current.title}</h3><p>{current.status} · {current.priority} · {current.category}</p></div><button className="secondary" onClick={()=>setSelected(null)}>Close detail</button></div><p>{current.description}</p><p>Related work order: <strong>{current.linkedWorkOrderId??"Not assigned yet"}</strong></p><h3>Tracking timeline</h3><div className="workflow-audit">{[...current.timeline].reverse().map(a=><p key={a.id}>{a.label} · {prettyDate(a.at)} · {a.actor}</p>)}</div>{current.status==="Resolved"&&<div className="brd-response"><h3>R04 · Completion confirmation</h3>{hint("Completion/reopen permissions are demonstration rules until AKARIA approves the exception process.")}<label>Comments (required when rejecting)<textarea value={response} onChange={e=>setResponse(e.target.value)}/></label><div className="flow-button-row"><button className="secondary" onClick={()=>decide(false)}>Reject / reopen</button><button className="primary" onClick={()=>decide(true)}>Confirm completion</button></div></div>}{current.status==="Closed"&&<div className="brd-response"><h3>R05 · Service rating</h3><label>Rating<select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option value={n} key={n}>{n} / 5</option>)}</select></label><label>Feedback<textarea value={response} onChange={e=>setResponse(e.target.value)}/></label><div className="flow-button-row"><button className="primary" onClick={submitRating}>Save rating</button></div>{current.rating&&<p>Saved rating: {current.rating}/5</p>}</div>}</div>}</>}
 </Block></>;
}

/** A03/C03/C04/C08 — constraints visible; shifts need an approved source. */
export function SupervisorDashboard({store,site,onOpen}:{store:Store;site:string;onOpen:Open}){
 const [view,setView]=useState("Attention queue"),[candidate,setCandidate]=useState("Khalid Rahman"),[reason,setReason]=useState(""),[feedback,setFeedback]=useState("");
 const jobs=store.data.workOrders.filter(w=>!w.archived&&!closed(w.status)&&(site==="ALL"||w.siteId===site));
 const risks=jobs.filter(w=>slaState(w)!=="On Track"||responseSlaState(w)!=="On Track"||!w.assignee);
 const plans=store.data.ppmPlans.filter(p=>!p.archived&&(site==="ALL"||p.siteId===site)&&(p.status==="Overdue"||Date.parse(p.nextDueAt)<Date.now()+7*86400000));
 const people=["Khalid Rahman","Abdullah Noor","Yousef Ali","Metro Lift Services"];
 const assign=(id:string)=>{const w=jobs.find(x=>x.id===id);try{if(!w)throw new Error("Work order no longer active.");if(w.assignee&&w.assignee!==candidate&&!reason.trim())throw new Error("A reason is required for reassignment.");store.assignWorkOrder(id,candidate,reason.trim());setFeedback(`${id} assigned to ${candidate} (demo).`);setReason("")}catch(err){setFeedback(String(err))}};
 return <>{tabs(["Attention queue","Team workload","Upcoming PPM"],view,setView)}<Block title="FM supervisor workspace" subtitle="BRD A03 (Design), C03 (Should), C04 (Design), C08 (Must)"><div className="flow-metrics"><div><small>Unassigned jobs</small><strong>{jobs.filter(w=>!w.assignee).length}</strong></div><div><small>SLA at risk / breached</small><strong>{jobs.filter(w=>slaState(w)!=="On Track").length}</strong></div><div><small>PPM due within 7 days</small><strong>{plans.length}</strong></div></div><Notice text={feedback}/>
 {view==="Attention queue"?<><div className="brd-toolbar"><label>Assign technician / partner<select value={candidate} onChange={e=>setCandidate(e.target.value)}>{people.map(x=><option key={x}>{x}</option>)}</select></label><label>Reassignment reason<input placeholder="Required when changing assignee" value={reason} onChange={e=>setReason(e.target.value)}/></label></div><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Work order</th><th>Site / priority</th><th>Current assignee</th><th>SLA</th><th>Actions</th></tr></thead><tbody>{risks.map(w=><tr key={w.id}><td><button className="record-link" onClick={()=>onOpen("workOrder",w.id)}>{w.id}</button><p>{w.title}</p></td><td>{siteName(store.data,w.siteId)} · {w.priority}</td><td>{w.assignee??"Unassigned"}</td><td>Resolution: {slaState(w)} · {timeRemaining(w.resolutionDueAt)}<p>Response: {responseSlaState(w)}</p></td><td><button className="record-link" onClick={()=>assign(w.id)}>Assign / reassign</button></td></tr>)}</tbody></table>{!risks.length&&<div className="working-empty">No unassigned or SLA-risk work orders in scope.</div>}</div></>:view==="Team workload"?<><p className="workflow-caption">Counts reflect assigned, non-closed WOs. Availability, shifts and double-booking require technician calendar integration — not connected.</p><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Technician / partner</th><th>Assigned active jobs</th><th>At risk</th></tr></thead><tbody>{people.map(person=><tr key={person}><td>{person}</td><td>{jobs.filter(w=>w.assignee===person).length}</td><td>{jobs.filter(w=>w.assignee===person&&slaState(w)!=="On Track").length}</td></tr>)}</tbody></table></div></>:<div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>PPM ID</th><th>Plan</th><th>Next due</th><th>State</th></tr></thead><tbody>{plans.map(p=><tr key={p.id}><td>{p.id}</td><td>{p.title}</td><td>{prettyDate(p.nextDueAt)}</td><td>{Date.parse(p.nextDueAt)<Date.now()?"Overdue":"Due soon"}</td></tr>)}</tbody></table></div>}
 </Block></>;
}

/** D03 360º view binds to the same asset/WO/PPM/cost records. */
export function Asset360({store,site,onOpen}:{store:Store;site:string;onOpen:Open}){
 const assets=store.data.assets.filter(a=>!a.archived&&(site==="ALL"||a.siteId===site));
 const [assetId,setAssetId]=useState(assets[0]?.id??"");
 const [openedPlan,setOpenedPlan]=useState<string|null>(null);
 const asset=assets.find(a=>a.id===assetId)??assets[0];
 if(!asset)return <Block title="Asset 360"><p>No active assets in this site.</p></Block>;
 const jobs=store.data.workOrders.filter(w=>w.assetId===asset.id);
 const plans=store.data.ppmPlans.filter(p=>p.assetId===asset.id);
 const out=jobs.filter(w=>closed(w.status));
 const warranty=asset.warrantyUntil?Date.parse(asset.warrantyUntil)-Date.now():null;
 return <Block title="Asset 360 · D03" subtitle="BR-AM-04 Must · asset, maintenance, PPM, history and costs"><div className="brd-toolbar"><label>Choose equipment<SearchableEntity label="Equipment" data={store.data} kind="assets" value={asset.id} onChange={setAssetId} siteId={site!=="ALL"?site:undefined}/></label></div><div className="flow-metrics"><div><small>Recorded lifetime cost (SAR)</small><strong>{asset.lifetimeCost.toLocaleString()}</strong></div><div><small>Total linked WOs</small><strong>{jobs.length}</strong></div><div><small>Open WOs</small><strong>{jobs.length-out.length}</strong></div></div><div className="workflow-card"><h3>{asset.title} · {asset.id}</h3><p>Tag: {asset.tag} · {asset.category} · {asset.criticality}</p><p>{siteName(store.data,asset.siteId)} · {asset.location}</p><p>Manufacturer: {asset.manufacturer} · Model: {asset.model} · Serial: {asset.serial}</p><p>Installed: {asset.installDate||"Not recorded"} · Acquisition value: {asset.acquisitionValue?`SAR ${asset.acquisitionValue.toLocaleString()}`:"Not recorded"}</p><p>Warranty: {asset.warrantyUntil||"Not recorded"} {warranty!==null&&warranty<=30*86400000&&(warranty<0?"· Expired":"· Expiring soon")}</p>{hint("The lifetime cost starts with historical seed amounts plus recorded inventory issues. Labour invoices and SAP cost feeds are not connected.")}</div><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Work order ID</th><th>Type</th><th>Status</th><th>Material cost (SAR)</th><th>Open</th></tr></thead><tbody>{jobs.map(w=><tr key={w.id}><td>{w.id}</td><td>{w.type}</td><td>{w.status}</td><td>{w.materialCost.toLocaleString()}</td><td><button className="record-link" onClick={()=>onOpen("workOrder",w.id)}>Details ↗</button></td></tr>)}</tbody></table>{!jobs.length&&<div className="working-empty">No work orders linked to this asset.</div>}</div><h3>Preventive maintenance plans</h3><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>PPM ID</th><th>Plan</th><th>Frequency</th><th>Next due</th></tr></thead><tbody>{plans.map(p=><tr key={p.id}><td><button className="record-link" onClick={()=>setOpenedPlan(p.id)}>{p.id}</button></td><td>{p.title}</td><td>{p.recurrence}</td><td>{prettyDate(p.nextDueAt)}</td></tr>)}</tbody></table>{!plans.length&&<div className="working-empty">No PPM plan assigned yet.</div>}</div>{openedPlan&&<RecordsModule kind="ppmPlans" store={store} focusId={openedPlan} onCloseFocus={()=>setOpenedPlan(null)}/>}</Block>;
}

/** Seven BRD KPI targets shown separately from derived demo outcomes. */
export function ExecutiveTargets({data,site}:{data:DemoState;site:string}){
 const jobs=data.workOrders.filter(w=>!w.archived&&(site==="ALL"||w.siteId===site));
 const assets=data.assets.filter(a=>!a.archived&&(site==="ALL"||a.siteId===site));
 const requests=data.requests.filter(r=>!r.archived&&(site==="ALL"||r.siteId===site));
 const emergency=jobs.filter(w=>w.priority==="Emergency"&&w.firstResponseAt);
 const avg=emergency.length?Math.round(emergency.reduce((v,w)=>v+(Date.parse(w.firstResponseAt!)-Date.parse(w.openedAt))/60000,0)/emergency.length):null;
 const ppm=jobs.filter(w=>w.ppmId&&w.resolvedAt);
 const ontime=ppm.length?Math.round(ppm.filter(w=>Date.parse(w.resolvedAt!)<=Date.parse(w.occurrenceAt??w.resolutionDueAt)).length/ppm.length*100):null;
 const contractor=jobs.filter(w=>w.contractorId&&w.resolvedAt);
 const supplier=contractor.length?Math.round(contractor.filter(w=>Date.parse(w.resolvedAt!)<=Date.parse(w.resolutionDueAt)).length/contractor.length*100):null;
 const scored=requests.filter(r=>typeof r.rating==="number");
 const satisfaction=scored.length?(scored.reduce((v,r)=>v+(r.rating??0),0)/scored.length).toFixed(1):null;
 const critical=assets.filter(a=>a.criticality==="Critical");
 const tagging=critical.length?Math.round(critical.filter(a=>Boolean(a.tag.trim())).length/critical.length*100):null;
 const dataPoints=[
  {name:"Emergency avg. response",actual:avg===null?"—":`${avg} min`,target:"Target <120 min",note:`${emergency.length} responded emergency jobs`},
  {name:"On-time PPM",actual:ontime===null?"—":`${ontime}%`,target:"Target ≥95%",note:`${ppm.length} completed PPM work orders`},
  {name:"Unplanned breakdown reduction",actual:"—",target:"Target 30% reduction",note:"Baseline period is not available in demo data"},
  {name:"Maintenance cost / m² reduction",actual:"—",target:"Target 15% reduction",note:"Verified area and baseline cost are required"},
  {name:"Contractor SLA",actual:supplier===null?"—":`${supplier}%`,target:"Target ≥90%",note:`${contractor.length} resolved contractor WOs`},
  {name:"Requester satisfaction",actual:satisfaction===null?"—":`${satisfaction}/5`,target:"Target ≥4/5",note:`${scored.length} service ratings`},
  {name:"Critical assets QR / tag coverage",actual:tagging===null?"—":`${tagging}%`,target:"Target 100%",note:`${critical.length} critical assets (tag field proxy)`},
 ];
 return <section className="register flow-panel"><div className="register-title"><div><h2>Executive KPI targets</h2><p>BR-RP-01 Must · actual demo measures do not imply approved business results</p></div></div><div className="brd-kpi-grid">{dataPoints.map(k=><article className="workflow-card brd-kpi" key={k.name}><small>{k.name}</small><strong>{k.actual}</strong><b>{k.target}</b><span>{k.note}</span></article>)}</div>{hint("— means insufficient record coverage or missing baseline. PPM uses each recorded plan occurrence due timestamp; QR tagging currently uses nonempty asset tag as a proxy, not physically verified tags.")}</section>;
}

/** BR-AM-02: actual Code 39 barcodes for immutable IDs; browser print supports batch labels. */
const code39Patterns:Record<string,string>={'0':'bsbSBsBsb','1':'BsbSbsbsB','2':'bsBSbsbsB','3':'BsBSbsbsb','4':'bsbSBsbsB','5':'BsbSBsbsb','6':'bsBSBsbsb','7':'bsbSbsBsB','8':'BsbSbsBsb','9':'bsBSbsBsb','A':'BsbsbSbsB','B':'bsBsbSbsB','C':'BsBsbSbsb','D':'bsbsBSbsB','E':'BsbsBSbsb','F':'bsBsBSbsb','G':'bsbsbSBsB','H':'BsbsbSBsb','I':'bsBsbSBsb','J':'bsbsBSBsb','K':'BsbsbsbSB','L':'bsBsbsbSB','M':'BsBsbsbSb','N':'bsbsBsbSB','O':'BsbsBsbSb','P':'bsBsBsbSb','Q':'bsbsbsBSB','R':'BsbsbsBSb','S':'bsBsbsBSb','T':'bsbsBsBSb','U':'BSbsbsbsB','V':'bSBsbsbsB','W':'BSBsbsbsb','X':'bSbsBsbsB','Y':'BSbsBsbsb','Z':'bSBsBsbsb','-':'bSbsbsBsB','.':'BSbsbsBsb',' ':'bSBsbsBsb','$':'bSbSbSbsb','/':'bSbSbsbSb','+':'bSbsbSbSb','%':'bsbSbSbSb','*':'bSbsBsBsb'};
function Code39Label({value}:{value:string}){
 const payload=`*${value.toUpperCase()}*`;
 const widths:number[]=[]; const bars:{x:number;width:number}[]=[];let cursor=9;
 for(const ch of payload){const pattern=code39Patterns[ch];if(!pattern)continue;
   for(const unit of pattern){const width=unit===unit.toUpperCase()?3:1;
     if(unit.toLowerCase()==="b")bars.push({x:cursor,width});cursor+=width;}
   cursor+=1;
 }
 widths.push(cursor+9);
 return <svg className="brd-barcode" viewBox={`0 0 ${widths[0]} 62`} role="img" aria-label={`Scannable Code 39 barcode for ${value}`} xmlns="http://www.w3.org/2000/svg"><rect width={widths[0]} height="62" fill="white"/>{bars.map((bar,i)=><rect key={i} x={bar.x} y="4" width={bar.width} height="40" fill="black"/>)}<text x={widths[0]/2} y="56" textAnchor="middle" fontSize="10" fill="black">{value.toUpperCase()}</text></svg>;
}
export function AssetTags({store,site}:{store:Store;site:string}){
 const assets=store.data.assets.filter(a=>!a.archived&&(site==="ALL"||a.siteId===site));
 const [selected,setSelected]=useState<string[]>(assets.slice(0,1).map(a=>a.id));
 const chosen=assets.filter(a=>selected.includes(a.id));
 return <Block title="Asset tag printing · D05" subtitle="BR-AM-02 Must · Code 39 barcodes encode permanent asset ID">
   <div className="flow-button-row brd-tag-actions"><button className="secondary" onClick={()=>setSelected(assets.map(a=>a.id))}>Select all</button><button className="secondary" onClick={()=>setSelected([])}>Clear selection</button><button className="primary" disabled={!chosen.length} onClick={()=>window.print()}>Print selected labels</button></div>
   <div className="workflow-table-wrap brd-print-hidden"><table className="workflow-table"><thead><tr><th>Select</th><th>Asset ID</th><th>Tag</th><th>Name</th></tr></thead><tbody>{assets.map(a=><tr key={a.id}><td><input type="checkbox" checked={selected.includes(a.id)} aria-label={`Select ${a.id}`} onChange={e=>setSelected(x=>e.target.checked?[...x,a.id]:x.filter(id=>id!==a.id))}/></td><td>{a.id}</td><td>{a.tag}</td><td>{a.title}</td></tr>)}</tbody></table></div>
   <div className="brd-label-grid">{chosen.map(a=><article className="workflow-card brd-printed-tag" key={a.id}><strong>AKARIA · CAFM</strong><p>{a.tag} · {a.title}</p><Code39Label value={a.id}/><small>{siteName(store.data,a.siteId)} · {a.location}</small></article>)}</div>{hint("Code 39 labels are generated locally from immutable AST IDs. This is a scannable barcode representation; live camera scanning, printer drivers and physical tag assignment remain integration work.")}
 </Block>;
}

/** G02–G07: editable contract register, linked contractor performance and illustrative penalties. */
export function ContractManagement({store,site}:{store:Store;site:string}){
 const [view,setView]=useState("Contract register");
 const contracts=store.data.contracts.filter(c=>!c.archived&&(site==="ALL"||c.siteId===site));
 return <>{tabs(["Contract register","Performance","Expiry / penalties"],view,setView)}{view==="Contract register"?<RecordsModule kind="contracts" store={store} site={site}/>:<Block title={view==="Performance"?"Contractor SLA performance":"Contract expiry & penalty preview"} subtitle="BR-CT-02 Must; BR-CT-03/04 Should"><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Contract ID</th><th>Provider / tier</th><th>{view==="Performance"?"Resolved jobs":"Expiry"}</th><th>{view==="Performance"?"Within SLA":"Breached WOs"}</th><th>{view==="Performance"?"Compliance":"Illustrative penalty (SAR)"}</th></tr></thead><tbody>{contracts.map(c=>{
 const contractor=store.data.contractors.find(p=>p.id===c.contractorId);
 const related=store.data.workOrders.filter(w=>w.contractorId===c.contractorId&&w.siteId===c.siteId);
 const completed=related.filter(w=>w.resolvedAt);
 const breaches=completed.filter(w=>Date.parse(w.resolvedAt!)>Date.parse(w.resolutionDueAt));
 const within=completed.length-breaches.length;
 return <tr key={c.id}><td>{c.id}<p>{c.title}</p></td><td>{contractor?.name??c.contractorId} · {c.tier}</td><td>{view==="Performance"?completed.length:c.endAt}</td><td>{view==="Performance"?within:breaches.length}</td><td>{view==="Performance"?(completed.length?`${Math.round(within/completed.length*100)}%`:"No resolved jobs"):(c.value*c.penaltyPercent/100*breaches.length).toLocaleString()}</td></tr>})}</tbody></table>{!contracts.length&&<div className="working-empty">No contracts in this site scope.</div>}</div>{hint(view==="Performance"?"Performance is calculated from completed, contract-matched demo work orders. Contract service tier overrides must be configured in the SLA matrix.":"Penalty preview = contract value × configured per-breach % × breached jobs. This is a demonstrative rule only; finance approval and SAP posting are not connected. Exact penalty terms require AKARIA approval.")}</Block>}</>;
}

/** H05/H06: PRs remain local records until SAP is integrated. */
export function PurchaseRequests({store,site}:{store:Store;site:string}){
 const [message,setMessage]=useState("");
 const low=store.data.parts.filter(p=>!p.archived&&p.qty<=p.reorderLevel&&(site==="ALL"||p.siteId===site));
 return <><Block title="Replenishment proposals" subtitle="BR-IN-03 Should · local draft only, not an SAP PO"><Notice text={message}/><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Part ID</th><th>Part</th><th>On hand / reorder</th><th>Action</th></tr></thead><tbody>{low.map(p=><tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td>{p.qty} / {p.reorderLevel}</td><td><button className="record-link" onClick={()=>{try{const id=store.createReplenishment(p.id,Math.max(1,p.reorderLevel+1-p.qty));setMessage(`${id} prepared for ${p.name}. SAP not connected.`)}catch(err){setMessage(String(err))}}}>Prepare purchase request</button></td></tr>)}</tbody></table>{!low.length&&<div className="working-empty">No stock below reorder point.</div>}</div></Block><RecordsModule kind="purchaseRequests" store={store} site={site}/></>;
}

/** A04, B06, ADM04: persistent status alerts, plus calculated SLA warnings. */
export function NotificationCenter({store,site,onOpen}:{store:Store;site:string;onOpen:Open}){
 const [view,setView]=useState("Unread");
 const events=store.data.notifications.filter(n=>view==="All"||!n.readAt);
 const jobs=store.data.workOrders.filter(w=>!w.archived&&!closed(w.status)&&(site==="ALL"||w.siteId===site)&&(slaState(w)!=="On Track"||responseSlaState(w)!=="On Track"));
 return <>{tabs(["Unread","All"],view,setView)}<Block title="Notification center" subtitle="BR-WO-04/05 Must · in-app notices and live SLA exceptions"><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Event / alert</th><th>Source record</th><th>When</th><th>Action</th></tr></thead><tbody>{events.map(e=><tr key={e.id}><td>{e.message}</td><td>{e.recordId}</td><td>{prettyDate(e.createdAt)}</td><td><button className="record-link" onClick={()=>{store.markNotificationRead(e.id);onOpen(e.recordType==="requests"?"request":"workOrder",e.recordId)}}>Open / mark read</button></td></tr>)}{jobs.map(w=><tr key={`sla-${w.id}`}><td>{slaState(w)==="Breached"?"Resolution breached":responseSlaState(w)==="Breached"?"Response breached":"SLA deadline approaching"} · {timeRemaining(w.resolutionDueAt)}</td><td>{w.id}</td><td>{prettyDate(w.resolutionDueAt)}</td><td><button className="record-link" onClick={()=>onOpen("workOrder",w.id)}>Open job</button></td></tr>)}</tbody></table>{!events.length&&!jobs.length&&<div className="working-empty">No unread messages or SLA alerts in this scope.</div>}</div>{hint("Status change messages are saved in this browser. Email/SMS/push notifications and scheduled server escalation are simulated, not connected.")}</Block></>;
}

/** ADM06: audit drawn from record histories; not a tamper-proof server ledger. */
export function GovernanceAudit({store}:{store:Store}){
 const logs=useMemo(()=>[
 ...store.data.requests.flatMap(r=>r.timeline.map(t=>({...t,source:r.id}))),
 ...store.data.workOrders.flatMap(w=>w.timeline.map(t=>({...t,source:w.id}))),
 ...store.data.applications.flatMap(a=>a.timeline.map(t=>({...t,source:a.id}))),
 ...store.data.transfers.flatMap(a=>a.timeline.map(t=>({...t,source:a.id}))),
 ...store.data.slaRules.map(r=>({id:r.id,label:`SLA ${r.priority} version ${r.version}: response ${r.responseMinutes}m, resolution ${r.resolutionMinutes}m`,actor:"Admin (demo)",at:r.effectiveAt,source:r.id})),
 ...store.data.terms.map(t=>({id:t.id,label:`SLA agreement v${t.version}: ${t.status}`,actor:"Admin (demo)",at:t.publishedAt??t.createdAt,source:t.id})),
 ].sort((a,b)=>b.at.localeCompare(a.at)),[store.data]);
 const [query,setQuery]=useState("");
 const filtered=logs.filter(l=>`${l.source} ${l.label} ${l.actor}`.toLowerCase().includes(query.toLowerCase()));
 return <Block title="Governance audit history" subtitle="ADM06 / NFR-04 Must · traceable local prototype changes"><div className="brd-toolbar"><label>Search ID or activity<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. WO-2841, SLA, approved"/></label></div><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Source ID</th><th>Activity</th><th>Actor</th><th>Timestamp</th></tr></thead><tbody>{filtered.slice(0,100).map(l=><tr key={`${l.source}-${l.id}`}><td>{l.source}</td><td>{l.label}</td><td>{l.actor}</td><td>{prettyDate(l.at)}</td></tr>)}</tbody></table>{!filtered.length&&<div className="working-empty">No events match your search.</div>}</div>{hint("This ledger merges existing per-record demo timelines and rule versions. Browser storage is user-editable and is not a secure or immutable production audit trail.")}</Block>;
}


/** K04/K05 report extension, derived only from persisted WO, part and asset records. */
function downloadTable(filename:string,headers:string[],rows:(string|number)[][]){
 const quote=(v:string|number)=>`"${String(v).replaceAll('"','""')}"`;
 const payload=[headers,...rows].map(line=>line.map(quote).join(",")).join("\r\n");
 const url=URL.createObjectURL(new Blob(["\uFEFF",payload],{type:"text/csv;charset=utf-8"}));
 const anchor=document.createElement("a");anchor.href=url;anchor.download=filename;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export function AssetCostReport({store,site}:{store:Store;site:string}){
 const assets=store.data.assets.filter(a=>!a.archived&&(site==="ALL"||a.siteId===site));
 const sites=store.data.sites.filter(s=>site==="ALL"||s.id===site);
 const rows=sites.map(s=>{
  const siteAssets=assets.filter(a=>a.siteId===s.id);
  const jobs=store.data.workOrders.filter(w=>w.siteId===s.id&&!w.archived);
  return [s.id,s.name,siteAssets.length,jobs.length,jobs.reduce((sum,w)=>sum+w.materialCost,0),siteAssets.reduce((sum,a)=>sum+a.lifetimeCost,0)] as (string|number)[];
 });
 return <Block title="Asset cost and maintenance report" subtitle="BR-RP-02 Must · data-driven portfolio expenditure"><div className="flow-button-row"><button className="secondary" onClick={()=>downloadTable("akaria-site-cost.csv",["Site ID","Site","Asset count","Work orders","WO material cost SAR","Asset lifetime cost SAR"],rows)}>Export filtered CSV</button></div><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Site ID</th><th>Site</th><th>Assets</th><th>Work orders</th><th>WO material cost (SAR)</th><th>Recorded asset lifetime cost (SAR)</th></tr></thead><tbody>{rows.map(row=><tr key={row[0]}>{row.map((value,i)=><td key={i}>{typeof value==="number"?value.toLocaleString():value}</td>)}</tr>)}</tbody></table></div>{hint("Historical lifetime cost may already include some WO/part transactions: do not sum these two columns as independent costs. Cost/m² remains unavailable until verified floor area and baseline cost are linked.")}</Block>;
}
export function ContractorSlaReport({store,site}:{store:Store;site:string}){
 const data=store.data;
 const contractors=data.contractors.filter(p=>!p.archived);
 const rows=contractors.map(p=>{
  const jobs=data.workOrders.filter(w=>w.contractorId===p.id&&!w.archived&&(site==="ALL"||w.siteId===site));
  const resolved=jobs.filter(w=>w.resolvedAt);
  const breaches=resolved.filter(w=>Date.parse(w.resolvedAt!)>Date.parse(w.resolutionDueAt));
  return [p.id,p.name,jobs.length,resolved.length,breaches.length,resolved.length?`${Math.round((resolved.length-breaches.length)/resolved.length*100)}%`:"—"] as (string|number)[];
 });
 return <Block title="Contractor SLA report" subtitle="BR-RP-02 / CT-02 Must · performance is based on linked resolved WOs"><div className="flow-button-row"><button className="secondary" onClick={()=>downloadTable("akaria-contractor-sla.csv",["Contractor ID","Contractor","Total WOs","Resolved WOs","Breached WOs","SLA compliance"],rows)}>Export filtered CSV</button></div><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Contractor ID</th><th>Contractor</th><th>Linked WOs</th><th>Resolved</th><th>Breached</th><th>Compliance</th></tr></thead><tbody>{rows.map(row=><tr key={row[0]}>{row.map((v,i)=><td key={i}>{v}</td>)}</tr>)}</tbody></table></div>{hint("Only WOs with a permanent contractorId count. Legacy assignee-name-only jobs are excluded until their records are linked; no simulated SAP penalty was posted.")}</Block>;
}

/** ADM07 design proposal: quality checks before migrating assets and PPM plans. */
export function MigrationReadiness({store}:{store:Store}){
 const data=store.data;
 const problems=[
  ...data.assets.filter(a=>!a.tag?.trim()).map(a=>[a.id,"Asset tag missing"]),
  ...data.assets.filter(a=>!data.sites.some(s=>s.id===a.siteId)).map(a=>[a.id,"Site is not in register"]),
  ...data.assets.filter(a=>!a.serial?.trim()).map(a=>[a.id,"Serial number missing"]),
  ...data.ppmPlans.filter(p=>!data.assets.some(a=>a.id===p.assetId)).map(p=>[p.id,"PPM asset reference is invalid"]),
  ...data.ppmPlans.filter(p=>!Number.isFinite(Date.parse(p.nextDueAt))).map(p=>[p.id,"PPM due date invalid"]),
 ];
 return <Block title="Migration data readiness" subtitle="ADM07 Design · read-only checks on locally saved assets and PPM"><div className="flow-metrics"><div><small>Assets scanned</small><strong>{data.assets.length}</strong></div><div><small>PPM plans scanned</small><strong>{data.ppmPlans.length}</strong></div><div><small>Detected data issues</small><strong>{problems.length}</strong></div></div><div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Record ID</th><th>Issue</th></tr></thead><tbody>{problems.map(([id,problem],i)=><tr key={`${id}-${i}`}><td>{id}</td><td>{problem}</td></tr>)}</tbody></table>{!problems.length&&<div className="working-empty">No missing tags, broken asset/site links or invalid PPM due dates found in this sample.</div>}</div>{hint("This is a local preview, not production migration validation. Source ownership, classification standards and SAP mappings require AKARIA sign-off.")}</Block>;
}