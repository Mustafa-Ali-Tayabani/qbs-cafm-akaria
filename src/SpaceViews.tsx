import {lazy, Suspense, useLayoutEffect, useMemo, useRef, useState} from "react";
import type {Booking, Room, Store} from "./demoData";
import type {PlanRect} from "./Building3D";

/* Spaces views: hierarchy tree, architectural 2D plan / 3D model, and occupancy summary. Plans are generated from room area, not CAD/BIM. */

const Building3D=lazy(()=>import("./Building3D"));
const PLAN_W=1000,PLAN_H=600,PAD=20,CORRIDOR=70;

const usage=(r:{occupancy:number;capacity:number})=>r.capacity?r.occupancy/r.capacity:0;
const pct=(v:number)=>`${Math.round(v*100)}%`;
const sum=(rooms:Room[],k:"occupancy"|"capacity"|"areaSqm")=>rooms.reduce((a,r)=>a+(r[k]??0),0);
const area=(r:Room)=>Math.max(20,r.areaSqm??60);
const uniq=(xs:string[])=>Array.from(new Set(xs));
const plural=(n:number,word:string)=>`${n} ${word}${n===1?"":"s"}`;
function floorRank(f:string){const l=f.toLowerCase();if(l.includes("basement"))return -1;if(l.includes("ground"))return 0;if(l.includes("roof"))return 100;const n=parseInt(l.replace(/\D/g,""),10);return Number.isNaN(n)?50:n}
const byFloor=(a:string,b:string)=>floorRank(a)-floorRank(b);
const time=(v:string)=>new Date(v).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
const seats=(rooms:Room[])=>`${sum(rooms,"occupancy")} of ${sum(rooms,"capacity")} seats in use`;

/** Splits a floor's rooms into two rows either side of a corridor, with widths proportional to area. */
function layoutFloor(rooms:Room[]):PlanRect[]{
 const sorted=[...rooms].sort((a,b)=>area(b)-area(a)),rows:[Room[],Room[]]=[[],[]],totals=[0,0];
 for(const r of sorted){const i=totals[0]<=totals[1]?0:1;rows[i].push(r);totals[i]+=area(r)}
 const rowH=(PLAN_H-PAD*2-CORRIDOR)/2,innerW=PLAN_W-PAD*2;
 return rows.flatMap((row,i)=>{let x=PAD;const t=Math.max(1,totals[i]);return row.map(room=>{const w=innerW*area(room)/t,rect={room,x,y:i===0?PAD:PAD+rowH+CORRIDOR,w,h:rowH,top:i===0};x+=w;return rect})});
}

function useSpaceScope(store:Store,site:string){
 const sites=store.data.sites.filter(s=>site==="ALL"||s.id===site);
 const rooms=store.data.rooms.filter(r=>!r.archived&&(site==="ALL"||r.siteId===site));
 return {sites,rooms};
}

function Section({title,subtitle,actions,children}:{title:string;subtitle?:string;actions?:React.ReactNode;children:React.ReactNode}){
 return <section className="register flow-panel sv-panel"><div className="sv-head"><div><h2>{title}</h2>{subtitle&&<p className="workflow-caption">{subtitle}</p>}</div>{actions}</div>{children}</section>;
}

/** Seats-in-use bar with its meaning spelled out next to it. */
function Usage({occupancy,capacity}:{occupancy:number;capacity:number}){
 const u=usage({occupancy,capacity});
 return <div className="sv-usage"><span className="sv-usage-bar"><span style={{width:pct(Math.min(1,u))}}/></span><small>{occupancy} / {capacity} seats · {pct(u)}</small>{u>=0.85&&<em>Nearly full</em>}</div>;
}

