import {useEffect,useId,useMemo,useRef,useState} from "react";
import type {Collection,DemoState,RecordItem} from "./demoData";
import {filterValue,relatedLabel,toRow,type QueryFilters} from "./UXQuery";

/** Searchable ID + name picker; safe keyboard fallback, does not require another UI library. */
export function SearchableEntity({data,kind,value,onChange,label,required=false,siteId}: {data:DemoState;kind:Collection;value:string;onChange:(id:string)=>void;label:string;required?:boolean;siteId?:string}){
 const [open,setOpen]=useState(false),[term,setTerm]=useState(""),[active,setActive]=useState(0);
 const wrap=useRef<HTMLDivElement>(null);const listId=useId();
 const choices=useMemo(()=>((data[kind] as RecordItem[]).filter(x=>!toRow(x).archived&&(!siteId||!toRow(x).siteId||toRow(x).siteId===siteId))),[data,kind,siteId]);
 const getLabel=(item:RecordItem)=>`${item.id} · ${String(toRow(item).title??toRow(item).name??toRow(item).company??toRow(item).tag??"")} ${String(toRow(item).location??toRow(item).city??"")}`;
 const filtered=choices.filter(x=>getLabel(x).toLowerCase().includes(term.toLowerCase())).slice(0,80);
 useEffect(()=>{if(active>=filtered.length)setActive(0)},[filtered.length,active]);
 useEffect(()=>{const onOutside=(e:MouseEvent)=>{if(!wrap.current?.contains(e.target as Node))setOpen(false)};document.addEventListener("mousedown",onOutside);return()=>document.removeEventListener("mousedown",onOutside)},[]);
 const selected=choices.find(x=>x.id===value);
 const choose=(id:string)=>{onChange(id);setOpen(false);setTerm("")};
 return <div className="ux-combobox" ref={wrap}>
  <div className="ux-combobox-line"><input role="combobox" aria-label={label} aria-expanded={open} aria-controls={listId} aria-autocomplete="list" required={required} value={open?term:selected?getLabel(selected):value} placeholder={`Search ${label} by ID or name`} onFocus={()=>{setOpen(true);setTerm("")}} onChange={e=>{setTerm(e.target.value);setOpen(true);setActive(0)}} onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);e.stopPropagation()}else if(e.key==="ArrowDown"){e.preventDefault();setOpen(true);setActive(x=>Math.min(x+1,filtered.length-1))}else if(e.key==="ArrowUp"){e.preventDefault();setActive(x=>Math.max(0,x-1))}else if(e.key==="Enter"&&open){e.preventDefault();if(filtered[active])choose(filtered[active].id)}}}/><button type="button" className="ux-clear" aria-label={`Clear ${label}`} onClick={()=>choose("")}>×</button></div>
  {open&&<div id={listId} role="listbox" className="ux-lookup-list">{filtered.map((item,i)=><button type="button" role="option" aria-selected={item.id===value} className={i===active?"active":""} key={item.id} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(item.id)}>{getLabel(item)}</button>)}{!filtered.length&&<p>No matching {label.toLowerCase()} records.</p>}</div>}
 </div>
}
export function MultiFilter({label,values,selected,onChange,data,field}: {label:string;values:string[];selected:string[];onChange:(values:string[])=>void;data?:DemoState;field?:string}){
 const [open,setOpen]=useState(false),[search,setSearch]=useState("");
 const wrap=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const onOutside=(e:MouseEvent)=>{if(!wrap.current?.contains(e.target as Node))setOpen(false)};const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.stopPropagation();setOpen(false)}};document.addEventListener("mousedown",onOutside);window.addEventListener("keydown",onKey,true);return()=>{document.removeEventListener("mousedown",onOutside);window.removeEventListener("keydown",onKey,true)}},[open]);
 const display=(value:string)=>data&&field&&field.endsWith("Id")?relatedLabel(data,field,value).trim():value||"Unassigned";
 const summary=selected.length===0?"All":selected.length===1?display(selected[0]):`${selected.length} selected`;
 return <div className="ux-filter-popup" ref={wrap}><button type="button" aria-label={`${label}: ${summary}`} aria-expanded={open} className={`rv-select ${selected.length?"has-value":""}`} onClick={()=>setOpen(x=>!x)}><span>{summary}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="m6 9 6 6 6-6"/></svg></button>{open&&<div className="ux-filter-list" role="group" aria-label={label}>{values.length>8&&<input aria-label={`Search ${label} options`} className="ux-filter-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find an option"/>}{values.filter(value=>display(value).toLowerCase().includes(search.toLowerCase())).map(value=><label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={e=>onChange(e.target.checked?[...selected,value]:selected.filter(x=>x!==value))}/><span>{display(value)}</span></label>)}{values.length===0&&<p>No options in current data</p>}{selected.length>0&&<button type="button" className="ux-filter-clear" onClick={()=>onChange([])}>Clear selection</button>}</div>}</div>;
}
export function FilterChips({filters,onRemove,labelFor=(f:string)=>f,valueFor=(_f:string,v:string)=>v}: {filters:QueryFilters;onRemove:(field:string,value:string)=>void;labelFor?:(field:string)=>string;valueFor?:(field:string,value:string)=>string}){
 return <div className="ux-active-chips" aria-label="Active filters">{Object.entries(filters).flatMap(([field,choices])=>choices.map(value=><button key={`${field}-${value}`} onClick={()=>onRemove(field,value)} title="Remove filter"><span>{labelFor(field)}:</span> {valueFor(field,value)||"Unassigned"} <b aria-hidden>×</b></button>))}</div>;
}
export function availableFilterValues(data:DemoState,kind:Collection,field:string){return Array.from(new Set((data[kind] as RecordItem[]).filter(x=>!toRow(x).archived).map(x=>filterValue(x,field)).filter(Boolean))).sort();}