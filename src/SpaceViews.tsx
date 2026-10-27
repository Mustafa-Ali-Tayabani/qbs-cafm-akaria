import {useMemo, useState} from "react";
import type {Booking, Room, Store} from "./demoData";

/* Visual space views: hierarchy elevations, 2D/3D floorplans and occupancy charts. Geometry is generated from room records (area m²), not CAD/BIM. */

type Heat = "idle"|"low"|"mid"|"high";
type Rect = {room:Room;x:number;y:number;w:number;h:number;top:boolean};
const PLAN_W=1000,PLAN_H=600,PAD=20,CORRIDOR=70;
const deptPalette=["#356df3","#2fc986","#f59e0b","#a855f7","#ef4444","#14b8a6","#ec4899","#64748b"];

const util=(r:{occupancy:number;capacity:number})=>r.capacity?r.occupancy/r.capacity:0;
const pct=(v:number)=>`${Math.round(v*100)}%`;
const heat=(v:number):Heat=>v<=0?"idle":v<0.5?"low":v<0.85?"mid":"high";
const sum=(rooms:Room[],k:"occupancy"|"capacity"|"areaSqm")=>rooms.reduce((a,r)=>a+(r[k]??0),0);
const totalUtil=(rooms:Room[])=>sum(rooms,"occupancy")/Math.max(1,sum(rooms,"capacity"));
const area=(r:Room)=>Math.max(20,r.areaSqm??60);
function floorRank(f:string){const l=f.toLowerCase();if(l.includes("basement"))return -1;if(l.includes("ground"))return 0;if(l.includes("roof"))return 100;const n=parseInt(l.replace(/\D/g,""),10);return Number.isNaN(n)?50:n}
const byFloor=(a:string,b:string)=>floorRank(a)-floorRank(b);
const uniq=(xs:string[])=>Array.from(new Set(xs));
function deptColor(dept:string,all:string[]){return deptPalette[Math.max(0,all.indexOf(dept))%deptPalette.length]}
const time=(v:string)=>new Date(v).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});