/** F01–F04 portfolio → site → building → floor → room tree, drawn left to right; one branch open per level. */
export function SpaceHierarchyView({store,site}:{store:Store;site:string}){
 const {sites,rooms}=useSpaceScope(store,site);
 const [open,setOpen]=useState<{site?:string;building?:string;floor?:string}>(()=>({site:sites[0]?.id}));
 const host=useRef<HTMLDivElement>(null),[links,setLinks]=useState<string[]>([]);
 const siteRooms=rooms.filter(r=>r.siteId===open.site);
 const buildingRooms=siteRooms.filter(r=>r.building===open.building);
 const floorRooms=buildingRooms.filter(r=>r.floor===open.floor);
 // Connector curves are measured from the rendered boxes: parent's right edge → each child's left edge.
 useLayoutEffect(()=>{
  const el=host.current;if(!el)return;
  const draw=()=>{const base=el.getBoundingClientRect();setLinks([...el.querySelectorAll<HTMLElement>("[data-parent]")].flatMap(child=>{
   const parent=el.querySelector<HTMLElement>(`[data-node="${CSS.escape(child.dataset.parent!)}"]`);if(!parent)return [];
   const p=parent.getBoundingClientRect(),c=child.getBoundingClientRect(),x1=p.right-base.left,y1=p.top+p.height/2-base.top,x2=c.left-base.left,y2=c.top+c.height/2-base.top,mx=(x1+x2)/2;
   return [`M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`];
  }))};
  draw();const observer=new ResizeObserver(draw);observer.observe(el);return ()=>observer.disconnect();
 },[open,rooms.length,sites.length]);
 const node=(id:string,parent:string|undefined,kind:string,icon:string,name:string,lines:string[],isOpen:boolean,onClick?:()=>void)=><button type="button" data-node={id} data-parent={parent} className={`sv-node sv-node-${kind.toLowerCase()}${isOpen?" open":""}`} onClick={onClick} aria-expanded={onClick?isOpen:undefined} disabled={!onClick}>
  <span className="sv-node-kind"><span aria-hidden>{icon}</span> {kind}</span><strong>{name}</strong>{lines.map(l=><small key={l}>{l}</small>)}
  {onClick&&<span className="sv-node-toggle">{isOpen?"Open ›":"Show ›"}</span>}</button>;
 const buildings=uniq(siteRooms.map(r=>r.building)),floors=uniq(buildingRooms.map(r=>r.floor)).sort(byFloor);
 const column=(title:string,children:React.ReactNode,hint?:string)=><div className="sv-col"><h4>{title}</h4>{children}{hint&&<p className="sv-col-hint">{hint}</p>}</div>;
 return <Section title="Space hierarchy" subtitle="Portfolio → site → building → floor → room. Click a box to show what's inside it.">
  {!rooms.length?<div className="working-empty">No rooms registered. Create them in the Rooms register.</div>:<div className="sv-tree-scroll"><div className="sv-tree" ref={host}>
   <svg className="sv-tree-links" aria-hidden>{links.map(d=><path key={d} d={d}/>)}</svg>
   {column("Portfolio",node("root",undefined,"Portfolio","🗂","All sites",[plural(sites.length,"site"),plural(rooms.length,"room")],true))}
   {column("Sites",sites.map(s=>{const rs=rooms.filter(r=>r.siteId===s.id),isOpen=open.site===s.id;return <div key={s.id}>{node(`s:${s.id}`,"root","Site","📍",s.name,[s.city,plural(rs.length,"room")],isOpen,()=>setOpen({site:s.id}))}</div>}))}
   {column("Buildings",buildings.map(b=>{const bs=siteRooms.filter(r=>r.building===b);return <div key={b}>{node(`b:${b}`,`s:${open.site}`,"Building","🏢",b,[plural(uniq(bs.map(r=>r.floor)).length,"floor"),`${sum(bs,"areaSqm").toLocaleString()} m²`],open.building===b,()=>setOpen({site:open.site,building:b}))}</div>}),!open.site?"Pick a site":undefined)}
   {column("Floors",floors.map(f=>{const fs=buildingRooms.filter(r=>r.floor===f);return <div key={f}>{node(`f:${f}`,`b:${open.building}`,"Floor","▤",f,[plural(fs.length,"room"),seats(fs)],open.floor===f,()=>setOpen({...open,floor:f}))}</div>}),!open.building?"Pick a building":undefined)}
   {column("Rooms",floorRooms.map(r=><div key={r.id} data-node={`r:${r.id}`} data-parent={`f:${open.floor}`} className="sv-node sv-node-room"><span className="sv-node-kind"><span aria-hidden>▢</span> Room</span><strong>{r.name}</strong><small>{r.department} · {r.areaSqm??"—"} m²</small><Usage occupancy={r.occupancy} capacity={r.capacity}/></div>),!open.floor?"Pick a floor":undefined)}
  </div></div>}
  {open.floor&&<p className="workflow-caption sv-tree-foot">Showing {plural(floorRooms.length,"room")} on {open.floor}, {open.building}. Each bar shows how many of the room's seats are in use right now.</p>}
 </Section>;
}

type RoomKind="desks"|"meeting"|"parking"|"plant"|"storage"|"reception"|"dining";
function roomKind(r:Room):RoomKind{
 const n=r.name.toLowerCase();
 if(/meeting|board|training/.test(n))return "meeting";
 if(/parking|loading|dock|warehouse/.test(n))return "parking";
 if(/plant|mechanical|electrical|ahu|chiller|lift|water|server/.test(n))return "plant";
 if(/store|archive|parts/.test(n))return "storage";
 if(/lobby|reception|security|prayer/.test(n))return "reception";
 if(/cafeteria|pantry|break|lounge/.test(n))return "dining";
 return "desks";
}

/** Simple architectural furniture symbols so each room reads as what it is. */
function Furniture({kind,x,y,w,h}:{kind:RoomKind;x:number;y:number;w:number;h:number}){
 if(w<40||h<30)return null;
 const items:React.ReactNode[]=[];
 if(kind==="desks"){const cols=Math.max(1,Math.floor(w/48)),rows=Math.max(1,Math.floor(h/42));for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const dx=x+i*(w/cols)+(w/cols-36)/2,dy=y+j*(h/rows)+4;items.push(<g key={`${i}-${j}`}><rect x={dx} y={dy} width={36} height={16} rx={2}/><circle cx={dx+18} cy={dy+25} r={6}/></g>)}}
 if(kind==="meeting"){const tw=Math.min(w*0.7,260),th=Math.min(h*0.35,60),tx=x+(w-tw)/2,ty=y+(h-th)/2,n=Math.max(2,Math.floor(tw/26));items.push(<rect key="t" x={tx} y={ty} width={tw} height={th} rx={th/2}/>);for(let i=0;i<n;i++){const cx=tx+(i+0.5)*tw/n;items.push(<circle key={`a${i}`} cx={cx} cy={ty-9} r={6}/>,<circle key={`b${i}`} cx={cx} cy={ty+th+9} r={6}/>)}}
 if(kind==="parking"){const n=Math.max(1,Math.floor(w/46));for(let i=0;i<=n;i++)items.push(<line key={i} x1={x+i*w/n} x2={x+i*w/n} y1={y} y2={y+h*0.55}/>);for(let i=0;i<n;i+=2)items.push(<rect key={`c${i}`} x={x+i*w/n+8} y={y+8} width={w/n-16} height={h*0.55-16} rx={6}/>)}
 if(kind==="plant"){const n=Math.max(1,Math.min(3,Math.floor(w/90))),bw=Math.min(70,w/n-20),bh=Math.min(70,h-20);for(let i=0;i<n;i++){const bx=x+i*w/n+(w/n-bw)/2,by=y+(h-bh)/2;items.push(<g key={i}><rect x={bx} y={by} width={bw} height={bh}/><line x1={bx} y1={by} x2={bx+bw} y2={by+bh}/><line x1={bx+bw} y1={by} x2={bx} y2={by+bh}/></g>)}}
 if(kind==="storage"){const n=Math.max(1,Math.floor(h/34));for(let i=0;i<n;i++)items.push(<rect key={i} x={x+6} y={y+i*(h/n)+6} width={w-12} height={12}/>)}
 if(kind==="reception"){const cw=Math.min(w*0.6,200);items.push(<path key="d" d={`M${x+(w-cw)/2} ${y+12} q${cw/2} 40 ${cw} 0`} fill="none"/>);if(h>80)items.push(<rect key="s1" x={x+10} y={y+h-30} width={Math.min(80,w/3)} height={22} rx={6}/>,<rect key="s2" x={x+w-10-Math.min(80,w/3)} y={y+h-30} width={Math.min(80,w/3)} height={22} rx={6}/>)}
 if(kind==="dining"){const cols=Math.max(1,Math.floor(w/70)),rows=Math.max(1,Math.floor(h/70));for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const cx=x+(i+0.5)*w/cols,cy=y+(j+0.5)*h/rows;items.push(<g key={`${i}-${j}`}><circle cx={cx} cy={cy} r={14}/>{[0,1,2,3].map(k=><circle key={k} cx={cx+Math.cos(k*Math.PI/2)*22} cy={cy+Math.sin(k*Math.PI/2)*22} r={5}/>)}</g>)}}
 return <g className="sv-furniture" aria-hidden>{items}</g>;
}

