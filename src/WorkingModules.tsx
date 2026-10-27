import { createContext, useContext, useEffect, useMemo, useState, type FormEvent } from "react";
import {queryRecords,filterFields,toRow, type QueryFilters} from "./UXQuery";
import {SearchableEntity,MultiFilter,FilterChips,availableFilterValues} from "./UXControls";
import ContractorOnboard from "./ContractorOnboard";
import { chooseSla, slaState, timeRemaining, type Collection, type DemoState, type RecordItem, type Store, type WorkOrder } from "./demoData";

type Field = { key:string; label:string; type?:"date"|"datetime-local"|"number"|"textarea"|"email"|"select"|"checkbox"; options?:string[]; relation?:Collection; required?:boolean; min?:number };
const fields:Record<Collection,Field[]>={
 sites:[{key:"name",label:"Site name",required:true},{key:"city",label:"City",required:true},{key:"status",label:"Status",type:"select",options:["Active","Inactive"]}],
 assets:[{key:"tag",label:"Asset tag",required:true},{key:"title",label:"Asset name",required:true},{key:"category",label:"Asset category",type:"select",options:["HVAC","Electrical","Plumbing","Vertical transport","Fire safety","Other"]},{key:"siteId",label:"Site",relation:"sites",required:true},{key:"location",label:"Building / floor / room",required:true},{key:"manufacturer",label:"Manufacturer"},{key:"model",label:"Model"},{key:"serial",label:"Serial number"},{key:"installDate",label:"Installation date",type:"date"},{key:"acquisitionValue",label:"Acquisition value (SAR)",type:"number",min:0},{key:"expectedLifeYears",label:"Expected useful life (years)",type:"number",min:0},{key:"warrantyUntil",label:"Warranty date",type:"date"},{key:"criticality",label:"Criticality",type:"select",options:["Critical","High","Medium","Low"]},{key:"status",label:"Status",type:"select",options:["Operational","Needs inspection","Out of Service","Retired"]}],
 requests:[{key:"title",label:"Issue summary",required:true},{key:"description",label:"Description",type:"textarea",required:true},{key:"siteId",label:"Location / site",relation:"sites",required:true},{key:"assetId",label:"Linked asset",relation:"assets"},{key:"requester",label:"Requester / caller",required:true},{key:"channel",label:"Channel",type:"select",options:["Portal","Call centre (simulated)","Email (simulated)","WhatsApp (simulated)","Technician"]},{key:"category",label:"Category",type:"select",options:["HVAC","Electrical","Plumbing","General","Other"]},{key:"priority",label:"Priority",type:"select",options:["Emergency","High","Medium","Low"]},{key:"status",label:"Request status",type:"select",options:["Awaiting triage","Classified","Assigned","Work order created","Resolved","Closed","Cancelled"]}],
 workOrders:[{key:"title",label:"Work order title",required:true},{key:"requestId",label:"Request reference",relation:"requests"},{key:"assetId",label:"Asset",relation:"assets"},{key:"siteId",label:"Site",relation:"sites",required:true},{key:"type",label:"Type",type:"select",options:["Corrective","Preventive","Emergency","B2C"]},{key:"priority",label:"Priority",type:"select",options:["Emergency","High","Medium","Low"]},{key:"assignee",label:"Technician / assignee",type:"select",options:["","Khalid Rahman","Abdullah Noor","Yousef Ali","Metro Lift Services"]},{key:"contractorId",label:"Assigned contractor",relation:"contractors"},{key:"status",label:"Stage",type:"select",options:["New","Assigned","In Progress","Awaiting Parts","Resolved","Closed"]}],
 ppmPlans:[{key:"title",label:"Plan name",required:true},{key:"description",label:"Description",type:"textarea"},{key:"assetId",label:"Equipment",relation:"assets",required:true},{key:"siteId",label:"Site",relation:"sites",required:true},{key:"recurrence",label:"Frequency",type:"select",options:["Daily","Weekly","Monthly","Quarterly","Yearly"]},{key:"nextDueAt",label:"Next due",type:"datetime-local",required:true},{key:"assignee",label:"Assigned technician",type:"select",options:["","Khalid Rahman","Abdullah Noor","Yousef Ali"]},{key:"checklist",label:"Checklist steps (one per line)",type:"textarea"},{key:"status",label:"Plan status",type:"select",options:["Active","Paused","Inactive"]}],
 parts:[{key:"name",label:"Part name",required:true},{key:"sku",label:"Stock keeping unit (SKU)",required:true},{key:"siteId",label:"Warehouse / site",relation:"sites",required:true},{key:"qty",label:"On-hand quantity",type:"number",min:0,required:true},{key:"reorderLevel",label:"Reorder threshold",type:"number",min:0,required:true},{key:"unitCost",label:"Unit cost (SAR)",type:"number",min:0,required:true}],
 contracts:[{key:"title",label:"Contract name",required:true},{key:"contractorId",label:"Contractor",relation:"contractors",required:true},{key:"siteId",label:"Covered site",relation:"sites",required:true},{key:"service",label:"Service / trade",required:true},{key:"tier",label:"Service tier",type:"select",options:["Standard","Priority","Emergency"]},{key:"startAt",label:"Start date",type:"date",required:true},{key:"endAt",label:"End date",type:"date",required:true},{key:"value",label:"Contract value (SAR)",type:"number",min:0,required:true},{key:"penaltyPercent",label:"Illustrative per-breach penalty (% of contract value)",type:"number",min:0,required:true},{key:"status",label:"Contract status",type:"select",options:["Draft","Active","Expired","Suspended"]}],
 purchaseRequests:[{key:"partId",label:"Stock part",relation:"parts",required:true},{key:"quantity",label:"Quantity to request",type:"number",min:1,required:true}],
 contractors:[{key:"name",label:"Company name",required:true},{key:"service",label:"Trade / service",required:true},{key:"contractId",label:"Contract reference"},{key:"expiresAt",label:"Contract expiry",type:"date"},{key:"status",label:"Status",type:"select",options:["Active","Pending","Suspended","Archived"]},{key:"externalTeamsAllowed",label:"Allow external technician teams",type:"checkbox"},{key:"b2cPhotosAllowed",label:"Allow B2C unit photos",type:"checkbox"}],
 rooms:[{key:"name",label:"Room name",required:true},{key:"siteId",label:"Site",relation:"sites",required:true},{key:"building",label:"Building",required:true},{key:"floor",label:"Floor",required:true},{key:"areaSqm",label:"Area (m²)",type:"number",min:0},{key:"department",label:"Department"},{key:"occupancy",label:"Current occupancy",type:"number",min:0},{key:"capacity",label:"Capacity",type:"number",min:1}],
 applications:[],
 bookings:[{key:"roomId",label:"Room",relation:"rooms",required:true},{key:"person",label:"Booked by",required:true},{key:"purpose",label:"Purpose",required:true},{key:"startAt",label:"Start",type:"datetime-local",required:true},{key:"endAt",label:"End",type:"datetime-local",required:true},{key:"status",label:"Status",type:"select",options:["Confirmed","Cancelled"]}],
 transfers:[{key:"assetId",label:"Asset",relation:"assets",required:true},{key:"fromSiteId",label:"From site",relation:"sites"},{key:"toSiteId",label:"Destination site",relation:"sites",required:true},{key:"toLocation",label:"Destination room / location",required:true},{key:"status",label:"Status",type:"select",options:["Pending Approval","Approved","In Transit","Accepted","Rejected"]}],
};
const titles:Record<Collection,string>={sites:"Site",assets:"Asset",requests:"Service request",workOrders:"Work order",ppmPlans:"PPM plan",parts:"Spare part",contractors:"Contractor",rooms:"Room",applications:"Application",bookings:"Booking",transfers:"Asset transfer",contracts:"Contract",purchaseRequests:"Purchase request"};
const columns:Record<Collection,string[]>={sites:["name","city","status"],assets:["tag","title","siteId","category","criticality","status"],requests:["title","requester","siteId","priority","status","linkedWorkOrderId"],workOrders:["title","requestId","assetId","assignee","priority","status","resolutionDueAt"],ppmPlans:["title","assetId","recurrence","nextDueAt","status"],parts:["name","sku","siteId","qty","reorderLevel","unitCost"],contractors:["name","service","contractId","status","expiresAt"],rooms:["name","siteId","building","floor","occupancy","capacity"],applications:["company","applicantType","status","termsVersion"],bookings:["roomId","person","startAt","endAt","status"],transfers:["assetId","fromSiteId","toSiteId","status"],contracts:["title","contractorId","siteId","tier","endAt","status"],purchaseRequests:["partId","quantity","status","createdAt"]};
const collection=(s:DemoState,k:Collection)=>(s[k] as RecordItem[]).filter(x=>!(x as unknown as Record<string,unknown>).archived);
const rowObject=(r:RecordItem)=>r as unknown as Record<string,unknown>;
/** Human labels for record fields — used by filters, table headers and view screens. */
const labelOverrides:Record<string,string>={id:"Record ID",siteId:"Site",fromSiteId:"From site",toSiteId:"Destination site",assetId:"Asset",roomId:"Room",partId:"Part",contractorId:"Contractor",requestId:"Request",ppmId:"PPM plan",linkedWorkOrderId:"Linked work order",workOrderId:"Work order",contractId:"Contract reference",slaState:"SLA state",sku:"SKU",qty:"On hand",reorderLevel:"Reorder level",unitCost:"Unit cost (SAR)",lifetimeCost:"Lifetime cost (SAR)",acquisitionValue:"Acquisition value (SAR)",materialCost:"Material cost (SAR)",value:"Contract value (SAR)",areaSqm:"Area (m²)",penaltyPercent:"Penalty per breach (%)",externalTeamsAllowed:"External teams allowed",b2cPhotosAllowed:"B2C photos allowed",termsVersion:"SLA version",applicantType:"Applicant type",iban:"IBAN",vat:"VAT number",swift:"SWIFT / BIC",stockState:"Stock state",occupancyState:"Occupancy state",checklistDone:"Checklist complete",signedOff:"Signed off",expectedLifeYears:"Expected life (years)",tier:"Service tier",slaTier:"SLA tier",contactName:"Contact person",sites:"Sites covered",signedBy:"Signed off by",partsReviewed:"Parts confirmed",travelStartedAt:"Travel started",acceptedAt:"Accepted",assetVerifiedAt:"Machine QR verified",startedAt:"Work started",arrivedAt:"Arrived on site"};
export const nice=(key:string)=>{if(labelOverrides[key])return labelOverrides[key];const words=key.replace(/At$/,"").replace(/Id$/,"").replace(/([a-z0-9])([A-Z])/g,"$1 $2").toLowerCase().trim();return words.charAt(0).toUpperCase()+words.slice(1)};
export const formatDate=(value:string)=>{const d=new Date(value);if(Number.isNaN(d.getTime()))return value;return /T\d\d:\d\d/.test(value)?d.toLocaleString(undefined,{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})};
function pretty(s:DemoState,value:unknown,key:string){if(value===null||value===undefined||value==="")return "—";if(typeof value==="boolean")return value?"Yes":"No";if(Array.isArray(value))return value.length?value.map(v=>typeof v==="object"&&v?String((v as Record<string,unknown>).name??JSON.stringify(v)):key==="sites"?(s.sites.find(x=>x.id===v)?.name??String(v)):String(v)).join(", "):"—";const text=String(value);const relation=fieldsForRelation(key);if(relation){const found=collection(s,relation).find(x=>x.id===text)??(s[relation] as RecordItem[]).find(x=>x.id===text);if(found)return `${text} · ${String(rowObject(found).name??rowObject(found).title??rowObject(found).tag??"")}`;}if(/^\d{4}-\d\d-\d\d(T|$)/.test(text))return formatDate(text);if(typeof value==="number"&&/cost|value/i.test(key))return value.toLocaleString();return text;}
function fieldsForRelation(k:string):Collection|undefined{return ({siteId:"sites",fromSiteId:"sites",toSiteId:"sites",assetId:"assets",roomId:"rooms",contractorId:"contractors",requestId:"requests",linkedWorkOrderId:"workOrders",workOrderId:"workOrders",partId:"parts",ppmId:"ppmPlans"} as Record<string,Collection>)[k]}

