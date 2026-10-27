import { useEffect, useRef, useState } from "react";

export type TimelineEvent = { id: string; label: string; actor: string; at: string };
export type Site = { id: string; name: string; city: string; status?: string };
export type Asset = { installDate?:string;acquisitionValue?:number;expectedLifeYears?:number;roomId?:string; id: string; tag: string; title: string; category: string; siteId: string; location: string; manufacturer: string; model: string; serial: string; warrantyUntil: string; status: string; criticality: string; lifetimeCost: number; archived?: boolean };
export type ServiceRequest = { confirmedAt?:string; rating?:number; feedback?:string; classificationSource?:string; id: string; title: string; description: string; channel: string; requester: string; siteId: string; assetId?: string; category: string; priority: string; status: string; createdAt: string; linkedWorkOrderId?: string; dueAt?: string; archived?: boolean; timeline: TimelineEvent[] };
export type WorkPhoto = { id:string; name:string; stage:"Before"|"After"|"Evidence"; at:string; thumb:string };
export type WorkOrder = { partsReviewed?:boolean; travelStartedAt?:string; arrivedAt?:string; acceptedAt?:string; startedAt?:string; diagnosis?:string; signedBy?:string; photos?:WorkPhoto[]; assetVerifiedAt?:string; notes?:string; assignmentReason?:string; scheduledAt?:string; id: string; requestId?: string; ppmId?: string; occurrenceAt?: string; title: string; type: string; assetId?: string; siteId: string; contractorId?: string; priority: string; status: string; assignee?: string; openedAt: string; responseDueAt: string; resolutionDueAt: string; firstResponseAt?: string; resolvedAt?: string; materialCost: number; checklistDone?: boolean; signedOff?: boolean; evidence?: string[]; checklistResults?: Record<string,boolean>; archived?: boolean; timeline: TimelineEvent[] };
export type PpmPlan = { id: string; title: string; assetId: string; siteId: string; recurrence: string; nextDueAt: string; status: string; description?: string; assignee?: string; checklist?: string; archived?: boolean; createdAt?: string; lastGeneratedAt?: string };
export type Part = { id: string; name: string; siteId: string; sku?: string; qty: number; reorderLevel: number; unitCost: number; archived?: boolean };
export type Contractor = { timeline?:TimelineEvent[]; contactName?:string; phone?:string; email?:string; registration?:string; sites?:string[]; slaTier?:string; id: string; name: string; service: string; status: string; contractId: string; expiresAt: string; externalTeamsAllowed?: boolean; b2cPhotosAllowed?: boolean; archived?: boolean };
export type Room = { areaSqm?:number; id: string; name: string; siteId: string; building: string; floor: string; department: string; occupancy: number; capacity: number; archived?: boolean };
export type Application = { id: string; applicantType: "Partner" | "Sub-Contractor"; company: string; registration: string; email: string; phone: string; vat: string; address: string; address2: string; country: string; region: string; city: string; zip: string; bank: string; account: string; iban: string; swift: string; files: {name:string;size:number;type:string}[]; termsVersion:string; acceptedAt:string; status:string; createdAt:string; reviewerNote?:string; contractorId?:string; timeline:TimelineEvent[]; archived?: boolean };
export type TermsVersion = { id:string; version:number; content:string; status:"Draft"|"Published"; publishedAt?:string; createdAt:string };
export type SlaRule = { id:string; priority:string; responseMinutes:number; resolutionMinutes:number; contractorId?:string; version:number; effectiveAt:string; archived?:boolean };
export type StockMovement = { id:string; partId:string; workOrderId?:string; direction:"Receipt"|"Issue"|"Return"; qty:number; unitCost:number; createdAt:string };
export type Booking = { id:string; roomId:string; person:string; startAt:string; endAt:string; purpose:string; status:string; createdAt:string; archived?:boolean };
export type Contract = {id:string; title:string; contractorId:string; siteId:string; service:string; startAt:string; endAt:string; value:number; penaltyPercent:number; tier:string; status:string; legacyRef?:string; archived?:boolean};
export type PurchaseRequest = {id:string;partId:string;siteId:string;quantity:number;status:string;createdAt:string;requestedBy:string;workOrderId?:string;archived?:boolean};
export type DemoNotification = {id:string; recordType:"requests"|"workOrders";recordId:string;message:string;createdAt:string;readAt?:string};
export type Transfer = {id:string; assetId:string; fromSiteId:string; toSiteId:string; toLocation:string; status:string; createdAt:string; timeline:TimelineEvent[]; archived?:boolean};
export type DemoState = {
 sites:Site[]; assets:Asset[]; requests:ServiceRequest[]; workOrders:WorkOrder[]; ppmPlans:PpmPlan[]; parts:Part[]; contractors:Contractor[]; rooms:Room[];
 applications:Application[]; terms:TermsVersion[]; slaRules:SlaRule[]; movements:StockMovement[]; bookings:Booking[]; transfers:Transfer[]; contracts:Contract[]; purchaseRequests:PurchaseRequest[]; notifications:DemoNotification[];
 sequences:Record<string,number>;
};
const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const ahead = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
const event = (id: string, label: string, actor: string, at: string): TimelineEvent => ({ id, label, actor, at });

