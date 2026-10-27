import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { createSeed, slaState, timeRemaining, useDemoData, type DemoState } from "./demoData";
import {HelpDeskFlow, WorkOrderFlow, PpmFlow, SpacesFlow, ContractorFlow, StockFlow, ReportsFlow, LifecycleFlow, SlaFlow} from "./OperationalFlows";
import {PortalLogin,MobileShell} from "./Login";
import PartnerPortal,{type PartnerSession} from "./PartnerPortal";
import {RecordsModule,RecordDetail,RecordViewContext,type RecordViewApi} from "./WorkingModules";
import {allSearchResults,normalizeSearch} from "./UXQuery";
import type {Collection} from "./demoData";
import {ExecutiveTargets,SupervisorDashboard,Asset360,NotificationCenter,GovernanceAudit,AssetTags,MigrationReadiness} from "./BRDFlows";

type IconName = "sla" | "overview" | "help" | "work" | "assets" | "ppm" | "spaces" | "people" | "stock" | "reports" | "settings" | "search" | "bell" | "calendar" | "export" | "clock" | "arrow";

function Icon({ name, size = 19 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    sla: <><path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.3 7.5 9.5 4.4-1.2 7.5-4.9 7.5-9.5V6z"/><path d="m8.8 12.2 2.2 2.2 4.3-4.6"/></>,
    overview: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    help: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v2a3.5 3.5 0 0 0 0 7v2a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-2a3.5 3.5 0 0 0 0-7z"/><path d="M9 8v8"/></>,
    work: <><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4h8v2M3 11h18M10 11v2h4v-2"/></>,
    assets: <><path d="M12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10"/></>,
    ppm: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></>,
    spaces: <><path d="M4 21V5l8-3 8 3v16M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1M2 21h20"/></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
    stock: <><path d="m21 8-9-5-9 5 9 5zM3 8v8l9 5 9-5V8M12 13v8"/></>,
    reports: <path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>,
    settings: <><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9" strokeDasharray="3 3"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M14 21h-4"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    export: <><path d="M12 3v12M7 8l5-5 5 5M5 21h14a2 2 0 0 0 2-2v-4M3 15v4a2 2 0 0 0 2 2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

const subtitles = [
  ["Facility performance and operations across all sites","أداء المرافق والعمليات في جميع المواقع"],
  ["Service requests from every intake channel","طلبات الخدمة من جميع قنوات الاستقبال"],
  ["Planned, reactive and dispatched maintenance work","أعمال الصيانة المخططة والطارئة"],
  ["Asset register, 360° history and tagging","سجل الأصول والسجل الكامل والترميز"],
  ["Recurring maintenance plans and generated work","خطط الصيانة الدورية والأعمال الناتجة"],
  ["Sites, rooms, bookings and occupancy","المواقع والغرف والحجوزات والإشغال"],
  ["Service partners and their contracts","مقدمو الخدمات وعقودهم"],
  ["Spare parts, stock movements and replenishment","قطع الغيار وحركة المخزون وإعادة الطلب"],
  ["Operational, cost and contractor performance reports","تقارير التشغيل والتكلفة وأداء المقاولين"],
  ["Audit history, notifications, data quality and integrations","سجل التدقيق والإشعارات وجودة البيانات والتكاملات"],
  ["Asset transfers, retirement and disposal","نقل الأصول والإحلال والتخلص"],
  ["Partner onboarding, SLA rules and the service level agreement","تسجيل الشركاء وقواعد ومستوى الخدمة"],
] as const;

const nav = [
  ["Overview","نظرة عامة","overview"],["Help Desk","مكتب المساعدة","help"],["Work Orders","أوامر العمل","work"],
  ["Assets","الأصول","assets"],["Preventive Maintenance","الصيانة الوقائية","ppm"],["Spaces","المساحات","spaces"],
  ["Contractors","المقاولون","people"],["Inventory","المخزون","stock"],
  ["Reports","التقارير","reports"],["Governance","الحوكمة","settings"],["Asset Lifecycle","دورة حياة الأصول","assets"],
  ["SLA","اتفاقيات مستوى الخدمة","sla"],
] as const;

function Button({ children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={className} {...props}>{children}</button>;
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="panel-head"><div><strong>{title}</strong><small>{subtitle}</small></div>{action}</div>;
}

type OpenRecord = (type: "workOrder" | "request" | "asset", id: string) => void;
const siteName = (data: DemoState, id: string) => data.sites.find(site => site.id === id)?.name ?? id;
const assetName = (data: DemoState, id?: string) => data.assets.find(asset => asset.id === id)?.tag ?? "—";
const withinScope = <T extends { siteId: string }>(records: T[], site: string) => site === "ALL" ? records : records.filter(record => record.siteId === site);

function Overview({ data = createSeed(), site = "ALL", open = () => undefined }: { data?: DemoState; site?: string; open?: OpenRecord }) {
  const requests = withinScope(data.requests, site);
  const workOrders = withinScope(data.workOrders, site);
  const active = workOrders.filter(item => !["Closed", "Cancelled"].includes(item.status));
  const responded = workOrders.filter(item => item.firstResponseAt);
  const sla = responded.length ? Math.round(responded.filter(item => item.firstResponseAt! <= item.responseDueAt).length / responded.length * 100) : 100;
  const duePlans = withinScope(data.ppmPlans, site);
  const ppm = duePlans.length ? Math.round(duePlans.filter(item => item.status === "Active" && Date.parse(item.nextDueAt) >= Date.now()).length / duePlans.length * 100) : 0;
  const monthly = Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(5-i));return {label:d.toLocaleDateString(undefined,{month:"short"}),month:d.getMonth(),year:d.getFullYear()};});
  const monthlyClosed=monthly.map(d=>workOrders.filter(w=>w.status==="Closed" && new Date(w.resolvedAt??w.openedAt).getMonth()===d.month && new Date(w.resolvedAt??w.openedAt).getFullYear()===d.year).length);
  const monthlyWithin=monthly.map(d=>workOrders.filter(w=>w.status==="Closed" && new Date(w.resolvedAt??w.openedAt).getMonth()===d.month && new Date(w.resolvedAt??w.openedAt).getFullYear()===d.year && slaState(w)==="Within SLA").length);
  const chartMax=Math.max(1,...monthlyClosed);
  const plot=(values:number[])=>values.map((value,i)=>`${i?"L":"M"}${i*124} ${175-value/chartMax*145}`).join(" ");
  const mixCounts={preventive:workOrders.filter(w=>w.type==="Preventive").length,corrective:workOrders.filter(w=>w.type==="Corrective").length,other:workOrders.filter(w=>!["Corrective","Preventive"].includes(w.type)).length};
  const mixTotal=workOrders.length||1,percent=(x:number)=>Math.round(100*x/mixTotal);
  const siteStats=data.sites.filter(x=>site==="ALL"||x.id===site).map(x=>{const plans=data.ppmPlans.filter(p=>p.siteId===x.id&&!p.archived);const good=plans.filter(p=>p.status==="Active"&&Date.parse(p.nextDueAt)>=Date.now()).length;return {name:x.name,good,total:plans.length,pct:plans.length?Math.round(good/plans.length*100):0}});
  const kpis = [
    ["Open requests",String(requests.filter(item => item.status !== "Resolved").length),"From shared records","blue"],
    ["Active work orders",String(active.length),`${active.filter(item => slaState(item) !== "On Track").length} need attention`,"blue"],
    ["Response SLA",`${sla}%`,"Calculated from timestamps","green"],["PPM compliance",`${ppm}%`,"Target ≥95% (separate)","green"],
  ];
  const critical = active.filter(item => item.priority === "Emergency" || slaState(item) !== "On Track").slice(0, 4);
  return <>
    <section className="kpis">{kpis.map((k,i) => <article className="card kpi" key={k[0]}>
      <span>{k[0]}</span><strong>{k[1]}</strong><small className={k[3]}>{k[2]}</small>
      <div className={`spark ${k[3]}`}>{[42,59,48,73,62,88,76].map((h,j)=><i key={j} style={{height:`${h}%`}} />)}</div>
    </article>)}</section>
    <section className="split">
      <article className="card chart">
        <PanelHeader title="Work order performance" subtitle="Response and completion trend" action={<span className="select">Last 6 months</span>}/>
        <div className="legend"><span><i className="blue-dot"/>Completed</span><span><i className="green-dot"/>Within SLA</span></div>
        <div className="line-chart"><span>{chartMax}<br/><br/>{Math.round(chartMax/2)}<br/><br/>0</span><div>
          <svg viewBox="0 0 620 190" preserveAspectRatio="none"><path className="line blue-line" d={plot(monthlyClosed)}/><path className="line green-line" d={plot(monthlyWithin)}/></svg>
          <div className="months">{monthly.map(d=><span key={`${d.year}-${d.month}`}>{d.label}</span>)}</div>
        </div></div>
      </article>
      <article className="card mix"><PanelHeader title="Maintenance mix" subtitle="Current month"/>
        <div className="donut-row"><div className="donut" style={{background:`conic-gradient(#173c70 0 ${percent(mixCounts.preventive)}%,#2870d2 ${percent(mixCounts.preventive)}% ${percent(mixCounts.preventive+mixCounts.corrective)}%,#dbe3ef ${percent(mixCounts.preventive+mixCounts.corrective)}% 100%)`}}><div><strong>{workOrders.length}</strong><small>Total jobs</small></div></div>
        <div className="mix-list"><p><span><i className="navy-dot"/>Preventive</span><b>{percent(mixCounts.preventive)}%</b></p><p><span><i className="blue-dot"/>Corrective</span><b>{percent(mixCounts.corrective)}%</b></p><p><span><i className="pale-dot"/>Other</span><b>{percent(mixCounts.other)}%</b></p></div></div>
        <div className="insight"><span>✓</span><div><strong>Demo-record breakdown</strong><small>Counts recalculate as work orders change</small></div></div>
      </article>
    </section>
    <section className="split lower">
      <article className="card issues"><PanelHeader title="Critical issues" subtitle="Calculated from live SLA deadlines" action={<span className="link">Top critical records</span>}/>
        <div className="table"><div className="tr th"><span>Work order</span><span>Priority</span><span>Status</span><span>Time remaining</span></div>
        {critical.map(item=><Button className="tr record-row" key={item.id} onClick={()=>open("workOrder",item.id)}><span className="issue"><b>{item.title}</b><small>{item.id} · {siteName(data,item.siteId)}</small></span><span><i className={`badge ${item.priority.toLowerCase()}`}>{item.priority}</i></span><span>◉ {slaState(item)}</span><span className={slaState(item)==="Breached"?"danger":""}><Icon name="clock" size={14}/>{timeRemaining(item.resolutionDueAt)}</span></Button>)}</div>
      </article>
      <article className="card sites"><PanelHeader title="PPM by site" subtitle="October compliance"/>
        {siteStats.map(x=><div className="progress" key={x.name}><div><span>{x.name}</span><b>{x.pct}%</b></div><p><i style={{width:`${x.pct}%`}}/></p><small>{x.good} / {x.total} scheduled plans on track</small></div>)}
      </article>
    </section>
  </>;
}