/** App-level record navigation: "View" opens a full view screen instead of a popup. */
export type RecordViewApi={open:(kind:Collection,id:string)=>void};
export const RecordViewContext=createContext<RecordViewApi|null>(null);
export const useRecordView=()=>useContext(RecordViewContext);
function csvDownload(name:string,rows:Record<string,unknown>[],keys:string[]){const csv=[keys,...rows.map(r=>keys.map(k=>String(r[k]??"")))].map(line=>line.map(v=>`"${v.replaceAll('"','""')}"`).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function notifyError(error:unknown,fn:(s:string)=>void){fn(error instanceof Error?error.message:String(error));}

function Editor({kind,record,data,onCancel,onSave}:{kind:Collection;record?:RecordItem;data:DemoState;onCancel:()=>void;onSave:(form:Record<string,unknown>)=>void}){
 const original=record?rowObject(record):{};
 const [draft,setDraft]=useState<Record<string,string>>(()=>Object.fromEntries(fields[kind].map(f=>[f.key,
   typeof original[f.key]==="boolean"?(original[f.key]?"true":"false"):
   f.type==="datetime-local"&&typeof original[f.key]==="string"?String(original[f.key]).slice(0,16):
   !record&&f.key==="priority"?"Medium":
   !record&&f.type==="select"?(f.options?.[0]??""):
   String(original[f.key]??"")])));
 const [dirty,setDirty]=useState(false);
 const [error,setError]=useState("");
 const [discardAsk,setDiscardAsk]=useState(false);
 const cancel=()=>{if(dirty&&!discardAsk){setDiscardAsk(true);return}onCancel()};
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.stopPropagation();cancel()}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[dirty,discardAsk]);
 const submit=(e:FormEvent)=>{e.preventDefault();try{
   for(const field of fields[kind])if(field.required&&!String(draft[field.key]??"").trim())throw new Error(`${field.label} is required.`);
   const result:Record<string,unknown>={};
   for(const field of fields[kind]){const raw=draft[field.key]??"";result[field.key]=field.type==="number"?Number(raw):field.type==="checkbox"?raw==="true":field.type==="datetime-local"&&raw?new Date(raw).toISOString():raw; if(field.type==="number"&&(!Number.isFinite(result[field.key])||Number(raw)<(field.min??0)))throw new Error(`Invalid ${field.label}.`);}
   if(kind==="assets"&&data.assets.some(x=>x.tag.toLowerCase()===String(result.tag).toLowerCase()&&x.id!==record?.id))throw new Error("This asset tag already exists.");
   if(kind==="parts"&&data.parts.some(x=>x.sku&&x.sku===result.sku&&x.id!==record?.id))throw new Error("Duplicate SKU. Use a different identifier.");
   if(kind==="contracts"&&Number(result.penaltyPercent)>100)throw new Error("Penalty rate cannot exceed 100%.");
   if(kind==="rooms"&&Number(result.occupancy)>Number(result.capacity))throw new Error("Occupancy cannot exceed room capacity.");
   if(kind==="bookings"){
     if(new Date(String(result.endAt))<=new Date(String(result.startAt)))throw new Error("End time must be after start time.");
     if(data.bookings.some(x=>!x.archived&&x.id!==record?.id&&x.status==="Confirmed"&&x.roomId===result.roomId&&new Date(x.startAt)<new Date(String(result.endAt))&&new Date(x.endAt)>new Date(String(result.startAt))))throw new Error("Room is already booked during this period.");
   }
   onSave(result);
 }catch(e){notifyError(e,setError)}};
 return <div className="modal-layer" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)cancel()}}><form className="form-modal workflow-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label={`${record?"Edit":"Create"} ${titles[kind]}`}><div className="workflow-modal-head"><div><strong>{record?`Edit ${titles[kind]} · ${record.id}`:`Create ${titles[kind]}`}</strong><p>Saved locally · connected to the AKARIA demo records</p></div><button className="secondary" onClick={cancel} type="button">Close</button></div><div className="form-grid">
 {fields[kind].map(field=><label key={field.key} className={field.type==="textarea"?"full":""}>{field.label}{field.required?" *":""}{field.type==="textarea"?<textarea value={draft[field.key]} onChange={e=>{setDirty(true);setDraft({...draft,[field.key]:e.target.value})}}/>:field.type==="checkbox"?<select value={draft[field.key]} onChange={e=>{setDirty(true);setDraft({...draft,[field.key]:e.target.value,...(field.key==="siteId"?{assetId:"",roomId:""}:{})})}}><option value="true">Allowed</option><option value="false">Not allowed</option></select>:field.relation?<SearchableEntity label={field.label} kind={field.relation} data={data} required={field.required} siteId={field.relation==="assets"||field.relation==="rooms"?draft.siteId||undefined:undefined} value={draft[field.key]} onChange={id=>{setDirty(true);setDraft({...draft,[field.key]:id,...(field.key==="siteId"?{assetId:"",roomId:""}:{})})}}/>:field.type==="select"?<select value={draft[field.key]} onChange={e=>{setDirty(true);setDraft({...draft,[field.key]:e.target.value})}}>{(!field.options?.includes(draft[field.key])&&draft[field.key]? [draft[field.key],...(field.options??[])]:field.options??[]).map(v=><option key={v} value={v}>{v||"Unassigned"}</option>)}</select>:<input type={field.type??"text"} min={field.min} disabled={kind==="parts"&&Boolean(record)&&field.key==="qty"} step={field.type==="number"?"any":undefined} value={draft[field.key]} onChange={e=>{setDirty(true);setDraft({...draft,[field.key]:e.target.value})}}/> }</label>)}
 </div>{kind==="parts"&&record&&<p className="workflow-caption">Stock quantity is read-only on Edit. Use Inventory → Receive / Issue / Return for auditable movements.</p>}{error&&<p className="form-error" role="alert">{error}</p>}{discardAsk?<div className="form-actions rv-discard"><span>Discard your unsaved changes?</span><button type="button" className="secondary" onClick={()=>setDiscardAsk(false)}>Keep editing</button><button type="button" className="primary danger" onClick={onCancel}>Discard</button></div>:<div className="form-actions"><button type="button" className="secondary" onClick={cancel}>Cancel</button><button type="submit" className="primary">{record?"Save changes":"Create record"}</button></div>}</form></div>;
}