// [id, name, site, building, floor, department, occupancy, capacity, area m²]
const roomSeed:[string,string,string,string,string,string,number,number,number][]=[
  ["ROOM-OL-B1-PRK","Parking & Loading","SITE-OL","Tower A","Basement","Facilities",6,40,820],
  ["ROOM-OL-B1-PLT","Chiller Plant","SITE-OL","Tower A","Basement","Facilities",2,4,260],
  ["ROOM-OL-B1-STR","Central Store","SITE-OL","Tower A","Basement","Operations",1,3,140],
  ["ROOM-OL-G-LOB","Main Lobby","SITE-OL","Tower A","Ground","Front of House",18,60,420],
  ["ROOM-OL-G-REC","Reception","SITE-OL","Tower A","Ground","Front of House",3,4,60],
  ["ROOM-OL-G-SEC","Security Control","SITE-OL","Tower A","Ground","Security",3,4,55],
  ["ROOM-OL-G-CAF","Cafeteria","SITE-OL","Tower A","Ground","Hospitality",46,80,310],
  ["ROOM-OL-1-OPN","Open Office East","SITE-OL","Tower A","Level 1","Finance",52,64,540],
  ["ROOM-OL-1-MR1","Meeting Room Najd","SITE-OL","Tower A","Level 1","Shared",6,8,38],
  ["ROOM-OL-1-MR2","Meeting Room Hijaz","SITE-OL","Tower A","Level 1","Shared",0,12,52],
  ["ROOM-OL-1-PAN","Pantry L1","SITE-OL","Tower A","Level 1","Hospitality",4,10,30],
  ["ROOM-OL-2-OPN","Open Office West","SITE-OL","Tower A","Level 2","Technology",38,60,500],
  ["ROOM-OL-2-SRV","Server Room","SITE-OL","Tower A","Level 2","Technology",1,2,70],
  ["ROOM-OL-2-TRN","Training Room","SITE-OL","Tower A","Level 2","HR",22,24,110],
  ["ROOM-OL-2-FOC","Focus Pods","SITE-OL","Tower A","Level 2","Shared",3,8,45],
  ["ROOM-OL-3-EXE","Executive Suite","SITE-OL","Tower A","Level 3","Executive",5,8,240],
  ["ROOM-OL-3-BRD","Boardroom","SITE-OL","Tower A","Level 3","Executive",14,16,95],
  ["ROOM-OL-3-LNG","Executive Lounge","SITE-OL","Tower A","Level 3","Executive",2,12,120],
  ["ROOM-OL-R-LFT","Lift Motor Room","SITE-OL","Tower A","Roof","Facilities",0,2,65],
  ["ROOM-OL-R-AHU","AHU Plant Deck","SITE-OL","Tower A","Roof","Facilities",1,4,180],
  ["ROOM-NR-G-WRK","Maintenance Workshop","SITE-NR","Building A","Ground","Facilities",7,10,230],
  ["ROOM-NR-G-STR","Spare Parts Store","SITE-NR","Building A","Ground","Operations",2,4,150],
  ["ROOM-NR-G-ELC","Electrical Room","SITE-NR","Building A","Ground","Facilities",0,2,60],
  ["ROOM-NR-1-OPS","Operations Centre","SITE-NR","Building A","Level 1","Operations",12,14,210],
  ["ROOM-NR-1-MR1","Meeting Room Tuwaiq","SITE-NR","Building A","Level 1","Shared",8,10,42],
  ["ROOM-NR-1-OFF","Supervisor Offices","SITE-NR","Building A","Level 1","Operations",4,6,90],
  ["ROOM-NR-MECH","Mechanical Room","SITE-NR","Building A","Roof","Facilities",2,4,140],
  ["ROOM-NR-R-WTR","Water Tank Deck","SITE-NR","Building A","Roof","Facilities",0,2,95],
  ["ROOM-NR-B-WH","Warehouse Bay","SITE-NR","Building B","Ground","Logistics",9,20,680],
  ["ROOM-NR-B-DCK","Loading Dock","SITE-NR","Building B","Ground","Logistics",4,8,210],
  ["ROOM-NR-B-OFF","Logistics Office","SITE-NR","Building B","Level 1","Logistics",6,8,120],
  ["ROOM-NR-B-BRK","Staff Break Room","SITE-NR","Building B","Level 1","Hospitality",3,16,80],
  ["ROOM-JED-G-LOB","Lobby","SITE-JED","Jeddah HQ","Ground","Front of House",9,40,300],
  ["ROOM-JED-G-CUS","Customer Service Hall","SITE-JED","Jeddah HQ","Ground","Customer Care",21,30,260],
  ["ROOM-JED-G-PRY","Prayer Room","SITE-JED","Jeddah HQ","Ground","Shared",4,20,70],
  ["ROOM-JED-1-OPN","Open Office","SITE-JED","Jeddah HQ","Level 1","Sales",33,48,430],
  ["ROOM-JED-1-MR1","Meeting Room Red Sea","SITE-JED","Jeddah HQ","Level 1","Shared",10,10,48],
  ["ROOM-JED-1-MR2","Meeting Room Corniche","SITE-JED","Jeddah HQ","Level 1","Shared",2,6,30],
  ["ROOM-JED-L2","Service Corridor","SITE-JED","Jeddah HQ","Level 2","Operations",4,8,120],
  ["ROOM-JED-2-IT","IT Hub","SITE-JED","Jeddah HQ","Level 2","Technology",11,16,180],
  ["ROOM-JED-2-ARC","Records Archive","SITE-JED","Jeddah HQ","Level 2","Legal",1,4,140],
  ["ROOM-DAM-G-REC","Reception","SITE-DAM","Main Block","Ground","Front of House",2,6,80],
  ["ROOM-DAM-G-WRK","Field Team Base","SITE-DAM","Main Block","Ground","Operations",14,18,240],
  ["ROOM-DAM-G-PLT","Plant Room","SITE-DAM","Main Block","Ground","Facilities",1,3,110],
  ["ROOM-DAM-1-OPN","Regional Office","SITE-DAM","Main Block","Level 1","Operations",17,30,320],
  ["ROOM-DAM-1-MR1","Meeting Room Gulf","SITE-DAM","Main Block","Level 1","Shared",0,8,36],
  ["ROOM-DAM-1-MGR","Manager Office","SITE-DAM","Main Block","Level 1","Operations",1,2,28],
];
function bookingSeed():Booking[] {
  const at=(day:number,hour:number)=>{const d=new Date();d.setDate(d.getDate()+day);d.setHours(hour,0,0,0);return d.toISOString()};
  const rows:[string,string,number,number,number,string][]=[
    ["ROOM-OL-1-MR1","Noura Al-Harbi",0,9,11,"Quarterly budget review"],["ROOM-OL-1-MR1","Fahad Al-Salem",0,13,14,"Contractor SLA check-in"],
    ["ROOM-OL-1-MR2","Sara Al-Qahtani",0,10,12,"Vendor onboarding"],["ROOM-OL-3-BRD","Executive Office",0,8,10,"Board meeting"],
    ["ROOM-OL-3-BRD","Executive Office",0,15,17,"Strategy workshop"],["ROOM-OL-2-TRN","HR Team",0,9,16,"Fire safety training"],
    ["ROOM-NR-1-MR1","Faisal Al-Otaibi",0,11,12,"HVAC PPM planning"],["ROOM-JED-1-MR1","Sales Team",0,8,9,"Daily stand-up"],
    ["ROOM-JED-1-MR1","Omar Bakr",0,14,16,"Client presentation"],["ROOM-JED-1-MR2","Lina Haddad",0,12,13,"Interview"],
    ["ROOM-DAM-1-MR1","Regional Ops",1,10,12,"Weekly ops review"],["ROOM-OL-1-MR2","Finance Team",1,9,10,"Month-end close"],
  ];
  return rows.map(([roomId,person,day,from,to,purpose],i)=>({id:`BOOK-${String(i+1).padStart(6,"0")}`,roomId,person,startAt:at(day,from),endAt:at(day,to),purpose,status:"Confirmed",createdAt:ago(48)}));
}

