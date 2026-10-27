import {useEffect, useRef} from "react";
import * as THREE from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {CSS2DObject, CSS2DRenderer} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type {Room} from "./demoData";

export type PlanRect = {room:Room;x:number;y:number;w:number;h:number;top:boolean};
type Props = {floors:string[];layouts:Record<string,PlanRect[]>;planW:number;planH:number;current:string;selected?:string;onFloor:(f:string)=>void;onSelect:(id:string)=>void};

const SCALE=0.02,STOREY=3.2,WALL_H=1.5,WALL_T=0.12;

/** Orbitable 3D model of a building: the chosen floor shows rooms with walls, floors above are ghosted. */
export default function Building3D({floors,layouts,planW,planH,current,selected,onFloor,onSelect}:Props){
 const host=useRef<HTMLDivElement>(null);
 const ctx=useRef<{scene:THREE.Scene;camera:THREE.PerspectiveCamera;controls:OrbitControls;group:THREE.Group;pickables:THREE.Object3D[]}>(null);
 const handlers=useRef({onFloor,onSelect});handlers.current={onFloor,onSelect};

 useEffect(()=>{
  const el=host.current;if(!el)return;
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(2,window.devicePixelRatio));el.appendChild(renderer.domElement);
  const labels=new CSS2DRenderer();labels.domElement.className="b3d-labels";el.appendChild(labels.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(38,1,0.1,500);camera.position.set(22,20,24);
  const controls=new OrbitControls(camera,labels.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*0.48;controls.minDistance=10;controls.maxDistance=70;
  scene.add(new THREE.HemisphereLight(0xffffff,0xb8c4d6,2.2));
  const sun=new THREE.DirectionalLight(0xffffff,1.4);sun.position.set(12,30,18);scene.add(sun);
  const group=new THREE.Group();scene.add(group);
  ctx.current={scene,camera,controls,group,pickables:[]};

  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);labels.setSize(w,h);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix()};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();

  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down={x:0,y:0};
  const onDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY}};
  const onUp=(e:PointerEvent)=>{
   if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>4||!ctx.current)return;
   const r=labels.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
   ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(ctx.current.pickables,false)[0]?.object.userData;
   if(hit?.roomId)handlers.current.onSelect(hit.roomId);else if(hit?.floor)handlers.current.onFloor(hit.floor);
  };
  labels.domElement.addEventListener("pointerdown",onDown);labels.domElement.addEventListener("pointerup",onUp);

  let frame=0;const tick=()=>{frame=requestAnimationFrame(tick);controls.update();renderer.render(scene,camera);labels.render(scene,camera)};tick();
  return ()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.dispose();el.replaceChildren();ctx.current=null};
 },[]);

 useEffect(()=>{
  const c=ctx.current;if(!c)return;
  for(const child of [...c.group.children]){c.group.remove(child);child.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose()}if(o instanceof CSS2DObject)o.element.remove()})}
  c.pickables=[];
  const W=planW*SCALE,D=planH*SCALE,currentIndex=Math.max(0,floors.indexOf(current));
  const box=(w:number,h:number,d:number,color:number,opacity=1)=>new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity>=1}));
  const label=(text:string,cls:string,pos:THREE.Vector3,onClick?:()=>void)=>{const div=document.createElement("div");div.className=cls;div.textContent=text;if(onClick){div.addEventListener("click",onClick);div.style.pointerEvents="auto"}const obj=new CSS2DObject(div);obj.position.copy(pos);c.group.add(obj)};

  floors.forEach((floor,i)=>{
   const y=i*STOREY,active=i===currentIndex,above=i>currentIndex;
   const slab=box(W+0.6,0.25,D+0.6,active?0x9fb0c8:0xc5cfdd,above?0.18:1);slab.position.set(0,y-0.125,0);slab.userData={floor};c.group.add(slab);c.pickables.push(slab);
   label(floor,`b3d-floor${active?" active":""}`,new THREE.Vector3(-W/2-0.6,y+0.4,D/2+0.3),()=>handlers.current.onFloor(floor));
   if(above){const glass=box(W,STOREY-0.3,D,0xdbe6f7,0.12);glass.position.set(0,y+(STOREY-0.3)/2,0);c.group.add(glass);return}
   if(!active){const shell=box(W,STOREY-0.3,D,0xe6ebf2);shell.position.set(0,y+(STOREY-0.3)/2,0);c.group.add(shell);return}
   for(const r of layouts[floor]??[]){
    const x0=r.x*SCALE-W/2,z0=r.y*SCALE-D/2,w=r.w*SCALE,d=r.h*SCALE,isSel=r.room.id===selected;
    const tile=box(w-WALL_T,0.04,d-WALL_T,isSel?0x9db9ff:0xffffff);tile.position.set(x0+w/2,y+0.02,z0+d/2);tile.userData={roomId:r.room.id};c.group.add(tile);c.pickables.push(tile);
    const wallColor=isSel?0x356df3:0x4a5b75;
    const doorW=Math.min(1.2,w*0.3),doorX=x0+w-doorW-0.5,doorZ=r.top?z0+d:z0;
    const walls:[number,number,number,number][]=[[x0+w/2,r.top?z0:z0+d,w,WALL_T],[x0,z0+d/2,WALL_T,d],[x0+w,z0+d/2,WALL_T,d]];
    // Corridor-facing wall is split around the door opening.
    walls.push([(x0+doorX)/2,doorZ,doorX-x0,WALL_T],[(doorX+doorW+x0+w)/2,doorZ,x0+w-doorX-doorW,WALL_T]);
    for(const [cx,cz,ww,dd] of walls){if(ww<=0)continue;const m=box(ww,WALL_H,dd,wallColor);m.position.set(cx,y+WALL_H/2,cz);c.group.add(m)}
    label(r.room.name,`b3d-room${isSel?" selected":""}`,new THREE.Vector3(x0+w/2,y+WALL_H+0.3,z0+d/2),()=>handlers.current.onSelect(r.room.id));
   }
  });
 },[floors,layouts,planW,planH,current,selected]);

 // Re-frame only when the floor changes, so selecting a room keeps the user's orbit.
 useEffect(()=>{const c=ctx.current;if(!c)return;const y=Math.max(0,floors.indexOf(current))*STOREY;c.controls.target.set(0,y,0);c.camera.position.set(22,y+20,24);c.controls.update()},[floors,current]);

 return <div className="b3d" ref={host} aria-label="3D building model. Drag to rotate, scroll to zoom, click a floor or room."/>;
}