function AssetExecutiveDashboard({data}:{data:DemoState}){
  const value=data.assets.reduce((sum,item)=>sum+item.lifetimeCost,0);
  return <><section className="executive-kpis">{[["Total assets",data.assets.length.toLocaleString(),"Shared register"],["Lifetime maintenance cost",`SAR ${(value/1000).toFixed(1)}K`,"Costs from recorded assets"],["Active assets",String(data.assets.filter(x=>x.status==="Operational").length),"Shared register"],["Under maintenance",String(data.workOrders.filter(x=>x.status==="In Progress").length),"Shared register"],["PPM overdue",String(data.ppmPlans.filter(x=>x.status==="Overdue"||Date.parse(x.nextDueAt)<Date.now()).length),"Calculated due status"],["Pending partner applications",String(data.applications.filter(x=>x.status==="Submitted").length),"Review queue"]].map(x=><article className="card" key={x[0]}><small>{x[0]}</small><strong>{x[1]}</strong><span>{x[2]}</span><div className="tiny-line">⌁</div></article>)}</section><section className="executive-charts"><article className="card"><PanelHeader title="Assets by lifecycle stage" subtitle={`${data.assets.length} registered assets`}/><div className="asset-donut"><strong>{data.assets.length}</strong><small>Assets</small></div><ChartLegend/></article><article className="card"><PanelHeader title="Recorded maintenance cost" subtitle={`SAR ${value.toLocaleString()} lifetime costs`}/><div className="asset-donut category"><strong>{Math.round(value/1000)}K</strong><small>SAR</small></div><ChartLegend/></article><article className="card"><PanelHeader title="Asset lifecycle overview" subtitle="Illustrative chart; connect depreciation ledger for actual book values"/><div className="book-chart"><svg viewBox="0 0 500 180" preserveAspectRatio="none"><path d="M0 40 C120 44 240 47 500 52 L500 170 L0 170Z" fill="#e9f1fd"/><path d="M0 40 C120 44 240 47 500 52" fill="none" stroke="#2869d3" strokeWidth="3"/><path d="M0 140 C180 130 330 105 500 92" fill="none" stroke="#9aa8ba" strokeDasharray="7 5" strokeWidth="2"/></svg><div><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span></div></div></article></section></>
}
function ChartLegend(){return <div className="chart-list">{["Planning 9.7%","Master 16.7%","Acquisition 18.1%","Operations 19.2%","Maintenance 11.1%"].map(x=><span key={x}><i/>{x}</span>)}</div>}