export function createSeed(): DemoState {
  return {
    sequences: {},
    applications: [], movements: [], bookings: bookingSeed(), transfers: [], purchaseRequests: [], notifications: [],
    contracts: [
      {id:"CON-000014",title:"Elevator maintenance coverage",contractorId:"CTR-014",siteId:"SITE-OL",service:"Elevators",startAt:"2026-01-01",endAt:"2026-11-04",value:120000,penaltyPercent:1,tier:"Standard",status:"Active",legacyRef:"CN-2026-04"},
      {id:"CON-000018",title:"HVAC service coverage",contractorId:"CTR-019",siteId:"SITE-NR",service:"HVAC",startAt:"2026-01-01",endAt:"2027-05-01",value:210000,penaltyPercent:0.5,tier:"Priority",status:"Active",legacyRef:"CN-2027-02"},
    ],
    terms: [{id:"TNC-000001", version:1, content:"# AKARIA Service Level Agreement (draft for demo)\n\n## 1. Response and resolution\n- Emergency: respond within 30 minutes, resolve within 4 hours.\n- High: respond within 2 hours, resolve within 7 hours.\n- Medium and Low: per the published SLA rules for each priority.\n\n## 2. Partner obligations\n- Provide accurate company, banking and insurance information.\n- Keep technicians certified for the trades you are approved for.\n- Record arrival, work notes and completion evidence on every work order.\n\n## 3. Measurement and penalties\n- SLA compliance is measured from work-order timestamps.\n- Breaches may lead to deductions as set out in the signed contract.\n\n## 4. Review\n- Applications are reviewed by the AKARIA FM team before the SLA becomes active.\n\nDemo note: final SLA terms require AKARIA approval; documents are not uploaded to a server.", status:"Published", createdAt: ago(24), publishedAt: ago(24)}],
    slaRules: [
      {id:"SLA-000001",priority:"Emergency",responseMinutes:90,resolutionMinutes:240,version:1,effectiveAt:ago(24)},
      {id:"SLA-000002",priority:"High",responseMinutes:120,resolutionMinutes:420,version:1,effectiveAt:ago(24)},
      {id:"SLA-000003",priority:"Medium",responseMinutes:240,resolutionMinutes:1440,version:1,effectiveAt:ago(24)},
      {id:"SLA-000004",priority:"Low",responseMinutes:480,resolutionMinutes:4320,version:1,effectiveAt:ago(24)},
      {id:"SLA-000011",priority:"Emergency",responseMinutes:60,resolutionMinutes:180,contractorId:"CTR-019",version:1,effectiveAt:ago(24*30)},
      {id:"SLA-000012",priority:"High",responseMinutes:90,resolutionMinutes:315,contractorId:"CTR-019",version:1,effectiveAt:ago(24*30)},
      {id:"SLA-000013",priority:"Medium",responseMinutes:180,resolutionMinutes:1080,contractorId:"CTR-019",version:1,effectiveAt:ago(24*30)},
      {id:"SLA-000014",priority:"Low",responseMinutes:360,resolutionMinutes:3240,contractorId:"CTR-019",version:1,effectiveAt:ago(24*30)}],
    sites: [
      { id: "SITE-OL", name: "Olaya Tower", city: "Riyadh" }, { id: "SITE-NR", name: "North Riyadh", city: "Riyadh" },
      { id: "SITE-JED", name: "Jeddah HQ", city: "Jeddah" }, { id: "SITE-DAM", name: "Dammam Office", city: "Dammam" },
    ],
    assets: [
      { id: "AST-AHU-04", tag: "AHU-04", title: "Air Handling Unit 04", category: "HVAC", siteId: "SITE-NR", location: "Building A · Mechanical Room", manufacturer: "Carrier", model: "Aero 39HQ", serial: "CA-39-04881", warrantyUntil: "2027-08-31", status: "Operational", criticality: "Critical", lifetimeCost: 18450, installDate: "2020-02-18" },
      { id: "AST-ELV-03", tag: "ELV-03", title: "Passenger Elevator 03", category: "Vertical transport", siteId: "SITE-OL", location: "Core B", manufacturer: "KONE", model: "MonoSpace", serial: "KN-2021-338", warrantyUntil: "2026-12-15", status: "Needs inspection", criticality: "High", lifetimeCost: 12720 },
      { id: "AST-CHL-02", tag: "CHL-02", title: "Chiller 02", category: "HVAC", siteId: "SITE-OL", location: "Roof · Central Plant", manufacturer: "Trane", model: "CenTraVac CVHF", serial: "TR-CV-22419", warrantyUntil: "2026-12-31", status: "Operational", criticality: "Critical", lifetimeCost: 31200, installDate: "2019-04-12" },
      { id: "AST-FCU-17", tag: "FCU-17", title: "Fan Coil Unit 17", category: "HVAC", siteId: "SITE-OL", location: "Level 5 · Office 5.04", manufacturer: "Daikin", model: "FWB-07", serial: "DK-FWB-1177", warrantyUntil: "2027-03-01", status: "Operational", criticality: "Medium", lifetimeCost: 1960, installDate: "2021-09-20" },
      { id: "AST-PNL-01", tag: "PNL-LB-01", title: "Lobby Distribution Panel", category: "Electrical", siteId: "SITE-OL", location: "Ground Floor", manufacturer: "Schneider", model: "PrismaSeT", serial: "SE-88201", warrantyUntil: "2028-02-10", status: "Operational", criticality: "Critical", lifetimeCost: 4930 },
    ],
    requests: [
      { id: "SR-9184", title: "Water leak near service corridor", description: "Visible water leak beside the Level 2 service corridor.", channel: "Call centre (simulated)", requester: "Noura Hassan", siteId: "SITE-JED", category: "Plumbing", priority: "High", status: "Awaiting triage", createdAt: ago(2), timeline: [event("EV-SR-1", "Request created via call centre", "Help Desk", ago(2))] },
      { id: "SR-9186", title: "Low cooling on Level 5", description: "Offices on Level 5 are warm since this morning; thermostat shows 27°C.", channel: "WhatsApp (simulated)", requester: "Reem Al-Qahtani", siteId: "SITE-OL", assetId: "AST-CHL-02", category: "HVAC", priority: "High", status: "Assigned", createdAt: ago(3), linkedWorkOrderId: "WO-2849", dueAt: ahead(4), timeline: [event("EV-SR-4", "Request received via WhatsApp", "Help Desk", ago(3)), event("EV-SR-5", "Classified HVAC · High · SLA-000002", "System rule", ago(2.95)), event("EV-SR-6", "Linked to WO-2849", "Fahad Al-Salem", ago(2.9))] },
      { id: "SR-9181", title: "AHU-04 unusual vibration", description: "Strong vibration and noise reported from mechanical room.", channel: "Portal", requester: "Omar Saeed", siteId: "SITE-NR", assetId: "AST-AHU-04", category: "HVAC", priority: "Emergency", status: "Assigned", createdAt: ago(5), linkedWorkOrderId: "WO-2841", dueAt: ahead(3), timeline: [event("EV-SR-1b", "Request raised on the requester portal", "Omar Saeed", ago(5.05)), event("EV-SR-2", "Classified HVAC · Emergency · SLA-000001", "System rule", ago(5)), event("EV-SR-3", "Linked to WO-2841", "Fahad Al-Salem", ago(4.8))] },
    ],
    workOrders: [
      { id: "WO-2841", requestId: "SR-9181", title: "AHU-04 unusual vibration", type: "Corrective", assetId: "AST-AHU-04", siteId: "SITE-NR", priority: "Emergency", status: "Assigned", assignee: "Khalid Rahman", openedAt: ago(5), scheduledAt: ago(.5), responseDueAt: ahead(.7), resolutionDueAt: ahead(3), materialCost: 0, notes: "Requester reports strong vibration and a grinding noise. Check fan bearings and belt alignment.", timeline: [event("EV-WO-1", "Work order created from SR-9181 · SLA-000001 started", "System", ago(5)), event("EV-WO-2", "Assigned to Khalid Rahman · HVAC trade, North Riyadh", "Fahad Al-Salem", ago(4))] },
      { id: "WO-2849", requestId: "SR-9186", title: "Low cooling on Level 5", type: "Corrective", assetId: "AST-CHL-02", siteId: "SITE-OL", priority: "High", status: "Assigned", assignee: "Khalid Rahman", openedAt: ago(2.9), scheduledAt: ahead(2), responseDueAt: ahead(.4), resolutionDueAt: ahead(4.1), materialCost: 0, notes: "Check chiller leaving water temperature and refrigerant pressure.", timeline: [event("EV-WO-6", "Work order created from SR-9186 · SLA-000002 started", "System", ago(2.9)), event("EV-WO-7", "Assigned to Khalid Rahman · HVAC trade", "Fahad Al-Salem", ago(2.8))] },
      { id: "WO-2853", ppmId: "PPM-1042", occurrenceAt: ahead(20), title: "Monthly AHU inspection", type: "Preventive", assetId: "AST-AHU-04", siteId: "SITE-NR", priority: "Medium", status: "Assigned", assignee: "Khalid Rahman", openedAt: ago(1), scheduledAt: ahead(20), responseDueAt: ahead(22), resolutionDueAt: ahead(44), materialCost: 0, timeline: [event("EV-WO-8", "Generated from PPM-1042 ahead of due date", "PPM scheduler", ago(1)), event("EV-WO-9", "Assigned to Khalid Rahman (plan default)", "System", ago(1))] },
      { id: "WO-2855", title: "FCU-17 filter replacement", type: "Corrective", assetId: "AST-FCU-17", siteId: "SITE-OL", priority: "Low", status: "Assigned", assignee: "Khalid Rahman", openedAt: ago(8), scheduledAt: ahead(44), responseDueAt: ahead(40), resolutionDueAt: ahead(70), materialCost: 0, timeline: [event("EV-WO-10", "Work order created by supervisor", "Fahad Al-Salem", ago(8)), event("EV-WO-11", "Assigned to Khalid Rahman", "Fahad Al-Salem", ago(7.9))] },
      { id: "WO-2858", title: "Chiller 02 condenser coil cleaning", type: "Preventive", assetId: "AST-CHL-02", siteId: "SITE-OL", contractorId: "CTR-019", priority: "Medium", status: "Assigned", assignee: "Gulf HVAC Solutions", openedAt: ago(6), scheduledAt: ahead(26), responseDueAt: ahead(-3), resolutionDueAt: ahead(12), materialCost: 0, timeline: [event("EV-WO-15", "Work order created · SLA-000013 (Gulf HVAC Priority SLA)", "System", ago(6)), event("EV-WO-16", "Assigned to contractor Gulf HVAC Solutions", "Fahad Al-Salem", ago(5.9))] },
      { id: "WO-2802", title: "AHU-04 motor bearing replacement", type: "Corrective", assetId: "AST-AHU-04", siteId: "SITE-NR", contractorId: "CTR-019", priority: "High", status: "Closed", assignee: "Gulf HVAC Solutions", openedAt: ago(24*20), responseDueAt: ago(24*20-1.5), resolutionDueAt: ago(24*20-5.25), firstResponseAt: ago(24*20-1), resolvedAt: ago(24*20-4.5), materialCost: 650, checklistDone: true, signedOff: true, timeline: [event("EV-WO-17", "Work order closed within SLA", "Gulf HVAC Solutions", ago(24*20-4.5))] },
      { id: "WO-2790", title: "AHU-04 filter replacement", type: "Preventive", assetId: "AST-AHU-04", siteId: "SITE-NR", priority: "Medium", status: "Closed", assignee: "Khalid Rahman", openedAt: ago(24*38), responseDueAt: ago(24*38-4), resolutionDueAt: ago(24*37), firstResponseAt: ago(24*38-1), resolvedAt: ago(24*37.5), materialCost: 420, checklistDone: true, signedOff: true, signedBy: "Omar Saeed", timeline: [event("EV-WO-12", "Work order closed · SAR 420 charged to AHU-04", "Khalid Rahman", ago(24*37.5))] },
      { id: "WO-2711", title: "AHU-04 belt realignment", type: "Corrective", assetId: "AST-AHU-04", siteId: "SITE-NR", priority: "High", status: "Closed", assignee: "Yousef Ali", openedAt: ago(24*96), responseDueAt: ago(24*96-2), resolutionDueAt: ago(24*96-7), firstResponseAt: ago(24*96-1), resolvedAt: ago(24*96-5), materialCost: 170, checklistDone: true, signedOff: true, timeline: [event("EV-WO-13", "Work order closed", "Yousef Ali", ago(24*96-5))] },
      { id: "WO-2766", title: "Chiller 02 refrigerant top-up", type: "Corrective", assetId: "AST-CHL-02", siteId: "SITE-OL", priority: "High", status: "Closed", assignee: "Khalid Rahman", openedAt: ago(24*61), responseDueAt: ago(24*61-2), resolutionDueAt: ago(24*61-7), firstResponseAt: ago(24*61-1.5), resolvedAt: ago(24*61-4), materialCost: 950, checklistDone: true, signedOff: true, timeline: [event("EV-WO-14", "Work order closed", "Khalid Rahman", ago(24*61-4))] },
      { id: "WO-2837", title: "Main lobby power fluctuation", type: "Emergency", assetId: "AST-PNL-01", siteId: "SITE-OL", priority: "Critical", status: "In Progress", assignee: "Abdullah Noor", openedAt: ago(6), responseDueAt: ago(4), resolutionDueAt: ahead(1.3), firstResponseAt: ago(5), materialCost: 280, timeline: [event("EV-WO-3", "Technician started work", "Abdullah Noor", ago(5))] },
      { id: "WO-2829", title: "Elevator 03 inspection overdue", type: "Preventive", assetId: "AST-ELV-03", siteId: "SITE-OL", contractorId: "CTR-014", priority: "High", status: "Escalated", assignee: "Metro Lift Services", openedAt: ago(30), responseDueAt: ago(26), resolutionDueAt: ago(.3), materialCost: 0, timeline: [event("EV-WO-4", "Resolution SLA breached and escalated", "System", ago(.3))] },
      { id: "WO-2818", title: "Replace FCU belt", type: "Preventive", siteId: "SITE-DAM", priority: "Medium", status: "Closed", assignee: "Yousef Ali", openedAt: ago(120), responseDueAt: ago(116), resolutionDueAt: ago(96), firstResponseAt: ago(118), resolvedAt: ago(98), materialCost: 340, timeline: [event("EV-WO-5", "Work order closed", "FM Supervisor", ago(98))] },
    ],
    ppmPlans: [
      { id: "PPM-1042", title: "Monthly AHU inspection", assetId: "AST-AHU-04", siteId: "SITE-NR", recurrence: "Monthly", nextDueAt: ahead(240), status: "Active", assignee: "Khalid Rahman", checklist: "Isolate power and apply LOTO\nInspect and clean filters\nCheck belt tension and bearings\nMeasure vibration and motor current\nRecord supply and return air temperatures\nRestart and verify normal operation" },
      { id: "PPM-1038", title: "Elevator safety inspection", assetId: "AST-ELV-03", siteId: "SITE-OL", recurrence: "Monthly", nextDueAt: ago(24), status: "Overdue" },
    ],
    parts: [
      { id: "PART-AHU-FILTER", name: "AHU replacement filter", sku: "FLT-AHU-F7", siteId: "SITE-NR", qty: 4, reorderLevel: 3, unitCost: 420 },
      { id: "PART-AHU-BRG", name: "AHU fan bearing set", sku: "SKF-6206-2RS", siteId: "SITE-NR", qty: 2, reorderLevel: 1, unitCost: 650 },
      { id: "PART-AHU-BELT", name: "AHU drive belt B-54", sku: "GATES-B54", siteId: "SITE-NR", qty: 3, reorderLevel: 2, unitCost: 170 },
      { id: "PART-R134A", name: "Refrigerant R-134a (kg)", sku: "REF-R134A-KG", siteId: "SITE-OL", qty: 12, reorderLevel: 5, unitCost: 95 },
      { id: "PART-FCU-FILTER", name: "FCU pleated filter 600×600", sku: "FLT-FCU-600", siteId: "SITE-OL", qty: 0, reorderLevel: 6, unitCost: 60 },
      { id: "PART-FCU-BELT", name: "FCU drive belt", siteId: "SITE-DAM", qty: 2, reorderLevel: 4, unitCost: 170 },
    ],
    contractors: [
      { id: "CTR-014", name: "Metro Lift Services", service: "Elevators", status: "Active", contractId: "CN-2026-04", expiresAt: ahead(24 * 14), contactName: "Sami Haddad", phone: "+966 11 555 0142", email: "ops@metrolift.sa", sites: ["SITE-OL"], slaTier: "Standard", timeline: [] },
      { id: "CTR-019", name: "Gulf HVAC Solutions", service: "HVAC", status: "Active", contractId: "CN-2027-02", expiresAt: ahead(24 * 190), contactName: "Faisal Al-Otaibi", phone: "+966 11 555 0190", email: "service@gulfhvac.sa", sites: ["SITE-NR","SITE-OL"], slaTier: "Priority", timeline: [] },
    ],
    rooms: roomSeed.map(([id,name,siteId,building,floor,department,occupancy,capacity,areaSqm])=>({id,name,siteId,building,floor,department,occupancy,capacity,areaSqm})),
  };
}