export const recordTitles=titles;
const statusTone=(status:string)=>{const v=status.toLowerCase();if(/breach|overdue|reject|suspend|expired|out of service|emergency/.test(v))return "danger";if(/risk|await|pending|paused|draft|review|requested|inspection|parts|high/.test(v))return "warn";if(/closed|resolved|active|approved|operational|confirmed|accepted|on track|available|completed/.test(v))return "ok";return "info"};
export function StatusPill({value}:{value:unknown}){const text=String(value??"");if(!text)return null;return <span className={`rv-pill ${statusTone(text)}`}>{text}</span>}

export function RecordsModule({kind,store,site="ALL",onOpenRelated,focusId,onCloseFocus,onCreate}:{kind:Collection;store:Store;site?:string;onOpenRelated?:(kind:Collection,id:string)=>void;focusId?:string;onCloseFocus?:()=>void;onCreate?:()=>void}){
 const {data}=store;
 const recordView=useRecordView();
 const [search,setSearch]=useState(()=>{try{return sessionStorage.getItem(`akaria-search-${kind}`)??""}catch{return ""}});
 const [filters,setFilters]=useState<QueryFilters>(()=>{try{return JSON.parse(sessionStorage.getItem(`akaria-filters-${kind}`)??"{}") as QueryFilters}catch{return {}}});
 const [sort,setSort]=useState("id"),[descending,setDescending]=useState(true);
 const [page,setPage]=useState(0),[pageSize,setPageSize]=useState(10);
 const [editing,setEditing]=useState<"CREATE"|string|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [message,setMessage]=useState(""),[confirm,setConfirm]=useState<string|null>(null);
 const [importOpen,setImportOpen]=useState(false),[dueFrom,setDueFrom]=useState(""),[dueTo,setDueTo]=useState(""),[createdFrom,setCreatedFrom]=useState(""),[createdTo,setCreatedTo]=useState("");
 const [showArchived,setShowArchived]=useState(false),[overdueOnly,setOverdueOnly]=useState(false),[unassignedOnly,setUnassignedOnly]=useState(false);
 const [visibleColumns,setVisibleColumns]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem(`akaria-columns-v2-${kind}`)??"null")??columns[kind]}catch{return columns[kind]}});
 const [columnOpen,setColumnOpen]=useState(false),[filtersOpen,setFiltersOpen]=useState(false);
 const [savedViews,setSavedViews]=useState<Record<string,QueryFilters>>(()=>{try{return JSON.parse(localStorage.getItem(`akaria-views-${kind}`)??"{}") }catch{return {}}});
 const [viewName,setViewName]=useState("");
 const [loadedView,setLoadedView]=useState("");
 // Embedded "open record" requests from other screens are routed to the app-level view screen.
 useEffect(()=>{if(focusId&&recordView){recordView.open(kind,focusId);onCloseFocus?.()}},[focusId]);
 const filterKeys=filterFields[kind]??["status","siteId"];
 const hasDue=["requests","workOrders","ppmPlans","contracts","contractors","assets","bookings"].includes(kind);
 const hasCreated=["requests","workOrders","ppmPlans","applications","bookings","transfers","purchaseRequests"].includes(kind);
 const dueLabel=["assets","contracts","contractors"].includes(kind)?"Expiry":"Due";
 const records=useMemo(()=>queryRecords(data,kind,{text:search,filters,site,includeArchived:showArchived,dueFrom,dueTo,createdFrom,createdTo,overdueOnly,unassignedOnly,sort,descending}),[data,kind,search,filters,site,showArchived,dueFrom,dueTo,createdFrom,createdTo,overdueOnly,unassignedOnly,sort,descending]);
 const maxPage=Math.max(0,Math.ceil(records.length/pageSize)-1);
 const effectivePage=Math.min(page,maxPage);
 const visible=records.slice(effectivePage*pageSize,(effectivePage+1)*pageSize);
 const activeFilterCount=Object.values(filters).reduce((n,v)=>n+v.length,0)+[dueFrom,dueTo,createdFrom,createdTo].filter(Boolean).length+[overdueOnly,unassignedOnly,showArchived].filter(Boolean).length;
 const clearFilters=()=>{setSearch("");setFilters({});setDueFrom("");setDueTo("");setCreatedFrom("");setCreatedTo("");setOverdueOnly(false);setUnassignedOnly(false);setShowArchived(false);setPage(0);setLoadedView("")};
 const setDimension=(field:string,values:string[])=>{setFilters(prev=>({...prev,[field]:values}));setPage(0)};
 const toggleSort=(key:string)=>{setDescending(sort===key?!descending:false);setSort(key);setPage(0)};
 useEffect(()=>{try{sessionStorage.setItem(`akaria-search-${kind}`,search);sessionStorage.setItem(`akaria-filters-${kind}`,JSON.stringify(filters))}catch{}},[kind,search,filters]);
 useEffect(()=>{try{localStorage.setItem(`akaria-columns-v2-${kind}`,JSON.stringify(visibleColumns))}catch{}},[kind,visibleColumns]);
 useEffect(()=>{try{localStorage.setItem(`akaria-views-${kind}`,JSON.stringify(savedViews))}catch{}},[kind,savedViews]);
 const saveView=()=>{if(!viewName.trim()){setMessage("Name your saved filter view first.");return}setSavedViews(old=>({...old,[viewName.trim()]:filters}));setLoadedView(viewName.trim());setViewName("");setMessage(`Saved view: ${viewName.trim()}`)};
 const createUpdate=(values:Record<string,unknown>)=>{try{if(editing&&editing!=="CREATE")store.updateRecord(kind,editing,values);else {const id=store.createRecord(kind,values);view(id);}setMessage("Record saved and linked registers updated.");setEditing(null)}catch(e){notifyError(e,setMessage)}};
 const archive=()=>{if(confirm){const error=store.archiveRecord(kind,confirm);setMessage(error??`${confirm} archived. History remains available.`);}setConfirm(null)};
 const view=(id:string)=>{if(recordView)recordView.open(kind,id);else setSelected(id)};
 const onAction=(action:string,id:string)=>{if(action==="Edit")setEditing(id);if(action==="Archive")setConfirm(id);if(action==="View")view(id)};
 if(focusId&&recordView)return null;
 const inlineId=focusId??selected;
 if(inlineId)return <RecordDetail kind={kind} id={inlineId} store={store} onBack={()=>{setSelected(null);onCloseFocus?.()}} onOpen={(k,id)=>onOpenRelated?onOpenRelated(k,id):undefined}/>;
 return <section className="register working-register">
 <div className="register-title"><div><h2>{titles[kind]} register</h2><p>{records.length} {records.length===1?"record":"records"}{activeFilterCount||search?" match current filters":""}</p></div><div className="flow-button-row">{kind==="assets"&&<button className="secondary" onClick={()=>setImportOpen(true)}>Import asset CSV</button>}<button className="primary" onClick={()=>onCreate?onCreate():setEditing("CREATE")}>+ Create {/^[A-Z][a-z]/.test(titles[kind])?titles[kind].toLowerCase():titles[kind]}</button></div></div>
 <div className="rv-toolbar">
  <div className="rv-search"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input aria-label={`Search ${titles[kind]}`} placeholder="Search ID, name, linked asset, site..." value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}/>{search&&<button aria-label="Clear search" onClick={()=>{setSearch("");setPage(0)}}>×</button>}</div>
  <button className={`rv-tool ${filtersOpen?"on":""}`} aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(x=>!x)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M3 5h18M6 12h12M10 19h4"/></svg>Filters{activeFilterCount>0&&<b>{activeFilterCount}</b>}<span className="rv-caret" aria-hidden>⌄</span></button>
  <button className={`rv-tool ${columnOpen?"on":""}`} aria-expanded={columnOpen} onClick={()=>setColumnOpen(x=>!x)}>Columns</button>
  <button className="rv-tool" onClick={()=>csvDownload(`${kind}-filtered.csv`,records.map(rowObject),["id",...visibleColumns,"createdAt","openedAt","dueAt","resolutionDueAt"])}>Export CSV</button>
 </div>
 {filtersOpen&&<div className="rv-filter-panel" role="region" aria-label="Filters">
  <div className="rv-filter-grid">
   {filterKeys.map(key=><div className="rv-field" key={key}><span>{nice(key)}</span><MultiFilter label={nice(key)} field={key} data={data} values={availableFilterValues(data,kind,key)} selected={filters[key]??[]} onChange={values=>setDimension(key,values)}/></div>)}
   {hasDue&&<><label className="rv-field"><span>{dueLabel} from</span><input type="date" aria-label={`${dueLabel} from`} value={dueFrom} onChange={e=>{setDueFrom(e.target.value);setPage(0)}}/></label><label className="rv-field"><span>{dueLabel} to</span><input type="date" aria-label={`${dueLabel} to`} value={dueTo} onChange={e=>{setDueTo(e.target.value);setPage(0)}}/></label></>}
   {hasCreated&&<><label className="rv-field"><span>Created from</span><input type="date" value={createdFrom} onChange={e=>{setCreatedFrom(e.target.value);setPage(0)}}/></label><label className="rv-field"><span>Created to</span><input type="date" value={createdTo} onChange={e=>{setCreatedTo(e.target.value);setPage(0)}}/></label></>}
  </div>
  <div className="rv-filter-foot">
   <div className="rv-checks">
    {(kind==="requests"||kind==="workOrders"||kind==="ppmPlans")&&<label><input type="checkbox" checked={overdueOnly} onChange={e=>{setOverdueOnly(e.target.checked);setPage(0)}}/>Overdue only</label>}
    {(kind==="requests"||kind==="workOrders")&&<label><input type="checkbox" checked={unassignedOnly} onChange={e=>{setUnassignedOnly(e.target.checked);setPage(0)}}/>Unassigned only</label>}
    <label><input type="checkbox" checked={showArchived} onChange={e=>{setShowArchived(e.target.checked);setPage(0)}}/>Include archived</label>
   </div>
   <div className="rv-views">
    <select aria-label="Load saved view" value={loadedView} onChange={e=>{const name=e.target.value;setLoadedView(name);if(savedViews[name]){setFilters(savedViews[name]);setPage(0)}}}><option value="">Saved views</option>{Object.keys(savedViews).map(v=><option key={v}>{v}</option>)}</select>
    {loadedView?<button className="rv-tool" onClick={()=>{setSavedViews(old=>{const next={...old};delete next[loadedView];return next});setLoadedView("");setMessage("Saved view removed.")}}>Delete view</button>:<><input aria-label="New saved view name" value={viewName} onChange={e=>setViewName(e.target.value)} placeholder="Name this view"/><button className="rv-tool" onClick={saveView}>Save view</button></>}
    <button className="rv-tool ghost" onClick={clearFilters}>Clear all</button>
   </div>
  </div>
 </div>}
 {columnOpen&&<div className="ux-columns-panel" role="group" aria-label="Visible table columns">{columns[kind].map(key=><label key={key}><input type="checkbox" checked={visibleColumns.includes(key)} onChange={e=>setVisibleColumns(old=>e.target.checked?[...old,key]:old.filter(x=>x!==key))}/>{nice(key)}</label>)}<button className="secondary" onClick={()=>setVisibleColumns(columns[kind])}>Reset columns</button></div>}
 <FilterChips filters={filters} labelFor={nice} valueFor={(field,value)=>field.endsWith("Id")?pretty(data,value,field):value} onRemove={(field,value)=>setDimension(field,(filters[field]??[]).filter(x=>x!==value))}/>
 <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th><button onClick={()=>toggleSort("id")}>Record ID {sort==="id"?(descending?"↓":"↑"):"↕"}</button></th>{visibleColumns.map(k=><th key={k}><button onClick={()=>toggleSort(k)}>{nice(k)} {sort===k?(descending?"↓":"↑"):"↕"}</button></th>)}<th>Actions</th></tr></thead><tbody>{visible.map(rec=><tr key={rec.id}><td><button className="record-link" onClick={()=>onAction("View",rec.id)}>{rec.id}</button></td>{visibleColumns.map(k=><td key={k}>{k==="status"?<StatusPill value={rowObject(rec)[k]}/>:pretty(data,rowObject(rec)[k],k)}</td>)}<td><div className="workflow-actions"><button onClick={()=>onAction("View",rec.id)}>View</button><button onClick={()=>onAction("Edit",rec.id)}>Edit</button><button onClick={()=>onAction("Archive",rec.id)}>Archive</button></div></td></tr>)}</tbody></table>{!records.length&&<div className="working-empty">No matching records. <button className="link" onClick={clearFilters}>Clear filters</button></div>}</div>
 <div className="workflow-pages"><span>Showing {records.length?effectivePage*pageSize+1:0}–{Math.min(records.length,(effectivePage+1)*pageSize)} of {records.length}</span><label>Rows <select aria-label="Rows per page" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0)}}>{[10,25,50,100].map(n=><option key={n}>{n}</option>)}</select></label><button className="secondary" disabled={effectivePage===0} onClick={()=>setPage(effectivePage-1)}>Previous</button><button className="secondary" disabled={effectivePage>=maxPage} onClick={()=>setPage(effectivePage+1)}>Next</button></div>
 {message&&<div className="workflow-note" role="status">{message} <button onClick={()=>setMessage("")}>Dismiss</button></div>}
 {importOpen&&<AssetCsvImport store={store} onClose={()=>setImportOpen(false)} onDone={msg=>{setMessage(msg);setImportOpen(false)}}/>}
 {editing&&<Editor kind={kind} data={data} record={editing==="CREATE"?undefined:collection(data,kind).find(x=>x.id===editing)} onCancel={()=>setEditing(null)} onSave={createUpdate}/>}
 {confirm&&<ArchiveConfirm id={confirm} onCancel={()=>setConfirm(null)} onConfirm={archive}/>}
 </section>;
}