function Plan2D({rects,selected,onSelect}:{rects:PlanRect[];selected?:string;onSelect:(id:string)=>void}){
 return <svg className="sv-plan" viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} role="img" aria-label="Floor plan">
  <rect x={PAD} y={(PLAN_H-CORRIDOR)/2} width={PLAN_W-PAD*2} height={CORRIDOR} className="sv-plan-corridor"/>
  <text x={PLAN_W/2} y={PLAN_H/2+5} textAnchor="middle" className="sv-plan-corridor-label">CORRIDOR</text>
  {rects.map(({room,x,y,w,h,top})=>{const isSel=selected===room.id,doorW=Math.min(34,w*0.3),doorX=x+w-doorW-14,doorY=top?y+h:y,small=w<120,u=usage(room);return <g key={room.id} className={`sv-plan-room${isSel?" selected":""}`} onClick={()=>onSelect(room.id)} tabIndex={0} role="button" aria-label={`${room.name}, ${room.occupancy} of ${room.capacity} seats in use`} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onSelect(room.id)}}>
   <rect x={x} y={y} width={w} height={h} className="sv-plan-floor"/>
   <Furniture kind={roomKind(room)} x={x+12} y={y+(small?40:52)} w={w-24} h={h-(small?52:66)}/>
   <rect x={x} y={y} width={w} height={h} className="sv-plan-wall"/>
   <line x1={doorX} x2={doorX+doorW} y1={doorY} y2={doorY} className="sv-plan-door-gap"/>
   <path d={top?`M${doorX} ${doorY} A${doorW} ${doorW} 0 0 0 ${doorX+doorW} ${doorY-doorW}`:`M${doorX} ${doorY} A${doorW} ${doorW} 0 0 1 ${doorX+doorW} ${doorY+doorW}`} className="sv-plan-swing"/>
   <text x={x+12} y={y+22} className="sv-plan-name" style={{fontSize:small?11:14}}>{small&&room.name.length>14?`${room.name.slice(0,13)}…`:room.name}</text>
   <text x={x+12} y={y+(small?36:40)} className={`sv-plan-meta${u>=0.85?" full":""}`}>{room.occupancy}/{room.capacity} seats{small?"":` · ${room.areaSqm??"—"} m²`}</text>
  </g>})}
  <rect x={PAD} y={PAD} width={PLAN_W-PAD*2} height={PLAN_H-PAD*2} className="sv-plan-shell"/>
  <g transform={`translate(${PLAN_W-54} ${PLAN_H/2+6})`} className="sv-plan-compass"><circle r="16"/><path d="M0 -11 L4 3 L0 0 L-4 3Z"/><text y="-20" textAnchor="middle">N</text></g>
 </svg>;
}