/** Splits a floor's rooms into two rows either side of a corridor, with widths proportional to area. */
function layoutFloor(rooms:Room[]):Rect[]{
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

function Legend({mode,departments}:{mode:"util"|"dept";departments?:string[]}){
 if(mode==="dept")return <div className="sv-legend">{departments?.map(d=><span key={d}><i style={{background:deptColor(d,departments)}}/>{d}</span>)}</div>;
 return <div className="sv-legend">{([["idle","Empty"],["low","Under 50%"],["mid","50–85%"],["high","Over 85%"]] as [Heat,string][]).map(([k,l])=><span key={k}><i className={`sv-heat-${k}`}/>{l}</span>)}</div>;
}

function UtilBar({value}:{value:number}){return <span className="sv-bar"><span className={`sv-heat-${heat(value)}`} style={{width:pct(Math.min(1,value))}}/></span>}

function Section({title,subtitle,actions,children}:{title:string;subtitle?:string;actions?:React.ReactNode;children:React.ReactNode}){
 return <section className="register flow-panel sv-panel"><div className="sv-head"><div><h2>{title}</h2>{subtitle&&<p className="workflow-caption">{subtitle}</p>}</div>{actions}</div>{children}</section>;
}

function Segmented<T extends string>({value,options,onChange,label}:{value:T;options:[T,string][];onChange:(v:T)=>void;label:string}){
 return <div className="sv-segmented" role="group" aria-label={label}>{options.map(([v,l])=><button type="button" key={v} className={value===v?"active":""} aria-pressed={value===v} onClick={()=>onChange(v)}>{l}</button>)}</div>;
}

function RoomDetail({room,bookings,siteName}:{room?:Room;bookings:Booking[];siteName:string}){
 if(!room)return <div className="sv-detail"><p className="workflow-caption">Select a room on the plan to see its details and bookings.</p></div>;
 const own=bookings.filter(b=>b.roomId===room.id&&!b.archived).sort((a,b)=>a.startAt.localeCompare(b.startAt));
 return <div className="sv-detail">
  <small>{room.id}</small><h3>{room.name}</h3>
  <p className="workflow-caption">{siteName} › {room.building} › {room.floor}</p>
  <dl><div><dt>Department</dt><dd>{room.department}</dd></div><div><dt>Area</dt><dd>{room.areaSqm??"—"} m²</dd></div><div><dt>Occupancy</dt><dd>{room.occupancy} / {room.capacity}</dd></div><div><dt>Utilization</dt><dd>{pct(util(room))}</dd></div></dl>
  <UtilBar value={util(room)}/>
  <h4>Bookings</h4>
  {own.length?<ul>{own.map(b=><li key={b.id}><b>{time(b.startAt)}–{time(b.endAt)}</b> {b.purpose}<small>{b.person} · {new Date(b.startAt).toLocaleDateString()}</small></li>)}</ul>:<p className="workflow-caption">No bookings for this room.</p>}
 </div>;
}

/** F01–F04 site → building → floor → room drilldown drawn as building elevations. */
export function SpaceHierarchyView({store,site}:{store:Store;site:string}){
 const {sites,rooms}=useSpaceScope(store,site);
 const [picked,setPicked]=useState<{site?:string;building?:string;floor?:string}>({});
 const siteId=sites.some(s=>s.id===picked.site)?picked.site!:sites[0]?.id;
 const siteRooms=rooms.filter(r=>r.siteId===siteId);
 const buildings=uniq(siteRooms.map(r=>r.building));
 const building=buildings.includes(picked.building??"")?picked.building!:buildings[0];
 const floors=uniq(siteRooms.filter(r=>r.building===building).map(r=>r.floor)).sort(byFloor);
 const floor=floors.includes(picked.floor??"")?picked.floor!:floors[0];
 const visible=siteRooms.filter(r=>r.building===building&&r.floor===floor);
 const siteName=sites.find(s=>s.id===siteId)?.name??"";
 return <Section title="Site → building → floor → room" subtitle="BR-SP-01 · click a site, then a floor in a building elevation to drill down" actions={<Legend mode="util"/>}>
  <div className="sv-site-cards">{sites.map(s=>{const rs=rooms.filter(r=>r.siteId===s.id),u=totalUtil(rs);return <button type="button" key={s.id} className={s.id===siteId?"active":""} onClick={()=>setPicked({site:s.id})}>
   <small>{s.city}</small><strong>{s.name}</strong>
   <span>{uniq(rs.map(r=>r.building)).length} bldg · {uniq(rs.map(r=>`${r.building}/${r.floor}`)).length} floors · {rs.length} rooms</span>
   <UtilBar value={u}/><em>{pct(u)} utilized</em></button>})}</div>
  <div className="sv-elevations">{buildings.map(b=>{const bRooms=siteRooms.filter(r=>r.building===b);return <div className="sv-building" key={b}>
   <div className="sv-building-roof"><strong>{b}</strong><small>{sum(bRooms,"areaSqm").toLocaleString()} m² · {pct(totalUtil(bRooms))}</small></div>
   {uniq(bRooms.map(r=>r.floor)).sort(byFloor).reverse().map(f=>{const fRooms=bRooms.filter(r=>r.floor===f),active=b===building&&f===floor;return <button type="button" key={f} className={`sv-floor-row${active?" active":""}`} onClick={()=>setPicked({site:siteId,building:b,floor:f})} aria-pressed={active}>
    <span className="sv-floor-label">{f}</span>
    <span className="sv-floor-rooms">{fRooms.map(r=><span key={r.id} className={`sv-heat-${heat(util(r))}`} style={{flexGrow:area(r)}} title={`${r.name} · ${r.occupancy}/${r.capacity} · ${r.areaSqm??"—"} m²`}/>)}</span>
   </button>})}
   <div className="sv-building-ground"/>
  </div>})}
  {!buildings.length&&<div className="working-empty">No rooms registered at this site. Create them in the Rooms register.</div>}</div>
  {floor&&<><div className="sv-crumbs"><span>{siteName}</span>›<span>{building}</span>›<b>{floor}</b><small>{visible.length} rooms · {sum(visible,"areaSqm").toLocaleString()} m²</small></div>
  <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Room ID</th><th>Name</th><th>Department</th><th>Area</th><th>Occupancy / capacity</th><th>Utilization</th></tr></thead><tbody>{visible.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.name}</td><td>{r.department}</td><td>{r.areaSqm??"—"} m²</td><td>{r.occupancy} / {r.capacity}</td><td><div className="sv-util-cell"><UtilBar value={util(r)}/>{pct(util(r))}</div></td></tr>)}</tbody></table></div></>}
 </Section>;
}