function SimpleRows({ headers, rows }: { headers:string[]; rows:string[][] }) {
  return <div className="simple-rows" style={{"--cols":headers.length} as CSSProperties}><div className="simple-head">{headers.map(x=><span key={x}>{x}</span>)}</div>{rows.map((row,i)=><div className="simple-row" key={i}>{row.map((value,j)=><span key={j}>{j===0?<b>{value}</b>:value}</span>)}</div>)}</div>;
}

function OverviewWorkspaces({store,site,open}:{store:ReturnType<typeof useDemoData>;site:string;open:OpenRecord}) {
 const [view,setView]=useState("Operations");
 return <><div className="flow-tabs module-tabs" role="tablist" aria-label="Dashboard views">{["Operations","Asset Executive","Supervisor","KPI Targets","Notifications"].map(x=><Button key={x} role="tab" aria-selected={view===x} className={view===x?"active":""} onClick={()=>setView(x)}>{x}</Button>)}</div>{view==="Operations"?<Overview data={store.data} site={site} open={open}/>:view==="Asset Executive"?<AssetExecutiveDashboard data={store.data}/>:view==="Supervisor"?<SupervisorDashboard store={store} site={site} onOpen={open}/>:view==="KPI Targets"?<ExecutiveTargets data={store.data} site={site}/>:<NotificationCenter store={store} site={site} onOpen={open}/>}</>;
}
function AssetWorkspaces({store,site,open}:{store:ReturnType<typeof useDemoData>;site:string;open:OpenRecord}) {
 const [view,setView]=useState("Asset register");
 return <><div className="flow-tabs module-tabs" role="tablist" aria-label="Asset views">{["Asset register","Asset 360","Print asset tags"].map(x=><Button role="tab" aria-selected={view===x} className={view===x?"active":""} key={x} onClick={()=>setView(x)}>{x}</Button>)}</div>{view==="Asset register"?<RecordsModule kind="assets" store={store} site={site}/>:view==="Asset 360"?<Asset360 store={store} site={site} onOpen={open}/>:<AssetTags store={store} site={site}/>}</>;
}