function ArchiveConfirm({id,onCancel,onConfirm}:{id:string;onCancel:()=>void;onConfirm:()=>void}){
 return <div className="modal-layer"><section className="form-modal workflow-modal rv-confirm" role="alertdialog" aria-modal="true" aria-label={`Archive ${id}`}><h3>Archive {id}?</h3><p>The record stays in historical links and the audit history. Linked open work can block this action.</p><div className="form-actions"><button className="secondary" onClick={onCancel}>Cancel</button><button className="primary danger" onClick={onConfirm}>Archive record</button></div></section></div>;
}

const hiddenDetailKeys=["id","timeline","archived","checklistResults","title","name","photos","evidence"];
const longKeys=["description","notes","checklist","content","address"];
/** Full-page record view screen (replaces the old detail popup). */
export function RecordDetail({kind,id,store,onBack,onOpen}:{kind:Collection;id:string;store:Store;onBack:()=>void;onOpen:(kind:Collection,id:string)=>void}){
 const {data}=store;
 const record=(data[kind] as RecordItem[]).find(x=>x.id===id);
 const [editing,setEditing]=useState(false),[confirm,setConfirm]=useState(false),[message,setMessage]=useState(""),[slaEdit,setSlaEdit]=useState(false);
 useEffect(()=>{setMessage("");setEditing(false);setConfirm(false);window.scrollTo({top:0})},[kind,id]);
 if(!record)return <section className="rv-page"><div className="rv-crumbs"><button className="rv-back" onClick={onBack}>← Back</button></div><div className="card rv-card"><h3>Record not found</h3><p className="workflow-caption">{id} does not exist in the {titles[kind].toLowerCase()} register, or it was removed.</p></div></section>;
 if(slaEdit&&kind==="contractors")return <ContractorOnboard store={store} contractorId={id} onCancel={()=>setSlaEdit(false)} onDone={()=>{setSlaEdit(false);setMessage("New SLA saved for this contractor.")}}/>;
 const row=rowObject(record);
 const heading=String(row.title??row.name??row.company??row.tag??id);
 const copy=async(text:string,label:string)=>{try{await navigator.clipboard.writeText(text);setMessage(`${label} copied.`)}catch{setMessage(`Could not copy ${label.toLowerCase()}. Your browser may restrict clipboard access.`)}};
 const run=(fn:()=>string|void)=>{try{const out=fn();if(out)setMessage(out)}catch(e){notifyError(e,setMessage)}};
 const entries=Object.entries(row).filter(([k,v])=>!hiddenDetailKeys.includes(k)&&!(typeof v==="object"&&v!==null&&!Array.isArray(v)));
 const short=entries.filter(([k])=>!longKeys.includes(k)),long=entries.filter(([k])=>longKeys.includes(k)&&row[k]);
 const timeline=Array.isArray(row.timeline)?[...(row.timeline as {id:string;label:string;at:string;actor:string}[])].reverse():[];
 const relatedWos=kind==="assets"?data.workOrders.filter(w=>w.assetId===id&&!w.archived):kind==="ppmPlans"?data.workOrders.filter(w=>w.ppmId===id&&!w.archived):kind==="contractors"?data.workOrders.filter(w=>w.contractorId===id&&!w.archived):[];
 const relatedPlans=kind==="assets"?data.ppmPlans.filter(p=>p.assetId===id&&!p.archived):[];
 const wo=kind==="workOrders"?record as WorkOrder:null;
 return <section className="rv-page">
  <div className="rv-crumbs"><button className="rv-back" onClick={onBack}>← Back</button><span>{titles[kind]}</span><span aria-hidden>›</span><b>{id}</b></div>
  <div className="card rv-hero">
   <div className="rv-hero-main"><small>{titles[kind]}</small><h2>{heading}</h2><div className="rv-meta"><code>{id}</code>{row.status!==undefined&&<StatusPill value={row.status}/>}{row.priority!==undefined&&<span className={`rv-pill ${statusTone(String(row.priority))}`}>{String(row.priority)} priority</span>}{kind==="workOrders"&&wo&&<span className={`rv-pill ${slaState(wo)==="Breached"?"danger":["On Track","Within SLA"].includes(slaState(wo))?"ok":"warn"}`}>{wo.status==="Closed"?(slaState(wo)==="Within SLA"?"Closed within SLA":"Closed after SLA breach"):`SLA ${slaState(wo).toLowerCase()} · ${timeRemaining(wo.resolutionDueAt)}`}</span>}</div></div>
   <div className="rv-hero-actions">
    <button className="rv-tool" onClick={()=>void copy(id,"Record ID")}>Copy ID</button>
    <button className="rv-tool" onClick={()=>void copy(`${window.location.origin}${window.location.pathname}${window.location.search}#record/${kind}/${encodeURIComponent(id)}`,"Record link")}>Copy link</button>
    <button className="rv-tool" onClick={()=>setEditing(true)}>Edit</button>
    <button className="rv-tool danger" onClick={()=>setConfirm(true)}>Archive</button>
   </div>
  </div>
  {(kind==="requests"||kind==="ppmPlans"||kind==="transfers"||kind==="workOrders")&&<div className="rv-actionbar">
   {kind==="requests"&&!row.linkedWorkOrderId&&<button className="secondary" onClick={()=>run(()=>{store.triageRequest(id);return `${id} classified using demo rules. Review and override priority as needed.`})}>Run assisted triage</button>}
   {kind==="requests"&&(row.linkedWorkOrderId?<button className="primary" onClick={()=>onOpen("workOrders",String(row.linkedWorkOrderId))}>Open {String(row.linkedWorkOrderId)}</button>:<button className="primary" onClick={()=>run(()=>`Linked work order ${store.createWorkOrder(id)} created.`)}>Create linked work order</button>)}
   {kind==="ppmPlans"&&<button className="primary" onClick={()=>run(()=>`Scheduled work order ${store.generatePpm(id)} created from ${id}.`)}>Generate due work order</button>}
   {kind==="transfers"&&<button className="primary" onClick={()=>run(()=>{store.approveTransfer(id);return "Transfer accepted; asset location updated and history retained."})}>Accept transfer</button>}
   {wo&&!wo.assignee&&<button className="primary" onClick={()=>run(()=>{store.assignWorkOrder(id,"Khalid Rahman","");return `${id} assigned to Khalid Rahman.`})}>Assign to Khalid Rahman</button>}
   {wo&&wo.status==="Assigned"&&<button className="primary" onClick={()=>run(()=>{store.setWorkOrderStatus(id,"In Progress");return `${id} started.`})}>Start work</button>}
   {wo&&wo.status==="In Progress"&&<button className="primary" onClick={()=>run(()=>{store.setWorkOrderStatus(id,"Closed");return `${id} closed.`})}>Close work order</button>}
  </div>}
  {message&&<div className="workflow-note" role="status">{message} <button onClick={()=>setMessage("")}>Dismiss</button></div>}
  {(kind==="workOrders"||kind==="requests")&&<WorkflowTrace data={data} kind={kind} id={id} onOpen={onOpen}/>}
  {kind==="contractors"&&<ContractorSlaCard data={data} contractorId={id} onChange={()=>setSlaEdit(true)}/>}
  <div className="rv-grid">
   <article className="card rv-card"><h3>Details</h3><dl className="rv-dl">{short.map(([k,v])=>{const rel=fieldsForRelation(k);return <div key={k}><dt>{nice(k)}</dt><dd>{k==="status"?<StatusPill value={v}/>:rel&&typeof v==="string"&&v?<button className="rv-link" onClick={()=>onOpen(rel,v)}>{pretty(data,v,k)} <span aria-hidden>↗</span></button>:pretty(data,v,k)}</dd></div>})}</dl>
    {long.map(([k,v])=><div className="rv-long" key={k}><dt>{nice(k)}</dt><dd>{String(v)}</dd></div>)}
   </article>
   <div className="rv-side">
    {(relatedWos.length>0||relatedPlans.length>0)&&<article className="card rv-card"><h3>Linked records</h3>{relatedWos.map(w=><button className="rv-related" key={w.id} onClick={()=>onOpen("workOrders",w.id)}><span><b>{w.title}</b><small>{w.id} · {w.status}</small></span><span aria-hidden>›</span></button>)}{relatedPlans.map(p=><button className="rv-related" key={p.id} onClick={()=>onOpen("ppmPlans",p.id)}><span><b>{p.title}</b><small>{p.id} · {p.recurrence} PPM</small></span><span aria-hidden>›</span></button>)}</article>}
    <article className="card rv-card"><h3>Activity & audit</h3>{timeline.length?<div className="rv-timeline">{timeline.map(x=><div key={x.id}><i/><span><b>{x.label}</b><small>{x.actor} · {formatDate(x.at)}</small></span></div>)}</div>:<p className="workflow-caption">No activity recorded for this record yet.</p>}</article>
   </div>
  </div>
  {editing&&<Editor kind={kind} data={data} record={record} onCancel={()=>setEditing(false)} onSave={values=>{try{store.updateRecord(kind,id,values);setEditing(false);setMessage("Changes saved and linked registers updated.")}catch(e){notifyError(e,setMessage)}}}/>}
  {confirm&&<ArchiveConfirm id={id} onCancel={()=>setConfirm(false)} onConfirm={()=>{const error=store.archiveRecord(kind,id);setConfirm(false);if(error)setMessage(error);else onBack()}}/>}
 </section>;
}