function Plan2D({rects,selected,onSelect,color}:{rects:Rect[];selected?:string;onSelect:(id:string)=>void;color:(r:Room)=>{fill?:string;cls?:string}}){
 return <svg className="sv-plan" viewBox={`0 0 ${PLAN_W} ${PLAN_H}`} role="img" aria-label="Generated floor plan">
  <defs><pattern id="sv-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#e7ecf4" strokeWidth="1"/></pattern></defs>
  <rect width={PLAN_W} height={PLAN_H} fill="url(#sv-grid)"/>
  <rect x={PAD} y={PAD} width={PLAN_W-PAD*2} height={PLAN_H-PAD*2} className="sv-plan-shell"/>
  <rect x={PAD} y={(PLAN_H-CORRIDOR)/2} width={PLAN_W-PAD*2} height={CORRIDOR} className="sv-plan-corridor"/>
  <text x={PLAN_W/2} y={PLAN_H/2+5} textAnchor="middle" className="sv-plan-corridor-label">CORRIDOR</text>
  {rects.map(({room,x,y,w,h,top})=>{const c=color(room),doorX=x+Math.min(w*0.5,w-30),doorY=top?y+h:y,small=w<110;return <g key={room.id} className={`sv-plan-room${selected===room.id?" selected":""}`} onClick={()=>onSelect(room.id)} tabIndex={0} role="button" aria-label={`${room.name}, ${pct(util(room))} utilized`} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")onSelect(room.id)}}>
   <rect x={x} y={y} width={w} height={h} className={c.cls} style={c.fill?{fill:c.fill,fillOpacity:0.28}:undefined}/>
   <line x1={doorX} x2={doorX+24} y1={doorY} y2={doorY} className="sv-plan-door"/>
   <path d={top?`M${doorX} ${doorY} A24 24 0 0 0 ${doorX+24} ${doorY-24}`:`M${doorX} ${doorY} A24 24 0 0 1 ${doorX+24} ${doorY+24}`} className="sv-plan-swing"/>
   <text x={x+w/2} y={y+h/2-(small?4:12)} textAnchor="middle" className="sv-plan-name" style={{fontSize:small?11:15}}>{small&&room.name.length>12?`${room.name.slice(0,11)}…`:room.name}</text>
   {!small&&<text x={x+w/2} y={y+h/2+10} textAnchor="middle" className="sv-plan-meta">{room.areaSqm??"—"} m² · {room.occupancy}/{room.capacity}</text>}
   <text x={x+w/2} y={y+h/2+(small?12:30)} textAnchor="middle" className="sv-plan-pct">{pct(util(room))}</text>
  </g>})}
  <g transform={`translate(${PLAN_W-52} 52)`} className="sv-plan-compass"><circle r="18"/><path d="M0 -13 L5 3 L0 0 L-5 3Z"/><text y="-22" textAnchor="middle">N</text></g>
 </svg>;
}