const STORAGE_KEY = "akaria-cafm-demo-v7";
export type Collection = "sites"|"assets"|"requests"|"workOrders"|"ppmPlans"|"parts"|"contractors"|"rooms"|"applications"|"bookings"|"transfers"|"contracts"|"purchaseRequests";
export type RecordItem = Site|Asset|ServiceRequest|WorkOrder|PpmPlan|Part|Contractor|Room|Application|Booking|Transfer|Contract|PurchaseRequest;
const prefixes:Record<Collection,string>={sites:"SITE",assets:"AST",requests:"SR",workOrders:"WO",ppmPlans:"PPM",parts:"PART",contractors:"CTR",rooms:"ROOM",applications:"APP",bookings:"BOOK",transfers:"TRF",contracts:"CON",purchaseRequests:"PR"};
const stamp=()=>new Date().toISOString();
const audit=(label:string,actor="Fahad Al-Salem"):TimelineEvent=>({id:crypto.randomUUID(),label,actor,at:stamp()});
const defaultRules=()=>createSeed().slaRules;
function restoreDemoState(value:unknown):DemoState {
 const seed=createSeed(); if(!value||typeof value!=="object")return seed;
 const stored=value as Partial<DemoState>;
 const result={...seed};
 for(const key of Object.keys(seed) as (keyof DemoState)[]){
   if(key==="sequences"){result.sequences=(stored.sequences && typeof stored.sequences==="object")?stored.sequences:{};continue;}
   const current=stored[key]; if(Array.isArray(current))(result as unknown as Record<string,unknown>)[key]=current;
 }
 // Older versions lacked the new collections. Imported seed records retain their original IDs.
 return result;
}
function initial():DemoState {
 try {const saved=localStorage.getItem(STORAGE_KEY);return saved?restoreDemoState(JSON.parse(saved)):createSeed();}
 catch {return createSeed();}
}
function nextDate(date:string,recurrence:string):string {
 const dt=new Date(date); if(Number.isNaN(dt.getTime()))return new Date(Date.now()+86400000).toISOString();
 if(recurrence==="Daily")dt.setUTCDate(dt.getUTCDate()+1);
 else if(recurrence==="Weekly")dt.setUTCDate(dt.getUTCDate()+7);
 else if(recurrence==="Quarterly")dt.setUTCMonth(dt.getUTCMonth()+3);
 else if(recurrence==="Yearly")dt.setUTCFullYear(dt.getUTCFullYear()+1);
 else dt.setUTCMonth(dt.getUTCMonth()+1);
 return dt.toISOString();
}
export function chooseSla(data:DemoState,priority:string,contractorId?:string,at=stamp()):SlaRule {
 const matching=data.slaRules.filter(rule=>!rule.archived&&rule.priority===priority&&rule.effectiveAt<=at&&(!rule.contractorId||rule.contractorId===contractorId));
 return matching.sort((a,b)=>Number(Boolean(b.contractorId))-Number(Boolean(a.contractorId))||b.version-a.version)[0] ?? defaultRules().find(x=>x.priority===priority) ?? defaultRules()[2];
}
function makeWorkOrder(data:DemoState,id:string,details:Partial<WorkOrder>):WorkOrder{
 const openedAt=stamp(),priority=details.priority??"Medium",sla=chooseSla(data,priority,details.contractorId,openedAt);
 return {id,title:details.title??"Maintenance work",type:details.type??"Corrective",assetId:details.assetId,siteId:details.siteId??data.sites[0].id,priority,status:"New",openedAt,responseDueAt:new Date(Date.parse(openedAt)+sla.responseMinutes*60000).toISOString(),resolutionDueAt:new Date(Date.parse(openedAt)+sla.resolutionMinutes*60000).toISOString(),materialCost:0,timeline:[audit(`Work order created · ${sla.id} (${sla.resolutionMinutes}m resolution)`) ],...details};
}
function maxSerial(state:DemoState,prefix:string):number {
 let max=1000;
 for(const key of Object.keys(prefixes) as Collection[]) for(const record of state[key] as {id:string}[]) {
   const match=record.id.match(new RegExp(`^${prefix}-(\\d+)$`)); if(match)max=Math.max(max,Number(match[1]));
 }
 return max;
}
export function useDemoData(){
 const [data,setData]=useState<DemoState>(initial);
 const latest=useRef(data);
 useEffect(()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch(error){console.error("Local storage unavailable",error)}},[data]);
 function allocate(key:Collection|"movements"|"slaRules"|"terms"){
   const prefix=key==="movements"?"STK":key==="slaRules"?"SLA":key==="terms"?"TNC":prefixes[key];
   const current=latest.current;const next=Math.max(current.sequences[prefix]??1000,maxSerial(current,prefix))+1;
   const sequences={...current.sequences,[prefix]:next};latest.current={...current,sequences};setData(latest.current);
   return `${prefix}-${String(next).padStart(6,"0")}`;
 }
 // Apply synchronously to the working copy so chained actions (e.g. sign off, then close) see each other.
 function mutate(fn:(state:DemoState)=>DemoState){const next=fn(latest.current);latest.current=next;setData(next);}
 function createRecord(key:Collection,fields:Record<string,unknown>){
   const id=allocate(key),now=stamp();
   const defaults:Record<Collection,Record<string,unknown>>={
     sites:{name:"New site",city:"Riyadh",status:"Active"},
     assets:{tag:"",title:"",category:"HVAC",siteId:latest.current.sites[0].id,location:"",manufacturer:"",model:"",serial:"",installDate:"",acquisitionValue:0,expectedLifeYears:0,warrantyUntil:now.slice(0,10),status:"Operational",criticality:"Medium",lifetimeCost:0},
     requests:{title:"",description:"",requester:"",channel:"Portal",siteId:latest.current.sites[0].id,category:"General",priority:"Medium",status:"Awaiting triage",createdAt:now,dueAt:new Date(Date.now()+24*3600000).toISOString(),timeline:[audit("Service request created")]},
     workOrders:{title:"",type:"Corrective",siteId:latest.current.sites[0].id,priority:"Medium",status:"New",openedAt:now,responseDueAt:now,resolutionDueAt:now,materialCost:0,timeline:[audit("Work order created")]},
     ppmPlans:{title:"",assetId:"",siteId:latest.current.sites[0].id,recurrence:"Monthly",nextDueAt:now,status:"Active",createdAt:now},
     parts:{name:"",siteId:latest.current.sites[0].id,qty:0,reorderLevel:0,unitCost:0},
     contractors:{name:"",service:"General",status:"Active",contractId:"",expiresAt:now,externalTeamsAllowed:false,b2cPhotosAllowed:false,timeline:[audit("Contractor created")]},
     contracts:{title:"",contractorId:"",siteId:latest.current.sites[0].id,service:"General",startAt:now.slice(0,10),endAt:now.slice(0,10),value:0,penaltyPercent:0,tier:"Standard",status:"Draft"},
     purchaseRequests:{partId:"",siteId:latest.current.sites[0].id,quantity:1,status:"Prepared / Awaiting SAP",createdAt:now,requestedBy:"Storekeeper (demo)"},
     rooms:{name:"",siteId:latest.current.sites[0].id,building:"Building A",floor:"Ground",department:"Facilities",occupancy:0,capacity:1,areaSqm:0},
     applications:{applicantType:"Partner",company:"",registration:"",email:"",phone:"",vat:"",address:"",address2:"",country:"Saudi Arabia",region:"",city:"",zip:"",bank:"",account:"",iban:"",swift:"",files:[],termsVersion:"",acceptedAt:"",status:"Submitted",createdAt:now,timeline:[audit("Application submitted")]},
     bookings:{roomId:"",person:"",startAt:now,endAt:now,purpose:"",status:"Confirmed",createdAt:now},
     transfers:{assetId:"",fromSiteId:"",toSiteId:"",toLocation:"",status:"Pending Approval",createdAt:now,timeline:[audit("Transfer requested")]}
   };
   if(key==="contracts"){
     const c=fields as Partial<Contract>;
     if(!latest.current.contractors.some(x=>x.id===c.contractorId&&!x.archived))throw new Error("Choose an active contractor.");
     if(!latest.current.sites.some(x=>x.id===c.siteId))throw new Error("Choose a valid site.");
     if(Date.parse(String(c.endAt))<=Date.parse(String(c.startAt)))throw new Error("Contract end date must follow start date.");
   }
   if(key==="purchaseRequests"){
     const pr=fields as Partial<PurchaseRequest>;
     const part=latest.current.parts.find(p=>p.id===pr.partId&&!p.archived);
     if(!part)throw new Error("Choose a valid part.");
     if(!Number.isInteger(pr.quantity)||Number(pr.quantity)<=0)throw new Error("Requested quantity must be a positive whole number.");
     fields.siteId=part.siteId;fields.status="Prepared / Awaiting SAP";
   }
   if(key==="bookings"){
     const booking=fields as Partial<Booking>;
     if(!latest.current.rooms.some(room=>room.id===booking.roomId&&!room.archived))throw new Error("Choose an available room.");
     if(!booking.startAt||!booking.endAt||Date.parse(booking.endAt)<=Date.parse(booking.startAt))throw new Error("Booking end must be after start.");
     const conflict=latest.current.bookings.find(b=>!b.archived&&b.status==="Confirmed"&&b.roomId===booking.roomId&&Date.parse(b.startAt)<Date.parse(booking.endAt!)&&Date.parse(b.endAt)>Date.parse(booking.startAt!));
     if(conflict)throw new Error(`Room already booked (${conflict.id}).`);
   }
   if(key==="requests"){
     const priority=String(fields.priority??"Medium"),rule=chooseSla(latest.current,priority);
     fields.dueAt=fields.dueAt??new Date(Date.now()+rule.resolutionMinutes*60_000).toISOString();
   }
   const payload:Record<string,unknown>=key==="workOrders"?(makeWorkOrder(latest.current,id,fields as Partial<WorkOrder>) as unknown as Record<string,unknown>):{...defaults[key],...fields,id};
   mutate(current=>({...current,[key]:[payload,...(current[key] as RecordItem[])]} as DemoState));
   return id;
 }
 function updateRecord(key:Collection,id:string,patch:Record<string,unknown>,meta?:{actor?:string;label?:string}){
   const safe={...patch};delete safe.id;delete safe.createdAt;delete safe.openedAt;
   if(key==="bookings"){
     const old=latest.current.bookings.find(b=>b.id===id);
     if(old){const roomId=String(safe.roomId??old.roomId),startAt=String(safe.startAt??old.startAt),endAt=String(safe.endAt??old.endAt);
       if(Date.parse(endAt)<=Date.parse(startAt))throw new Error("Booking end must be after start.");
       const conflict=latest.current.bookings.find(b=>b.id!==id&&!b.archived&&b.status==="Confirmed"&&b.roomId===roomId&&Date.parse(b.startAt)<Date.parse(endAt)&&Date.parse(b.endAt)>Date.parse(startAt));
       if(conflict)throw new Error(`Room already booked (${conflict.id}).`);
     }
   }
   if(key==="parts"&&Object.prototype.hasOwnProperty.call(safe,"qty")){
     const part=latest.current.parts.find(x=>x.id===id);
     if(part&&Number(safe.qty)!==part.qty)throw new Error("Adjust stock using Receive, Issue or Return so the stock ledger stays traceable.");
   }
   if(key==="contracts"&&safe.penaltyPercent!==undefined){
     const rate=Number(safe.penaltyPercent);
     if(!Number.isFinite(rate)||rate<0||rate>100)throw new Error("Penalty rate must be between 0 and 100%.");
   }
   if(key==="contracts"){
     const old=latest.current.contracts.find(c=>c.id===id);
     if(old){const start=String(safe.startAt??old.startAt),end=String(safe.endAt??old.endAt);
       if(Date.parse(end)<=Date.parse(start))throw new Error("Contract end must follow start date.");}
   }
   if(key==="requests"&&safe.priority){
     const original=latest.current.requests.find(x=>x.id===id);
     if(original&&!original.linkedWorkOrderId){const rule=chooseSla(latest.current,String(safe.priority));safe.dueAt=new Date(Date.parse(original.createdAt)+rule.resolutionMinutes*60_000).toISOString();}
   }
   if(key==="workOrders"){
     const original=latest.current.workOrders.find(w=>w.id===id);
     if(original){
       const completed=Boolean(safe.checklistDone??original.checklistDone);
       const signed=Boolean(safe.signedOff??original.signedOff);
       if(safe.status==="Closed"&&(!completed||!signed))throw new Error("Checklist and requester sign-off are required for closure.");
       const plan=latest.current.ppmPlans.find(p=>p.id===original.ppmId);
       const steps=plan?.checklist?.split("\n").map(x=>x.trim()).filter(Boolean)??[];
       const results=(safe.checklistResults??original.checklistResults??{}) as Record<string,boolean>;
       if(safe.status==="Closed"&&steps.length&&!steps.every(step=>results[step]))throw new Error("Complete every PPM checklist step before closure.");
       if(safe.evidence){const contractor=latest.current.contractors.find(c=>c.id===original.contractorId);if(original.type==="B2C"&&!contractor?.b2cPhotosAllowed)throw new Error("B2C photo uploads are disabled by admin permission.");}
     }
   }
   mutate(current=>{
     const previous=key==="requests"?current.requests.find(x=>x.id===id):undefined;
     const changedStatus=previous&&typeof safe.status==="string"&&safe.status!==previous.status;
     const notice=changedStatus?{id:`NTF-${crypto.randomUUID()}`,recordType:"requests" as const,recordId:id,message:`${id}: ${previous.status} → ${safe.status} (in-app demo notification)`,createdAt:stamp()}:null;
     return {...current,[key]:(current[key] as ({id:string;timeline?:TimelineEvent[]}[])).map(item=>item.id===id?{...item,...safe,...(Array.isArray(item.timeline)?{timeline:[...item.timeline,audit(meta?.label??`Updated ${Object.keys(safe).join(", ")}`,meta?.actor)]}:{})}:item),notifications:notice?[notice,...current.notifications]:current.notifications} as DemoState;
   });
 }
 function archiveRecord(key:Collection,id:string):string|null{
   const s=latest.current;
   const linked:string[]=[];
   if(key==="assets" && (s.workOrders.some(w=>w.assetId===id&&w.status!=="Closed")||s.ppmPlans.some(p=>p.assetId===id&&p.status==="Active")))linked.push("open work orders or PPM plans");
   if(key==="sites" && [s.assets,s.rooms,s.parts,s.workOrders].some(records=>records.some(r=>r.siteId===id)))linked.push("site records");
   if(key==="rooms"&&s.bookings.some(b=>b.roomId===id&&b.status==="Confirmed"))linked.push("bookings");
   if(key==="parts"&&s.movements.some(m=>m.partId===id))linked.push("stock ledger entries");
   if(key==="requests"&&s.workOrders.some(w=>w.requestId===id&&w.status!=="Closed"))linked.push("open work orders");
   if(key==="workOrders"&&s.requests.some(r=>r.linkedWorkOrderId===id&&r.status!=="Closed"&&r.status!=="Resolved"))linked.push("service requests");
   if(key==="contractors"&&(s.workOrders.some(w=>w.contractorId===id&&w.status!=="Closed")||s.contracts.some(c=>c.contractorId===id&&!c.archived&&c.status==="Active")))linked.push("open assigned work or active contracts");
   if(key==="contracts"&&s.workOrders.some(w=>w.contractorId===s.contracts.find(c=>c.id===id)?.contractorId&&w.status!=="Closed"))linked.push("open contractor work orders");
   if(key==="purchaseRequests"&&s.purchaseRequests.some(pr=>pr.id===id&&pr.status==="Approved"))linked.push("approved purchase history");
   if(linked.length)return `This record has linked ${linked.join(" and ")}. Resolve links before archiving.`;
   updateRecord(key,id,{archived:true,status:"Archived"});return null;
 }
 function createRequest(input:Pick<ServiceRequest,"title"|"description"|"siteId"|"requester"|"channel">){
   const lower=`${input.title} ${input.description}`.toLowerCase();
   const category=/water|leak|pipe/.test(lower)?"Plumbing":/ahu|air|ac/.test(lower)?"HVAC":"General";
   return createRecord("requests",{...input,category,priority:category==="Plumbing"?"High":/emergency|fire|power outage|danger/.test(lower)?"Emergency":"Medium",classificationSource:"Assisted demo rule · admin approval pending"});
 }
 function createWorkOrder(requestId:string){
   const request=latest.current.requests.find(r=>r.id===requestId);if(!request)return undefined;
   if(request.linkedWorkOrderId)return request.linkedWorkOrderId;
   const id=createRecord("workOrders",{requestId,title:request.title,assetId:request.assetId,siteId:request.siteId,priority:request.priority,type:"Corrective"});
   updateRecord("requests",requestId,{linkedWorkOrderId:id,status:"Work order created"});return id;
 }
 function assignWorkOrder(id:string,assignee:string,reason=""){
   const work=latest.current.workOrders.find(x=>x.id===id);
   if(!work)throw new Error("Work order not found.");
   if(!assignee.trim())throw new Error("Choose a technician or contractor.");
   if(work.assignee&&work.assignee!==assignee&&!reason.trim())throw new Error("A reason is required for reassignment.");
   updateRecord("workOrders",id,{assignee,status:"Assigned",assignmentReason:reason},{label:`Assigned to ${assignee}${reason?` · ${reason}`:""}`});
 }
 function setWorkOrderStatus(id:string,status:string,actor?:string){
   const now=stamp();const work=latest.current.workOrders.find(w=>w.id===id);if(!work)return;
   if(status==="Closed"&&!work.checklistDone)throw new Error("Complete the required checklist before closing.");
   if(status==="Closed"&&!work.signedOff)throw new Error("A sign-off is required before closing.");
   updateRecord("workOrders",id,{status,...(!work.firstResponseAt&&["In Progress","Closed"].includes(status)?{firstResponseAt:now}:{}),...(status==="Closed"?{resolvedAt:now}:{})},{actor,label:status==="Closed"?"Work order closed · cost posted to asset history":`Status changed to ${status}`});
   if(work.requestId)updateRecord("requests",work.requestId,{status:status==="Closed"?"Resolved":status},{actor,label:status==="Closed"?`Resolved via ${id} · awaiting requester confirmation`:`Linked ${id} is ${status}`});
 }
 function updateSla(priority:string,responseMinutes:number,resolutionMinutes:number,contractorId?:string){
   if(!Number.isInteger(responseMinutes)||responseMinutes<=0||!Number.isInteger(resolutionMinutes)||resolutionMinutes<=0)throw new Error("SLA durations must be positive whole minutes.");
   const version=1+Math.max(0,...latest.current.slaRules.filter(x=>x.priority===priority&&x.contractorId===contractorId).map(x=>x.version));
   const rule:SlaRule={id:allocate("slaRules"),priority,responseMinutes,resolutionMinutes,contractorId,version,effectiveAt:stamp()};
   mutate(s=>({...s,slaRules:[rule,...s.slaRules]}));return rule.id;
 }
 function issuePart(partId:string,workOrderId:string,qty:number,direction:"Issue"|"Receipt"|"Return"="Issue",actor?:string){
   const s=latest.current,part=s.parts.find(x=>x.id===partId),wo=s.workOrders.find(x=>x.id===workOrderId);
   if(!part)throw new Error("Select a valid stock part.");
   if(direction!=="Receipt"&&!wo)throw new Error("Select a valid work order.");
   if(!Number.isInteger(qty)||qty<=0)throw new Error("Quantity must be a positive whole number.");
   if(wo&&part.siteId!==wo.siteId)throw new Error(`Part ${part.id} is stored at another site. Transfer stock to ${wo.siteId} before issuing or returning it.`);
   if(direction==="Issue"&&part.qty<qty)throw new Error(`Only ${part.qty} units available. Negative stock is blocked.`);
   if(direction==="Return"){
     const outstanding=-s.movements.filter(m=>m.partId===partId&&m.workOrderId===workOrderId&&["Issue","Return"].includes(m.direction)).reduce((sum,m)=>sum+m.qty,0);
     if(qty>outstanding)throw new Error(`Only ${outstanding} units previously issued to this work order are eligible for return.`);
   }
   const delta=direction==="Issue"?-qty:qty,cost=part.unitCost*qty;
   const movement:StockMovement={id:allocate("movements"),partId,workOrderId:wo?.id,direction,qty:delta,unitCost:part.unitCost,createdAt:stamp()};
   mutate(s=>({...s,movements:[movement,...s.movements],parts:s.parts.map(p=>p.id===partId?{...p,qty:p.qty+delta}:p),workOrders:s.workOrders.map(w=>w.id===wo?.id?{...w,materialCost:Math.max(0,w.materialCost+(direction==="Issue"?cost:-cost)),timeline:[...w.timeline,audit(`${direction==="Issue"?"Spare part issued":direction} ${qty} × ${part.name} · ${movement.id} · SAR ${cost.toLocaleString()} charged to asset`,actor)]}:w),assets:s.assets.map(a=>a.id===wo?.assetId?{...a,lifetimeCost:Math.max(0,a.lifetimeCost+(direction==="Issue"?cost:-cost))}:a)}));
   return movement.id;
 }
 function receivePart(partId:string,qty:number){return issuePart(partId,"",qty,"Receipt")}
 function generatePpm(id:string){
   const plan=latest.current.ppmPlans.find(p=>p.id===id);if(!plan||plan.status!=="Active")throw new Error("Only active plans can generate work orders.");
   if(latest.current.workOrders.some(w=>w.ppmId===id&&w.occurrenceAt===plan.nextDueAt))throw new Error("Work order already generated for this occurrence.");
   if(Date.parse(plan.nextDueAt)>Date.now()+30*86400000)throw new Error("Next occurrence is more than 30 days away; nothing is due to generate yet.");
   const occurrence=plan.nextDueAt;
   const workId=createRecord("workOrders",{ppmId:plan.id,occurrenceAt:occurrence,title:plan.title,type:"Preventive",assetId:plan.assetId,siteId:plan.siteId,priority:"Medium",assignee:plan.assignee||undefined});
   updateRecord("ppmPlans",id,{nextDueAt:nextDate(occurrence,plan.recurrence),lastGeneratedAt:occurrence});
   return workId;
 }
 function saveTermsDraft(content:string){
   if(!content.trim())throw new Error("Draft cannot be empty.");
   const existing=latest.current.terms.find(t=>t.status==="Draft");
   if(existing){mutate(s=>({...s,terms:s.terms.map(t=>t.id===existing.id?{...t,content}:t)}));return existing.id;}
   const id=allocate("terms"),version=1+Math.max(0,...latest.current.terms.map(t=>t.version));
   mutate(s=>({...s,terms:[{id,version,content,status:"Draft",createdAt:stamp()},...s.terms]}));return id;
 }
 function publishTerms(content:string){if(!content.trim())throw new Error("Terms cannot be empty.");const version=1+Math.max(0,...latest.current.terms.map(t=>t.version));const id=allocate("terms");mutate(s=>({...s,terms:[{id,version,content,status:"Published",createdAt:stamp(),publishedAt:stamp()},...s.terms]}));return id}
 function reviewApplication(id:string,status:string,note:string){
   const app=latest.current.applications.find(a=>a.id===id);if(!app)throw new Error("Application not found");
   const valid=["Under Review","Documents Requested","Approved","Rejected","Active"];if(!valid.includes(status))throw new Error("Invalid review status");
   let contractorId=app.contractorId;
   if(status==="Approved"&&!contractorId){
     contractorId=latest.current.contractors.find(x=>x.name.toLowerCase()===app.company.toLowerCase())?.id;
     if(!contractorId)contractorId=createRecord("contractors",{name:app.company,service:app.applicantType,status:"Active",contractId:"Pending contract",expiresAt:new Date(Date.now()+365*86400000).toISOString()});
   }
   updateRecord("applications",id,{status,reviewerNote:note,contractorId});
   return contractorId;
 }
 function confirmRequest(id:string,accepted:boolean,comment:string){
   const request=latest.current.requests.find(x=>x.id===id);
   if(!request||request.status!=="Resolved")throw new Error("Only resolved requests can be confirmed or rejected.");
   if(!accepted&&!comment.trim())throw new Error("Add a reason when rejecting completion.");
   if(!accepted&&request.linkedWorkOrderId){
     const wo=latest.current.workOrders.find(x=>x.id===request.linkedWorkOrderId);
     if(wo)updateRecord("workOrders",wo.id,{status:"Assigned",signedOff:false,resolvedAt:undefined});
   }
   updateRecord("requests",id,{status:accepted?"Closed":"Reopened",feedback:comment,...(accepted?{confirmedAt:stamp()}: {})});
 }
 function rateRequest(id:string,rating:number,feedback:string){
   const request=latest.current.requests.find(x=>x.id===id);
   if(!request||request.status!=="Closed")throw new Error("Close the confirmed service request before rating.");
   if(!Number.isInteger(rating)||rating<1||rating>5)throw new Error("Rating must be 1–5.");
   updateRecord("requests",id,{rating,feedback});
 }
 function markNotificationRead(id:string){mutate(s=>({...s,notifications:s.notifications.map(n=>n.id===id?{...n,readAt:n.readAt??stamp()}:n)}))}
 function triageRequest(id:string){
   const request=latest.current.requests.find(x=>x.id===id);
   if(!request)throw new Error("Request not found.");
   if(request.linkedWorkOrderId)throw new Error("Already linked to work order. Update priority through supervisor with audit instead.");
   const lower=`${request.title} ${request.description}`.toLowerCase();
   const category=/water|leak|pipe/.test(lower)?"Plumbing":/ahu|air|cooling|ac/.test(lower)?"HVAC":/power|electric/.test(lower)?"Electrical":"General";
   const priority=/fire|emergency|outage|danger/.test(lower)?"Emergency":category==="Plumbing"?"High":"Medium";
   updateRecord("requests",id,{category,priority,status:"Classified",classificationSource:"Automated triage · editable demo rules"});
 }
 function createReplenishment(partId:string,quantity:number,requestedBy?:string,workOrderId?:string){
   const part=latest.current.parts.find(p=>p.id===partId&&!p.archived);
   if(!part)throw new Error("Part not found.");
   if(!workOrderId&&part.qty>part.reorderLevel)throw new Error("Part is not below the reorder level.");
   if(latest.current.purchaseRequests.some(p=>p.partId===partId&&!p.archived&&p.status==="Prepared / Awaiting SAP"))throw new Error("An open replenishment request already exists for this part.");
   return createRecord("purchaseRequests",{partId,siteId:part.siteId,quantity,...(requestedBy?{requestedBy}:{}),...(workOrderId?{workOrderId}:{})});
 }
 function assignContractorSla(contractorId:string,rules:{priority:string;responseMinutes:number;resolutionMinutes:number}[]){
   const ids:string[]=[];for(const r of rules)ids.push(updateSla(r.priority,r.responseMinutes,r.resolutionMinutes,contractorId));
   updateRecord("contractors",contractorId,{},{label:`SLA assigned · ${rules.map(r=>`${r.priority} ${r.responseMinutes}/${r.resolutionMinutes} min`).join(", ")}`});
   return ids;
 }
 function approveTransfer(id:string){const transfer=latest.current.transfers.find(x=>x.id===id);if(!transfer)throw new Error("Transfer not found");updateRecord("transfers",id,{status:"Accepted"});updateRecord("assets",transfer.assetId,{siteId:transfer.toSiteId,location:transfer.toLocation});}
 return {data,reset:()=>{const seed=createSeed();latest.current=seed;setData(seed)},createRecord,updateRecord,archiveRecord,createRequest,createWorkOrder,assignWorkOrder,setWorkOrderStatus,updateSla,issuePart,receivePart,generatePpm,saveTermsDraft,publishTerms,reviewApplication,approveTransfer,assignContractorSla,confirmRequest,rateRequest,markNotificationRead,triageRequest,createReplenishment};
}
export type Store = ReturnType<typeof useDemoData>;
export function responseSlaState(wo:WorkOrder){
 if(wo.firstResponseAt)return wo.firstResponseAt<=wo.responseDueAt?"Within SLA":"Breached";
 const time=Date.parse(wo.responseDueAt)-Date.now();
 return time<=0?"Breached":time<=3600000?"At Risk":"On Track";
}
export function slaState(wo:WorkOrder){
 if(wo.status==="Closed")return wo.resolvedAt&&wo.resolvedAt<=wo.resolutionDueAt?"Within SLA":"Breached";
 const diff=Date.parse(wo.resolutionDueAt)-Date.now();return diff<=0?"Breached":diff<=3600000?"At Risk":"On Track";
}
export function timeRemaining(iso:string){const ms=Date.parse(iso)-Date.now(),a=Math.abs(ms),h=Math.floor(a/3600000),m=Math.floor(a%3600000/60000);return `${ms<0?"Breached ":""}${h}h ${m}m${ms>=0?" left":""}`;}