function parseCsvText(text:string):string[][]{
 const lines:string[][]=[];let row:string[]=[],field="",quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(ch===","&&!quoted){row.push(field);field="";}
  else if((ch==="\n"||ch==="\r")&&!quoted){if(ch==="\r"&&text[i+1]==="\n")i++;row.push(field);if(row.some(Boolean))lines.push(row);row=[];field="";}
  else field+=ch;
 }
 if(quoted)throw new Error("Unterminated CSV quote.");row.push(field);if(row.some(Boolean))lines.push(row);return lines;
}
function AssetCsvImport({store,onClose,onDone}:{store:Store;onClose:()=>void;onDone:(message:string)=>void}){
 const [rows,setRows]=useState<Record<string,string>[]>([]),[errors,setErrors]=useState<string[]>([]),[name,setName]=useState("");
 const upload=async(file?:File)=>{if(!file)return;if(file.size>2*1024*1024){setErrors(["CSV must be 2 MB or less."]);return;}
 try{const parsed=parseCsvText((await file.text()).replace(/^\uFEFF/,""));const headers=parsed.shift()?.map(x=>x.trim())??[];
 if(!["tag","title","siteId"].every(x=>headers.includes(x)))throw new Error("CSV must include tag,title,siteId columns.");
 const records=parsed.map(cols=>Object.fromEntries(headers.map((h,i)=>[h,cols[i]??""])));
 const errors:string[]=[];const seen=new Set<string>();for(const [i,r] of records.entries()){
  if(!r.tag?.trim()||!r.title?.trim())errors.push(`Row ${i+2}: tag and title required`);
  if(!store.data.sites.some(s=>s.id===r.siteId))errors.push(`Row ${i+2}: siteId not found`);
  if(store.data.assets.some(a=>a.tag.toLowerCase()===r.tag?.toLowerCase())||seen.has(r.tag?.toLowerCase()))errors.push(`Row ${i+2}: duplicate asset tag`);
  seen.add(r.tag?.toLowerCase());
 }
 setRows(records);setErrors(errors);setName(file.name);
 }catch(e){setErrors([String(e)]);setRows([])}};
 return <div className="modal-layer"><div className="form-modal workflow-modal" role="dialog" aria-modal="true" aria-label="Asset CSV import"><div className="workflow-modal-head"><div><strong>Import assets from CSV</strong><p>Preview and validate before saving · local browser demo</p></div><button className="secondary" onClick={onClose}>Close</button></div><p>Required headers: <code>tag,title,siteId</code>. Optional columns include category, location, model and serial. New stable AST IDs are assigned; duplicate asset tags are rejected.</p><input type="file" accept=".csv,text/csv" onChange={e=>void upload(e.target.files?.[0])}/>{name&&<p>{name}: {rows.length} rows found</p>}{errors.length>0&&<div className="workflow-note">{errors.slice(0,10).map(e=><p key={e}>{e}</p>)}</div>}{rows.length>0&&<div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Tag</th><th>Asset</th><th>Site</th></tr></thead><tbody>{rows.slice(0,20).map((r,i)=><tr key={i}><td>{r.tag}</td><td>{r.title}</td><td>{r.siteId}</td></tr>)}</tbody></table></div>}<div className="form-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={!rows.length||errors.length>0} onClick={()=>{for(const row of rows){const asset:Record<string,unknown>={...row};delete asset.id;store.createRecord("assets",asset)}onDone(`${rows.length} assets imported with new immutable IDs.`)}}>Import validated rows</button></div></div></div>
}