function Stack3D({floors,roomsByFloor,current,selected,onFloor,onSelect,color,rotation,tilt}:{floors:string[];roomsByFloor:Record<string,Room[]>;current:string;selected?:string;onFloor:(f:string)=>void;onSelect:(id:string)=>void;color:(r:Room)=>{fill?:string;cls?:string};rotation:number;tilt:number}){
 const gap=Math.max(45,Math.min(80,300/Math.max(1,floors.length)));
 return <div className="sv-stage" style={{height:Math.max(420,floors.length*gap+340)}}>
  <div className="sv-stack" style={{transform:`rotateX(${tilt}deg) rotateZ(${rotation}deg) translateZ(${-(floors.length-1)*gap/2}px)`}}>
   {floors.map((f,i)=>{const active=f===current;return <div key={f} className={`sv-plane${active?" active":""}`} style={{transform:`translateZ(${i*gap}px)`}} onClick={()=>onFloor(f)}>
    <span className="sv-plane-label">{f}</span>
    {layoutFloor(roomsByFloor[f]??[]).map(({room,x,y,w,h})=>{const c=color(room);return <button type="button" key={room.id} className={`sv-tile ${c.cls??""}${selected===room.id?" selected":""}`} title={`${room.name} · ${pct(util(room))}`} style={{left:`${x/PLAN_W*100}%`,top:`${y/PLAN_H*100}%`,width:`${w/PLAN_W*100}%`,height:`${h/PLAN_H*100}%`,...(c.fill?{background:c.fill}:{})}} onClick={e=>{e.stopPropagation();onFloor(f);onSelect(room.id)}}>{active&&w>90?<span>{room.name}</span>:null}</button>})}
   </div>})}
  </div>
 </div>;
}