function RoomDetail({room,bookings,siteName}:{room?:Room;bookings:Booking[];siteName:string}){
 if(!room)return <div className="sv-detail"><h3>No room selected</h3><p className="workflow-caption">Click any room to see its department, how full it is and its bookings.</p></div>;
 const own=bookings.filter(b=>b.roomId===room.id&&!b.archived).sort((a,b)=>a.startAt.localeCompare(b.startAt));
 return <div className="sv-detail">
  <small>{room.id}</small><h3>{room.name}</h3>
  <p className="workflow-caption">{siteName} › {room.building} › {room.floor}</p>
  <dl><div><dt>Department</dt><dd>{room.department}</dd></div><div><dt>Area</dt><dd>{room.areaSqm??"—"} m²</dd></div></dl>
  <h4>Seats in use now</h4><Usage occupancy={room.occupancy} capacity={room.capacity}/>
  <h4>Bookings</h4>
  {own.length?<ul>{own.map(b=><li key={b.id}><b>{time(b.startAt)}–{time(b.endAt)}</b> {b.purpose}<small>{b.person} · {new Date(b.startAt).toLocaleDateString()}</small></li>)}</ul>:<p className="workflow-caption">No bookings for this room.</p>}
 </div>;
}

/** Architectural 2D plan per floor, plus an orbitable 3D building model. */
export function FloorplanView({store,site}:{store:Store;site:string}){
 const {sites,rooms}=useSpaceScope(store,site);
 const [siteSel,setSiteSel]=useState(""),[buildingSel,setBuildingSel]=useState(""),[floorSel,setFloorSel]=useState(""),[selected,setSelected]=useState<string>(),[mode,setMode]=useState<"2d"|"3d">("2d");
 const siteId=sites.some(s=>s.id===siteSel)?siteSel:sites[0]?.id;
 const buildings=uniq(rooms.filter(r=>r.siteId===siteId).map(r=>r.building));
 const building=buildings.includes(buildingSel)?buildingSel:buildings[0];
 // Memoised on the source records so the 3D scene isn't rebuilt on unrelated renders.
 const {bRooms,floors,layouts}=useMemo(()=>{
  const bRooms=store.data.rooms.filter(r=>!r.archived&&r.siteId===siteId&&r.building===building);
  const floors=uniq(bRooms.map(r=>r.floor)).sort(byFloor);
  return {bRooms,floors,layouts:Object.fromEntries(floors.map(f=>[f,layoutFloor(bRooms.filter(r=>r.floor===f))]))};
 },[store.data.rooms,siteId,building]);
 const floor=floors.includes(floorSel)?floorSel:floors[0];
 const floorRooms=bRooms.filter(r=>r.floor===floor);
 const pickFloor=(f:string)=>{setFloorSel(f);setSelected(undefined)};
 return <Section title="Floorplan" subtitle="Layout generated from room records and their areas · CAD/BIM drawings not connected" actions={<div className="sv-segmented" role="group" aria-label="View">{([["2d","2D plan"],["3d","3D building"]] as const).map(([v,l])=><button type="button" key={v} className={mode===v?"active":""} aria-pressed={mode===v} onClick={()=>setMode(v)}>{l}</button>)}</div>}>
  <div className="brd-hierarchy-controls">
   <label>Site<select value={siteId??""} onChange={e=>{setSiteSel(e.target.value);setBuildingSel("");pickFloor("")}}>{sites.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
   <label>Building<select value={building??""} onChange={e=>{setBuildingSel(e.target.value);pickFloor("")}}>{buildings.map(b=><option key={b}>{b}</option>)}</select></label>
  </div>
  {!floors.length?<div className="working-empty">No rooms registered here. Create them in the Rooms register.</div>:<>
   <div className="sv-floor-tabs" role="tablist" aria-label="Floor">{[...floors].reverse().map(f=><button type="button" role="tab" key={f} aria-selected={f===floor} className={f===floor?"active":""} onClick={()=>pickFloor(f)}>{f}</button>)}</div>
   <div className="sv-plan-layout">
    <div className="sv-plan-wrap">
     <p className="sv-floor-summary"><b>{building} · {floor}</b> — {plural(floorRooms.length,"room")}, {sum(floorRooms,"areaSqm").toLocaleString()} m², {seats(floorRooms)}</p>
     {mode==="2d"?<Plan2D rects={layouts[floor]??[]} selected={selected} onSelect={setSelected}/>:<Suspense fallback={<div className="b3d working-empty">Loading 3D model…</div>}><Building3D floors={floors} layouts={layouts} planW={PLAN_W} planH={PLAN_H} current={floor} selected={selected} onFloor={pickFloor} onSelect={setSelected}/></Suspense>}
     <p className="workflow-caption">{mode==="2d"?"Click a room for details. Seat counts turn red when a room is 85% full or more.":"Drag to rotate · scroll to zoom · click a floor label to open it · click a room for details. Floors above the open one are shown as glass."}</p>
    </div>
    <RoomDetail room={bRooms.find(r=>r.id===selected)} bookings={store.data.bookings} siteName={sites.find(s=>s.id===siteId)?.name??""}/>
   </div>
  </>}
 </Section>;
}

function UsageList({rows}:{rows:{label:string;sub?:string;occupancy:number;capacity:number}[]}){
 return <div className="sv-usage-list">{rows.map(r=><div key={r.label}><span>{r.label}{r.sub&&<small>{r.sub}</small>}</span><Usage occupancy={r.occupancy} capacity={r.capacity}/></div>)}</div>;
}

/** Plain-language occupancy summary, nearly-full/empty rooms and today's bookings. */
export function OccupancyView({store,site}:{store:Store;site:string}){
 const {sites,rooms}=useSpaceScope(store,site);
 const siteName=(id:string)=>sites.find(s=>s.id===id)?.name??id;
 const roomIds=new Set(rooms.map(r=>r.id));
 const start=new Date();start.setHours(7,0,0,0);const end=new Date(start);end.setHours(19);
 const span=end.getTime()-start.getTime();
 const today=store.data.bookings.filter(b=>!b.archived&&roomIds.has(b.roomId)&&Date.parse(b.endAt)>start.getTime()&&Date.parse(b.startAt)<end.getTime());
 const timelineRooms=rooms.filter(r=>today.some(b=>b.roomId===r.id));
 const nowPos=(Date.now()-start.getTime())/span;
 const offset=(v:string)=>Math.max(0,Math.min(1,(Date.parse(v)-start.getTime())/span));
 const busiest=rooms.filter(r=>usage(r)>=0.85).sort((a,b)=>usage(b)-usage(a));
 const empty=rooms.filter(r=>r.occupancy===0);
 return <>
  <Section title="Occupancy right now" subtitle="How many seats are being used, from current room records">
   <div className="sv-kpis">
    <div><small>Seats in use</small><strong>{sum(rooms,"occupancy")} <span>of {sum(rooms,"capacity")}</span></strong><p>{pct(sum(rooms,"occupancy")/Math.max(1,sum(rooms,"capacity")))} of all seats are taken</p></div>
    <div><small>Rooms</small><strong>{rooms.length}</strong><p>{sum(rooms,"areaSqm").toLocaleString()} m² across {plural(sites.length,"site")}</p></div>
    <div><small>Nearly full rooms</small><strong>{busiest.length}</strong><p>85% of seats or more in use</p></div>
    <div><small>Empty rooms</small><strong>{empty.length}</strong><p>Nobody in the room now</p></div>
   </div>
   <div className="sv-chart-grid">
    <div><h3>Seats in use by site</h3><UsageList rows={sites.map(s=>{const rs=rooms.filter(r=>r.siteId===s.id);return {label:s.name,sub:s.city,occupancy:sum(rs,"occupancy"),capacity:sum(rs,"capacity")}})}/></div>
    <div><h3>Seats in use by department</h3><UsageList rows={uniq(rooms.map(r=>r.department)).map(d=>{const rs=rooms.filter(r=>r.department===d);return {label:d,occupancy:sum(rs,"occupancy"),capacity:sum(rs,"capacity")}}).sort((a,b)=>usage(b)-usage(a))}/></div>
   </div>
  </Section>
  <div className="sv-two">
   <Section title="Nearly full rooms" subtitle="Consider moving people or adding space">
    {busiest.length?<UsageList rows={busiest.map(r=>({label:r.name,sub:`${siteName(r.siteId)} · ${r.floor}`,occupancy:r.occupancy,capacity:r.capacity}))}/>:<p className="workflow-caption">No rooms are nearly full.</p>}
   </Section>
   <Section title="Empty rooms" subtitle="Available now">
    {empty.length?<ul className="sv-plain-list">{empty.map(r=><li key={r.id}><b>{r.name}</b><small>{siteName(r.siteId)} · {r.building} · {r.floor} · {r.capacity} seats</small></li>)}</ul>:<p className="workflow-caption">Every room has someone in it.</p>}
   </Section>
  </div>
  <Section title="Today's room bookings" subtitle={`${plural(today.length,"booking")} between 07:00 and 19:00. The red line is the current time.`}>
   {timelineRooms.length?<div className="sv-timeline">
    <div className="sv-timeline-axis"><span/><div className="sv-timeline-ticks">{Array.from({length:13},(_,i)=><small key={i} style={{left:`${i/12*100}%`}}>{String(7+i).padStart(2,"0")}:00</small>)}</div></div>
    {timelineRooms.map(r=><div className="sv-timeline-row" key={r.id}><span className="sv-timeline-room">{r.name}<small>{siteName(r.siteId)}</small></span><div className="sv-timeline-track">
     {today.filter(b=>b.roomId===r.id).map(b=><span key={b.id} className="sv-timeline-block" style={{left:pct(offset(b.startAt)),width:pct(offset(b.endAt)-offset(b.startAt))}} title={`${b.purpose} · ${b.person} · ${time(b.startAt)}–${time(b.endAt)}`}>{b.purpose}</span>)}
     {nowPos>0&&nowPos<1&&<i className="sv-timeline-now" style={{left:pct(nowPos)}}/>}
    </div></div>)}
   </div>:<div className="working-empty">No bookings today.</div>}
  </Section>
 </>;
}