/* ───────── Work order trace: Raise → Classify → Assign → Execute → Evidence → Confirm → Report ───────── */
type TraceStep={key:string;title:string;state:"done"|"current"|"pending"|"alert";at?:string;who?:string;lines:{label:string;value:React.ReactNode}[];extra?:React.ReactNode};
const ago=(iso?:string)=>iso?formatDate(iso):undefined;
function findEvent(timeline:{label:string;at:string;actor:string}[]|undefined,re:RegExp){return timeline?.find(e=>re.test(e.label))}
function checklistFor(data:DemoState,wo:WorkOrder):string[]{const plan=data.ppmPlans.find(p=>p.id===wo.ppmId);const fromPlan=plan?.checklist?.split("\n").map(x=>x.trim()).filter(Boolean)??[];if(fromPlan.length)return fromPlan;const asset=data.assets.find(a=>a.id===wo.assetId);return defaultChecklist(asset?.category)}
export function defaultChecklist(category?:string){if(category==="HVAC")return["Isolate power and apply LOTO","Inspect belts, bearings and mountings","Measure vibration and motor current","Check refrigerant / water temperatures","Clean and restore panels","Test run and confirm normal operation"];if(category==="Electrical")return["Isolate and test for dead","Inspect terminations and breakers","Thermal scan of panel","Restore supply and verify loads"];return["Make the area safe","Diagnose the fault","Carry out the repair","Test and confirm with requester"]}
export function WorkflowTrace({data,kind,id,onOpen}:{data:DemoState;kind:"workOrders"|"requests";id:string;onOpen:(kind:Collection,id:string)=>void}){
 const request=kind==="requests"?data.requests.find(r=>r.id===id):undefined;
 const wo=kind==="workOrders"?data.workOrders.find(w=>w.id===id):data.workOrders.find(w=>w.id===request?.linkedWorkOrderId);
 const sr=request??(wo?.requestId?data.requests.find(r=>r.id===wo.requestId):undefined);
 const plan=wo?.ppmId?data.ppmPlans.find(p=>p.id===wo.ppmId):undefined;
 const asset=data.assets.find(a=>a.id===(wo?.assetId??sr?.assetId));
 const site=data.sites.find(x=>x.id===(wo?.siteId??sr?.siteId));
 const contractor=wo?.contractorId?data.contractors.find(c=>c.id===wo.contractorId):undefined;
 const movements=wo?data.movements.filter(m=>m.workOrderId===wo.id):[];
 const prs=wo?data.purchaseRequests.filter(p=>p.workOrderId===wo.id):[];
 const steps=wo?checklistFor(data,wo):[];
 const doneSteps=wo?steps.filter(x=>wo.checklistResults?.[x]).length:0;
 const photos=wo?.photos??[];
 const link=(k:Collection,v?:string,label?:string)=>v?<button className="rv-link" onClick={()=>onOpen(k,v)}>{label??v} <span aria-hidden>↗</span></button>:<span className="tr-muted">—</span>;
 const rule=wo?chooseSla(data,wo.priority,wo.contractorId,wo.openedAt):undefined;
 const closed=wo?.status==="Closed";
 const trace:TraceStep[]=[
  {key:"raise",title:"Raise",state:"done",at:sr?.createdAt??wo?.openedAt,who:sr?.requester??(plan?"PPM scheduler":"Supervisor"),lines:sr?[{label:"Service request",value:link("requests",sr.id,`${sr.id} · ${sr.title}`)},{label:"Channel",value:sr.channel},{label:"Requester",value:sr.requester}]:plan?[{label:"Source",value:"Preventive plan"},{label:"PPM plan",value:link("ppmPlans",plan.id,`${plan.id} · ${plan.title}`)},{label:"Occurrence",value:ago(wo?.occurrenceAt)??"—"}]:[{label:"Source",value:"Created directly by supervisor"}]},
  {key:"classify",title:"Classify",state:"done",at:findEvent(sr?.timeline,/classif/i)?.at??sr?.createdAt??wo?.openedAt,who:"System rule",lines:[{label:"Category",value:sr?.category??asset?.category??"—"},{label:"Priority",value:<span className={`rv-pill ${statusTone(String(wo?.priority??sr?.priority))}`}>{wo?.priority??sr?.priority}</span>},{label:"SLA rule",value:rule?`${rule.id} · respond ${rule.responseMinutes} min · resolve ${rule.resolutionMinutes} min`:"Applied when the work order is created"}]},
  {key:"assign",title:"Assign",state:wo?.assignee||wo?.contractorId?"done":wo?"current":"pending",at:findEvent(wo?.timeline,/assign/i)?.at,who:findEvent(wo?.timeline,/assign/i)?.actor,lines:wo?[{label:"Work order",value:kind==="workOrders"?<b>{wo.id}</b>:link("workOrders",wo.id,`${wo.id} · ${wo.status}`)},{label:"Assigned to",value:wo.assignee??<span className="tr-warn">Not assigned yet</span>},{label:"Contractor",value:contractor?link("contractors",contractor.id,contractor.name):"In-house team"},{label:"Site",value:link("sites",site?.id,site?.name)}]:[{label:"Work order",value:<span className="tr-warn">Not created yet</span>}]},
  {key:"execute",title:"Execute",state:!wo?"pending":wo.startedAt||wo.firstResponseAt||closed?"done":wo.arrivedAt||wo.acceptedAt?"current":"pending",at:wo?.startedAt??wo?.arrivedAt??wo?.acceptedAt,who:wo?.assignee,lines:wo?[{label:"Machine",value:asset?link("assets",asset.id,`${asset.tag} · ${asset.title}`):"No asset linked"},{label:"Accepted",value:ago(wo.acceptedAt)??"—"},{label:"Arrived on site",value:ago(wo.arrivedAt)??"—"},{label:"Asset QR verified",value:wo.assetVerifiedAt?`Yes · ${ago(wo.assetVerifiedAt)}`:"—"},{label:"Checklist",value:`${doneSteps} / ${steps.length} steps`},{label:"Diagnosis",value:wo.diagnosis||"—"}]:[]},
  {key:"evidence",title:"Evidence",state:!wo?"pending":photos.length||movements.length?"done":"pending",at:photos[photos.length-1]?.at??movements[0]?.createdAt,who:wo?.assignee,lines:wo?[{label:"Photos",value:`${photos.length} captured`},{label:"Parts issued",value:movements.length?movements.map(m=>{const part=data.parts.find(p=>p.id===m.partId);return `${Math.abs(m.qty)} × ${part?.name??m.partId}`}).join(", "):"None"},{label:"Material cost",value:`SAR ${(wo.materialCost??0).toLocaleString()}`},...(prs.length?[{label:"Purchase requests",value:<>{prs.map(p=><span key={p.id}>{link("purchaseRequests",p.id)} </span>)}</>}]:[])]:[],extra:photos.length?<div className="tr-photos">{photos.map(p=><figure key={p.id}><img src={p.thumb} alt={`${p.stage} photo`}/><figcaption>{p.stage}</figcaption></figure>)}</div>:undefined},
  {key:"confirm",title:"Confirm",state:!wo?"pending":sr?.status==="Closed"||(!sr&&closed)?"done":closed||wo.signedOff?"current":"pending",at:sr?.confirmedAt??(wo?.signedOff?findEvent(wo.timeline,/signed off/i)?.at:undefined),who:sr?.requester??wo?.signedBy,lines:wo?[{label:"On-site sign-off",value:wo.signedOff?`Signed by ${wo.signedBy??"requester"}`:"—"},...(sr?[{label:"Requester confirmation",value:sr.status==="Closed"?`Confirmed ${ago(sr.confirmedAt)??""}`:sr.status==="Resolved"?<span className="tr-warn">Waiting for requester</span>:"—"},{label:"Rating",value:sr.rating?`${"★".repeat(sr.rating)}${"☆".repeat(5-sr.rating)} ${sr.feedback?`· ${sr.feedback}`:""}`:"—"}]:[])]:[]},
  {key:"report",title:"Report",state:closed?"done":"pending",at:wo?.resolvedAt,who:"System",lines:wo?[{label:"Resolved",value:ago(wo.resolvedAt)??"—"},{label:"SLA result",value:<span className={`rv-pill ${slaState(wo)==="Breached"?"danger":slaState(wo)==="Within SLA"||slaState(wo)==="On Track"?"ok":"warn"}`}>{slaState(wo)}</span>},{label:"Asset lifetime cost",value:asset?`SAR ${asset.lifetimeCost.toLocaleString()} (incl. this job)`:"—"}]:[]},
 ];
 const firstOpen=trace.findIndex(t=>t.state!=="done");
 if(firstOpen>=0&&trace[firstOpen].state==="pending")trace[firstOpen].state="current";
 if(wo&&slaState(wo)==="Breached"&&!closed){const cur=trace.find(t=>t.state==="current");if(cur)cur.state="alert"}
 return <section className="card tr-card" aria-label="Workflow trace">
  <div className="tr-head"><div><h3>Workflow trace</h3><p>Raise → Classify → Assign → Execute → Evidence → Confirm → Report. Every step is time-stamped and linked.</p></div>
   <div className="tr-chips">{sr&&<button className="tr-chip" onClick={()=>onOpen("requests",sr.id)}><small>Service request</small><b>{sr.id}</b></button>}{wo&&<button className="tr-chip" onClick={()=>kind!=="workOrders"&&onOpen("workOrders",wo.id)}><small>Work order</small><b>{wo.id}</b></button>}{asset&&<button className="tr-chip" onClick={()=>onOpen("assets",asset.id)}><small>Machine</small><b>{asset.tag}</b></button>}<span className="tr-chip static"><small>Assigned to</small><b>{wo?.assignee??"Unassigned"}</b></span>{site&&<span className="tr-chip static"><small>Site</small><b>{site.name}</b></span>}</div>
  </div>
  <ol className="tr-steps">{trace.map((t,i)=><li key={t.key} className={`tr-step ${t.state}`}><div className="tr-dot" aria-hidden>{t.state==="done"?"✓":i+1}</div><div className="tr-body"><div className="tr-title"><b>{t.title}</b><span>{t.state==="done"?"Done":t.state==="current"?"In progress":t.state==="alert"?"SLA breached":"Pending"}</span></div>{(t.at||t.who)&&<small className="tr-when">{[t.at&&formatDate(t.at),t.who].filter(Boolean).join(" · ")}</small>}<dl>{t.lines.map(l=><div key={l.label}><dt>{l.label}</dt><dd>{l.value}</dd></div>)}</dl>{t.extra}</div></li>)}</ol>
 </section>;
}