const typeToKind={request:"requests",workOrder:"workOrders",asset:"assets"} as const;

function WebPortal({store,onSignOut,onMobile}:{store:ReturnType<typeof useDemoData>;onSignOut:()=>void;onMobile:()=>void}) {
  const [active,setActive] = useState(0);
  const [arabic,setArabic] = useState(false);
  const [notices,setNotices] = useState(false);
  const [menu,setMenu] = useState(false);
  const [site,setSite] = useState("ALL");
  const [siteOpen,setSiteOpen] = useState(false);
  const [searchOpen,setSearchOpen] = useState(false);
  const [query,setQuery] = useState("");
  const [records,setRecords] = useState<{kind:Collection;id:string}[]>([]);
  const [resetOpen,setResetOpen] = useState(false);
  const { data } = store;
  const recordView=useMemo<RecordViewApi>(()=>({open:(kind,id)=>{setSearchOpen(false);setNotices(false);setRecords(stack=>{const top=stack[stack.length-1];return top&&top.kind===kind&&top.id===id?stack:[...stack,{kind,id}]})}}),[]);
  const openAny=recordView.open;
  const open: OpenRecord = (type,id) => openAny(typeToKind[type],id);
  const current=records[records.length-1];
  const go=(index:number)=>{setActive(index);setRecords([]);setMenu(false);window.scrollTo({top:0})};
  useEffect(()=>{const onKey=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setSearchOpen(true)}else if(e.key==="Escape"){setSearchOpen(false);setNotices(false);setSiteOpen(false)}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey)},[]);
  useEffect(()=>{
   const restore=()=>{const match=window.location.hash.match(/^#record\/([A-Za-z]+)\/(.+)$/);if(!match)return;const kinds:Collection[]=["sites","assets","requests","workOrders","ppmPlans","parts","contractors","rooms","applications","bookings","transfers","contracts","purchaseRequests"];const kind=match[1] as Collection;if(kinds.includes(kind))openAny(kind,decodeURIComponent(match[2]))};
   restore();window.addEventListener("hashchange",restore);return()=>window.removeEventListener("hashchange",restore);
  },[]);
  const scopedWos = withinScope(data.workOrders,site);
  const notifications = [
    ...data.notifications.filter(x=>!x.readAt).map(x=>({label:x.message,type:x.recordType==="requests"?"request" as const:"workOrder" as const,id:x.recordId,notificationId:x.id})),
    ...scopedWos.filter(x=>slaState(x)!=="On Track"&&x.status!=="Closed").map(x=>({label:`${x.id} is ${slaState(x).toLowerCase()}`,type:"workOrder" as const,id:x.id})),
    ...data.contracts.filter(x=>!x.archived&&x.status==="Active"&&Date.parse(x.endAt)-Date.now()<30*86400000).map(x=>({label:`${x.id} expires within 30 days`,type:null,id:x.id,module:6})),
    ...withinScope(data.parts,site).filter(x=>x.qty<=x.reorderLevel).map(x=>({label:`${x.name} is below reorder level`,type:null,id:x.id,module:7})),
  ];
  const [searchKind,setSearchKind]=useState<Collection|"ALL">("ALL");
  const searchResults = query.trim().length<2?[]:allSearchResults(data,query,site).filter(x=>searchKind==="ALL"||x.kind===searchKind).slice(0,36);
  const exportCsv = () => {
    const rows = withinScope(data.workOrders,site).map(x=>[x.id,x.title,x.type,x.priority,x.status,siteName(data,x.siteId)]);
    const csv=[["ID","Title","Type","Priority","Status","Site"],...rows].map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\n");
    const url=URL.createObjectURL(new Blob(["﻿",csv],{type:"text/csv;charset=utf-8"})); const anchor=document.createElement("a"); anchor.href=url; anchor.download="akaria-work-orders.csv"; anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),1500);
  };
  const counts=(i:number)=>i===7?data.parts.filter(x=>!x.archived&&x.qty<=x.reorderLevel).length:i===2?data.workOrders.filter(x=>!x.archived&&!["Closed","Cancelled"].includes(x.status)).length:i===1?data.requests.filter(x=>!x.archived&&!["Resolved","Closed","Cancelled"].includes(x.status)).length:i===11?data.applications.filter(x=>x.status==="Submitted"||x.status==="Under Review").length:0;
  const kindLabel:Record<string,string>={requests:"Service requests",workOrders:"Work orders",assets:"Assets",ppmPlans:"PPM plans",sites:"Sites",rooms:"Rooms",parts:"Spare parts",contractors:"Contractors",contracts:"Contracts",applications:"SLA applications",bookings:"Bookings",transfers:"Asset transfers",purchaseRequests:"Purchase requests"};
  return <RecordViewContext.Provider value={recordView}><div className="app" dir={arabic?"rtl":"ltr"}>
    <aside className={menu?"open":""}>
      <div className="brand"><img src={`${import.meta.env.BASE_URL}akaria-logo.png`} alt="AKARIA"/><span>CAFM</span></div>
      <label>{arabic?"مساحة العمل":"Workspace"}</label>
      <nav aria-label="Modules">{nav.map((x,i)=><Button className={active===i?"active":""} aria-current={active===i?"page":undefined} key={x[0]} onClick={()=>go(i)}><Icon name={x[2]}/><span>{arabic?x[1]:x[0]}</span>{counts(i)>0&&<i>{counts(i)}</i>}</Button>)}</nav>
      <div className="aside-bottom"><Button onClick={()=>setResetOpen(true)}><Icon name="settings"/><span>Reset demo data</span></Button></div>
    </aside>
    {menu&&<Button className="scrim" aria-label="Close menu" onClick={()=>setMenu(false)}/>}
    <main>
      <header><Button className="hamburger" aria-label="Open menu" onClick={()=>setMenu(true)}>☰</Button><Button className="search" onClick={()=>setSearchOpen(true)}><Icon name="search"/><span>Search records, assets, locations...</span><kbd>⌘ K</kbd></Button>
        <div className="top-actions"><div className="scope-wrap"><Button className="scope" onClick={()=>setSiteOpen(!siteOpen)}><span><small>Site scope</small><strong>{site==="ALL"?"All sites":siteName(data,site)}</strong></span>⌄</Button>{siteOpen&&<div className="scope-menu"><Button onClick={()=>{setSite("ALL");setSiteOpen(false)}}>All sites</Button>{data.sites.map(x=><Button key={x.id} onClick={()=>{setSite(x.id);setSiteOpen(false)}}>{x.name}<small>{x.city}</small></Button>)}</div>}</div><Button className="language" onClick={()=>setArabic(!arabic)}>{arabic?"EN":"عربي"}</Button><Button className="bell" aria-label={`Notifications (${notifications.length})`} onClick={()=>setNotices(!notices)}><Icon name="bell"/>{notifications.length>0&&<i/>}</Button><div className="user"><b>FA</b><span><strong>Fahad Al-Salem</strong><small>FM Director</small></span></div><Button className="signout" onClick={onMobile} title="Open the technician app"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg><span>Technician app</span></Button><Button className="signout" onClick={onSignOut} title="Sign out"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg><span>Sign out</span></Button></div>
        {notices&&<div className="notices"><strong>Notifications · {notifications.length}</strong>{notifications.map((x,i)=><Button key={`${x.id}-${i}`} onClick={()=>{if(x.type)open(x.type,x.id);else if("module" in x)go(x.module as number);if("notificationId" in x&&x.notificationId)store.markNotificationRead(x.notificationId);setNotices(false)}}>{x.label}<small>{x.type?"Open record":"Open related module"}</small></Button>)}</div>}
      </header>
      {searchOpen&&<div className="modal-layer" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)setSearchOpen(false)}}><div className="search-modal" role="dialog" aria-modal="true" aria-label="Global record search"><div><Icon name="search"/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search any ID, WO, asset tag, requester or site"/><Button onClick={()=>{setQuery("");setSearchKind("ALL")}}>Clear</Button><Button onClick={()=>setSearchOpen(false)}>Close</Button></div><div className="ux-global-search-filters"><label>Type<select aria-label="Global search entity type" value={searchKind} onChange={e=>setSearchKind(e.target.value as Collection|"ALL")}><option value="ALL">All record types</option>{Object.entries(kindLabel).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><small>Results limited to the selected site scope</small></div>{query.trim().length<2?<p>Enter at least two characters to search across CAFM records.</p>:searchResults.length?<section>{searchResults.map(x=><Button key={`${x.kind}-${x.id}`} onClick={()=>openAny(x.kind,x.id)}><span><b>{x.title}</b><small>{kindLabel[x.kind]??x.kind} · {x.id} · {x.context}</small></span><Icon name="arrow" size={15}/></Button>)}</section>:<p>No matching records in the current site scope.</p>}</div></div>}
      <div className="content">
        <div className="page-head"><div><small>AKARIA CAFM › {arabic?nav[active][1]:nav[active][0]}</small><h1>{active===0?(arabic?"نظرة عامة على المحفظة":"Portfolio overview"):active===11&&!arabic?"Service Level Agreements":(arabic?nav[active][1]:nav[active][0])}</h1><p>{subtitles[active][arabic?1:0]}</p></div>
          <div className="page-actions"><span className="demo">● Local demo data</span>{active===0&&<Button className="export" onClick={exportCsv}><Icon name="export" size={16}/>Export WO CSV</Button>}</div>
        </div>
        {current&&<RecordDetail key={`${current.kind}-${current.id}`} kind={current.kind} id={current.id} store={store} onBack={()=>setRecords(stack=>stack.slice(0,-1))} onOpen={openAny}/>}
        <div hidden={Boolean(current)}>
          {active===0?<OverviewWorkspaces store={store} site={site} open={open}/>:active===1?<HelpDeskFlow store={store} site={site}/>:active===2?<WorkOrderFlow store={store} site={site}/>:active===3?<AssetWorkspaces store={store} site={site} open={open}/>:active===4?<PpmFlow store={store} site={site}/>:active===5?<SpacesFlow store={store} site={site}/>:active===6?<ContractorFlow store={store} site={site}/>:active===7?<StockFlow store={store} site={site}/>:active===8?<ReportsFlow store={store} site={site}/>:active===9?<GovernanceDemo store={store} site={site} open={open}/>:active===10?<LifecycleFlow store={store}/>:<SlaFlow store={store}/>}
        </div>
      </div>
    </main>
    {resetOpen&&<div className="modal-layer" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setResetOpen(false)}}><section className="form-modal workflow-modal rv-confirm" role="alertdialog" aria-modal="true" aria-label="Reset demo data"><h3>Reset demo data?</h3><p>All records you created or changed in this browser are replaced with the original sample data. This cannot be undone.</p><div className="form-actions"><Button className="secondary" onClick={()=>setResetOpen(false)}>Cancel</Button><Button className="primary danger" onClick={()=>{store.reset();setResetOpen(false);go(0)}}>Reset data</Button></div></section></div>}
  </div></RecordViewContext.Provider>;
}