/** Generated 2D plan and 3D stacked view per building, coloured by utilization or department. */
export function FloorplanView({store,site}:{store:Store;site:string}){
 const {sites,rooms}=useSpaceScope(store,site);
 const [siteSel,setSiteSel]=useState(""),[buildingSel,setBuildingSel]=useState(""),[floorSel,setFloorSel]=useState(""),[selected,setSelected]=useState<string>();
 const [mode,setMode]=useState<"2d"|"3d">("2d"),[colorBy,setColorBy]=useState<"util"|"dept">("util"),[rotation,setRotation]=useState(-38),[tilt,setTilt]=useState(58);
 const siteId=sites.some(s=>s.id===siteSel)?siteSel:sites[0]?.id;
 const siteRooms=rooms.filter(r=>r.siteId===siteId);
 const buildings=uniq(siteRooms.map(r=>r.building));
 const building=buildings.includes(buildingSel)?buildingSel:buildings[0];
 const bRooms=siteRooms.filter(r=>r.building===building);
 const floors=uniq(bRooms.map(r=>r.floor)).sort(byFloor);
 const floor=floors.includes(floorSel)?floorSel:floors[0];
 const roomsByFloor=useMemo(()=>Object.fromEntries(floors.map(f=>[f,bRooms.filter(r=>r.floor===f)])),[bRooms,floors]);
 const departments=useMemo(()=>uniq(rooms.map(r=>r.department)).sort(),[rooms]);
 const color=(r:Room)=>colorBy==="dept"?{fill:deptColor(r.department,departments),cls:"sv-dept"}:{cls:`sv-heat-${heat(util(r))}`};
 const floorRooms=roomsByFloor[floor]??[];
 const selectedRoom=bRooms.find(r=>r.id===selected);
 return <Section title="Floorplan" subtitle="Generated from room records (area m²) · CAD/BIM not connected" actions={<div className="sv-toolbar"><Segmented label="View" value={mode} onChange={setMode} options={[["2d","2D plan"],["3d","3D stack"]]}/><Segmented label="Colour by" value={colorBy} onChange={setColorBy} options={[["util","Utilization"],["dept","Department"]]}/></div>}>
  <div className="brd-hierarchy-controls">
   <label>Site<select value={siteId??""} onChange={e=>{setSiteSel(e.target.value);setBuildingSel("");setFloorSel("");setSelected(undefined)}}>{sites.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
   <label>Building<select value={building??""} onChange={e=>{setBuildingSel(e.target.value);setFloorSel("");setSelected(undefined)}}>{buildings.map(b=><option key={b}>{b}</option>)}</select></label>
   <label>Floor<select value={floor??""} onChange={e=>{setFloorSel(e.target.value);setSelected(undefined)}}>{floors.map(f=><option key={f}>{f}</option>)}</select></label>
  </div>
  {!floorRooms.length?<div className="working-empty">No rooms registered here. Create them in the Rooms register.</div>:<div className="sv-plan-layout">
   <div className="sv-plan-wrap">
    <div className="sv-floor-stats"><span><b>{floorRooms.length}</b> rooms</span><span><b>{sum(floorRooms,"areaSqm").toLocaleString()}</b> m²</span><span><b>{sum(floorRooms,"occupancy")}</b> / {sum(floorRooms,"capacity")} people</span><span><b>{pct(totalUtil(floorRooms))}</b> utilized</span></div>
    {mode==="2d"?<Plan2D rects={layoutFloor(floorRooms)} selected={selected} onSelect={setSelected} color={color}/>:<>
     <Stack3D floors={floors} roomsByFloor={roomsByFloor} current={floor} selected={selected} onFloor={f=>{setFloorSel(f)}} onSelect={setSelected} color={color} rotation={rotation} tilt={tilt}/>
     <div className="sv-orbit"><label>Rotate<input type="range" min={-180} max={180} value={rotation} onChange={e=>setRotation(Number(e.target.value))}/></label><label>Tilt<input type="range" min={20} max={75} value={tilt} onChange={e=>setTilt(Number(e.target.value))}/></label><button type="button" onClick={()=>{setRotation(-38);setTilt(58)}}>Reset view</button></div>
    </>}
    <Legend mode={colorBy} departments={uniq(bRooms.map(r=>r.department)).sort()}/>
   </div>
   <RoomDetail room={selectedRoom} bookings={store.data.bookings} siteName={sites.find(s=>s.id===siteId)?.name??""}/>
  </div>}
 </Section>;
}

function BarList({rows}:{rows:{label:string;occupancy:number;capacity:number;sub?:string}[]}){
 return <div className="sv-barlist">{rows.map(r=><div key={r.label}><span className="sv-barlist-label">{r.label}{r.sub&&<small>{r.sub}</small>}</span><span className="sv-barlist-track"><span className={`sv-heat-${heat(util(r))}`} style={{width:pct(Math.min(1,util(r)))}}/></span><b>{pct(util(r))}</b><small>{r.occupancy}/{r.capacity}</small></div>)}</div>;
}

/** Live utilization charts, room heatmap and today's booking timeline. */
export function OccupancyView({store,site}:{store:Store;site:string}){
 const {sites,rooms}=useSpaceScope(store,site);
 const [hover,setHover]=useState<string>();
 const departments=uniq(rooms.map(r=>r.department)).sort();
 const roomIds=new Set(rooms.map(r=>r.id));
 const start=new Date();start.setHours(7,0,0,0);const end=new Date(start);end.setHours(19);
 const span=end.getTime()-start.getTime();
 const today=store.data.bookings.filter(b=>!b.archived&&roomIds.has(b.roomId)&&Date.parse(b.endAt)>start.getTime()&&Date.parse(b.startAt)<end.getTime());
 const timelineRooms=rooms.filter(r=>today.some(b=>b.roomId===r.id)||/meeting|board|training/i.test(r.name));
 const nowPos=(Date.now()-start.getTime())/span;
 const offset=(v:string)=>Math.max(0,Math.min(1,(Date.parse(v)-start.getTime())/span));
 const hovered=rooms.find(r=>r.id===hover);
 return <>
  <Section title="Space utilization · live records" subtitle="Calculated from current room occupancy and capacity" actions={<Legend mode="util"/>}>
   <div className="sv-kpis">
    <div><small>Rooms</small><strong>{rooms.length}</strong><span>{sum(rooms,"areaSqm").toLocaleString()} m² total</span></div>
    <div><small>Occupants</small><strong>{sum(rooms,"occupancy")}</strong><span>of {sum(rooms,"capacity")} seats</span></div>
    <div><small>Utilization</small><strong>{pct(totalUtil(rooms))}</strong><UtilBar value={totalUtil(rooms)}/></div>
    <div><small>Rooms over 85%</small><strong>{rooms.filter(r=>util(r)>=0.85).length}</strong><span>{rooms.filter(r=>r.occupancy===0).length} empty</span></div>
   </div>
   <div className="sv-chart-grid">
    <div><h3>By site</h3><BarList rows={sites.map(s=>{const rs=rooms.filter(r=>r.siteId===s.id);return {label:s.name,sub:s.city,occupancy:sum(rs,"occupancy"),capacity:sum(rs,"capacity")}})}/></div>
    <div><h3>By department</h3><BarList rows={departments.map(d=>{const rs=rooms.filter(r=>r.department===d);return {label:d,occupancy:sum(rs,"occupancy"),capacity:sum(rs,"capacity")}}).sort((a,b)=>util(b)-util(a))}/></div>
   </div>
  </Section>
  <Section title="Room heatmap" subtitle="Each tile is a room; hover or focus for details">
   <div className="sv-heatmap">{sites.map(s=>{const rs=rooms.filter(r=>r.siteId===s.id).sort((a,b)=>a.building.localeCompare(b.building)||byFloor(a.floor,b.floor));return rs.length?<div key={s.id}><h4>{s.name}</h4><div className="sv-heat-tiles">{rs.map(r=><button type="button" key={r.id} className={`sv-heat-${heat(util(r))}${hover===r.id?" selected":""}`} onMouseEnter={()=>setHover(r.id)} onFocus={()=>setHover(r.id)} aria-label={`${r.name} ${pct(util(r))}`}>{Math.round(util(r)*100)}</button>)}</div></div>:null})}</div>
   <p className="sv-heat-hover">{hovered?<><b>{hovered.name}</b> · {hovered.building} › {hovered.floor} · {hovered.department} · {hovered.occupancy}/{hovered.capacity} ({pct(util(hovered))})</>:"Hover a tile to inspect a room."}</p>
  </Section>
  <Section title="Today's bookings" subtitle={`${today.length} confirmed bookings between 07:00 and 19:00`}>
   <div className="sv-timeline">
    <div className="sv-timeline-axis"><span/><div className="sv-timeline-ticks">{Array.from({length:13},(_,i)=><small key={i} style={{left:`${i/12*100}%`}}>{String(7+i).padStart(2,"0")}</small>)}</div></div>
    {timelineRooms.map(r=><div className="sv-timeline-row" key={r.id}><span className="sv-timeline-room">{r.name}<small>{sites.find(s=>s.id===r.siteId)?.name}</small></span><div className="sv-timeline-track">
     {today.filter(b=>b.roomId===r.id).map(b=><span key={b.id} className="sv-timeline-block" style={{left:pct(offset(b.startAt)),width:pct(offset(b.endAt)-offset(b.startAt))}} title={`${b.purpose} · ${b.person} · ${time(b.startAt)}–${time(b.endAt)}`}>{b.purpose}</span>)}
     {nowPos>0&&nowPos<1&&<i className="sv-timeline-now" style={{left:pct(nowPos)}}/>}
    </div></div>)}
    {!timelineRooms.length&&<div className="working-empty">No bookable rooms in scope.</div>}
   </div>
  </Section>
 </>;
}