/* ───────── Contractor SLA card on contractor view ───────── */
function ContractorSlaCard({data,contractorId,onChange}:{data:DemoState;contractorId:string;onChange:()=>void}){
 const own=data.slaRules.filter(r=>r.contractorId===contractorId&&!r.archived);
 const latestRule=(p:string)=>own.filter(r=>r.priority===p).sort((a,b)=>b.version-a.version)[0];
 const c=data.contractors.find(x=>x.id===contractorId);
 return <section className="card rv-card"><div className="tr-head"><div><h3>Assigned SLA</h3><p>{own.length?`${c?.slaTier??"Custom"} tier · contractor-specific rules override the global defaults`:"No contractor-specific SLA yet · global default rules apply"}</p></div><button className="primary" onClick={onChange}>{own.length?"Change SLA":"Assign SLA"}</button></div>
  <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Priority</th><th>Respond within</th><th>Resolve within</th><th>Source</th></tr></thead><tbody>{["Emergency","High","Medium","Low"].map(p=>{const r=latestRule(p)??chooseSla(data,p);return <tr key={p}><td><span className={`rv-pill ${statusTone(p)}`}>{p}</span></td><td>{fmtMin(r.responseMinutes)}</td><td>{fmtMin(r.resolutionMinutes)}</td><td>{r.contractorId?`${r.id} · v${r.version}`:"Global default"}</td></tr>})}</tbody></table></div>
 </section>;
}
export const fmtMin=(m:number)=>m<60?`${m} min`:m%60===0?`${m/60} h`:`${Math.floor(m/60)} h ${m%60} min`;