function GovernanceDemo({store,site,open}:{store:ReturnType<typeof useDemoData>;site:string;open:OpenRecord}) {
 const [tab,setTab]=useState("Audit history");
 return <section><div className="flow-tabs module-tabs" role="tablist">{["Audit history","Notifications","Data migration","Integrations"].map(x=><Button key={x} role="tab" aria-selected={tab===x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{x}</Button>)}</div>{tab==="Notifications"?<NotificationCenter store={store} site={site} onOpen={open}/>:tab==="Audit history"?<GovernanceAudit store={store}/>:tab==="Data migration"?<MigrationReadiness store={store}/>:<div className="register flow-panel"><h2>Integration status</h2><p>All production connections require an authorized backend. This is a browser-persisted prototype.</p><SimpleRows headers={["Integration","State","Details"]} rows={[["Local demo store","Working in demo","Browser-local persistence"],["SAP ERP","Not connected","POs, suppliers and costs require API integration"],["AD/SSO","Not connected","Demo roles are not production authentication"],["Email / WhatsApp / SMS","Simulated","Manual demo queues only"],["CAD/BIM","Not connected","Sample floorplan only"],["BMS alarms","Future phase","IoT supply excluded from scope"]]}/></div>}</section>;
}

type Mode="login"|"web"|"mobile"|"partner";
export default function App(){
  const store=useDemoData();
  const [mode,setMode]=useState<Mode>(()=>{try{const m=sessionStorage.getItem("akaria-mode");return m==="web"||m==="mobile"||m==="partner"?m:"login"}catch{return "login"}});
  const [partner,setPartner]=useState<PartnerSession>(()=>{try{return JSON.parse(sessionStorage.getItem("akaria-partner")??"null") as PartnerSession}catch{return null}});
  useEffect(()=>{try{sessionStorage.setItem("akaria-mode",mode);sessionStorage.setItem("akaria-partner",JSON.stringify(partner))}catch{/* storage unavailable */}window.scrollTo({top:0})},[mode,partner]);
  const signOut=()=>{setPartner(null);setMode("login")};
  if(mode==="login")return <PortalLogin store={store} onEnter={d=>{setPartner(d.partner??null);setMode(d.mode)}}/>;
  if(mode==="mobile")return <MobileShell store={store} onExit={signOut} onWeb={()=>setMode("web")}/>;
  if(mode==="partner")return <PartnerPortal key={partner?.email??"public"} store={store} session={partner} onSignOut={signOut} onSession={setPartner}/>;
  return <WebPortal store={store} onSignOut={signOut} onMobile={()=>setMode("mobile")}/>;
}
