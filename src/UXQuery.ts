import type { Collection, DemoState, RecordItem } from "./demoData";

/** Pure query pipeline. All results originate from the shared store (no invented rows). */
export type QueryFilters = Record<string, string[]>;
export const normalizeSearch = (value: unknown): string => String(value ?? "")
  .toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
export const compactSearch = (value: unknown): string => normalizeSearch(value).replaceAll(" ", "");
export const filterFields: Partial<Record<Collection,string[]>> = {
  requests:["status","priority","channel","category","siteId","assetId","requester","slaState"],
  workOrders:["status","priority","type","siteId","assetId","assignee","contractorId","slaState"],
  ppmPlans:["status","recurrence","siteId","assetId","assignee"],
  assets:["status","category","criticality","siteId","manufacturer"],
  parts:["siteId","stockState"],
  rooms:["siteId","building","floor","department","occupancyState"],
  contractors:["status","service","externalTeamsAllowed","b2cPhotosAllowed"],
  contracts:["status","tier","siteId","contractorId","service"],
  applications:["status","applicantType","termsVersion"],
  bookings:["status","roomId"],
  transfers:["status","fromSiteId","toSiteId"],
  purchaseRequests:["status","siteId","partId"],
  sites:["city","status"]
};
export const toRow = (item:RecordItem):Record<string,unknown> => item as unknown as Record<string,unknown>;
export function relatedLabel(data:DemoState, key:string, id:unknown):string {
 const target = ({siteId:"sites",fromSiteId:"sites",toSiteId:"sites",assetId:"assets",roomId:"rooms",contractorId:"contractors",requestId:"requests",linkedWorkOrderId:"workOrders",partId:"parts",ppmId:"ppmPlans",contractId:"contracts"} as Record<string,Collection>)[key];
 if(!target) return String(id??"");
 const item = (data[target] as RecordItem[]).find(x=>x.id===id);
 const row = item ? toRow(item) : null;
 return row ? `${id} ${row.name??row.title??row.tag??row.company??""} ${row.city??row.location??row.sku??""}` : String(id??"");
}
export function searchableText(data:DemoState,kind:Collection,item:RecordItem):string {
 const row = toRow(item);
 const terms = Object.entries(row).flatMap(([k,v]) => {
  if(v===null||v===undefined||Array.isArray(v))return [];
  if(typeof v==="object")return [];
  return [String(v),relatedLabel(data,k,v)];
 });
 // Additional related titles for scenarios where only a foreign ID is stored.
 if(kind==="workOrders" && row.requestId){const req=data.requests.find(x=>x.id===row.requestId);if(req)terms.push(req.title,req.requester);}
 return normalizeSearch(terms.join(" "));
}
export function filterValue(item:RecordItem,field:string):string{
 const row=toRow(item);
 if(field==="stockState") return Number(row.qty)<=Number(row.reorderLevel)?"Low stock":"Available";
 if(field==="occupancyState")return Number(row.occupancy)>=Number(row.capacity)?"Full":"Available";
 if(field==="slaState"){
  const due=String(row.resolutionDueAt??row.dueAt??"");
  if(!due)return "Unscheduled";
  if(["Closed","Resolved","Cancelled"].includes(String(row.status)))return "Completed";
  const delta=Date.parse(due)-Date.now();return delta<0?"Breached":delta<=60*60*1000?"At risk":"On track";
 }
 return String(row[field]??"");
}
export type QueryOptions={text?:string;filters?:QueryFilters;site?:string;includeArchived?:boolean;dueFrom?:string;dueTo?:string;createdFrom?:string;createdTo?:string;overdueOnly?:boolean;unassignedOnly?:boolean;sort?:string;descending?:boolean};
export function queryRecords(data:DemoState,kind:Collection,options:QueryOptions={}):RecordItem[]{
 const {text="",filters={},site="ALL",includeArchived=false,dueFrom="",dueTo="",createdFrom="",createdTo="",overdueOnly=false,unassignedOnly=false,sort="id",descending=true}=options;
 const term=normalizeSearch(text),compact=compactSearch(text);
 const rows = (data[kind] as RecordItem[]).filter(item=>{
  const row=toRow(item);
  if(!includeArchived&&row.archived)return false;
  // Records without siteId are scoped by their related parent, where available.
  const resolvedSite=String((kind==="sites"?item.id:undefined)??row.siteId??(row.roomId?data.rooms.find(x=>x.id===row.roomId)?.siteId:undefined)??(row.partId?data.parts.find(x=>x.id===row.partId)?.siteId:undefined)??"");
  if(site!=="ALL"&&resolvedSite&&resolvedSite!==site)return false;
  const haystack=searchableText(data,kind,item);
  if(term&&!haystack.includes(term)&&!compactSearch(haystack).includes(compact))return false;
  if(Object.entries(filters).some(([field,choices])=>choices.length>0&&!choices.includes(filterValue(item,field))))return false;
  const due=String(row.dueAt??row.resolutionDueAt??row.nextDueAt??row.endAt??row.expiresAt??row.warrantyUntil??row.scheduledAt??"").slice(0,10);
  if((dueFrom||dueTo)&&!due)return false; // Unscheduled never falls back to creation.
  if(dueFrom&&due<dueFrom||dueTo&&due>dueTo)return false;
  const created=String(row.createdAt??row.openedAt??"").slice(0,10);
  if(createdFrom&&(!created||created<createdFrom)||createdTo&&(!created||created>createdTo))return false;
  if(overdueOnly&&!(due&&due<new Date().toISOString().slice(0,10)&&!["Closed","Resolved","Cancelled"].includes(String(row.status))))return false;
  if(unassignedOnly&&Boolean(row.assignee??row.contractorId))return false;
  return true;
 });
 return rows.sort((a,b)=>{
  const aValue=toRow(a)[sort],bValue=toRow(b)[sort];
  const cmp=String(aValue??"").localeCompare(String(bValue??""),undefined,{numeric:true,sensitivity:"base"});
  return (descending?-1:1)*(cmp||a.id.localeCompare(b.id));
 });
}
export function allSearchResults(data:DemoState,text:string,site="ALL") {
 const groups:Collection[]=["requests","workOrders","assets","ppmPlans","sites","rooms","contractors","contracts","parts","purchaseRequests","applications","bookings","transfers"];
 return groups.flatMap(kind=>queryRecords(data,kind,{text,site}).slice(0,6).map(item=>({kind,id:item.id,title:String(toRow(item).title??toRow(item).name??toRow(item).company??toRow(item).tag??item.id),context:relatedLabel(data,"siteId",toRow(item).siteId)})));
}
