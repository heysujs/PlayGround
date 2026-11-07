import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
const $=id=>document.getElementById(id),canvas=$('scene');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9db5b0);scene.fog=new THREE.Fog(0x9db5b0,38,155);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,240);camera.position.set(0,1.7,14);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
const clock=new THREE.Clock(),world=new THREE.Group();scene.add(world);
const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const mats={ground:mat(0x95816a),steel:mat(0x34423f,.43,.7),steelLite:mat(0x687672,.38,.68),dark:mat(0x202a29,.45,.6),safety:mat(0xd19a39,.6,.15),lime:mat(0xc8f169,.33,.1),concrete:mat(0x9d9a89),wood:mat(0x856545),glass:new THREE.MeshStandardMaterial({color:0x91b4b1,roughness:.2,metalness:.2,transparent:true,opacity:.6}),white:mat(0xd8d7c8),red:mat(0xb24e3a),green:mat(0x546c4e),rock:mat(0x685d50),sand:mat(0xc4a276)};
const boxGeo=new THREE.BoxGeometry(1,1,1);
function box(parent,name,x,y,z,sx,sy,sz,material,cast=true){const m=new THREE.Mesh(boxGeo,material);m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(parent,name,x,y,z,rt,rb,h,material,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(parent,name,x,y,z,r,material,segments=12){const m=new THREE.Mesh(new THREE.SphereGeometry(r,segments,segments),material);m.name=name;m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function beam(parent,a,b,r,material,segments=8){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=new THREE.Vector3().subVectors(B,A);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),segments),material);m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function seededNoiseTexture(base,speck,size=256){const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,size,size);let s=21;for(let i=0;i<6500;i++){s=(s*1664525+1013904223)>>>0;const x=s%size;s=(s*1664525+1013904223)>>>0;const y=s%size;s=(s*1664525+1013904223)>>>0;ctx.fillStyle=`rgba(${speck},${.035+(s%100)/1000})`;ctx.fillRect(x,y,1+(s%3),1+(s%2));}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;}
// Dry Nevada basin and a rugged layered horizon.
const dirtMap=seededNoiseTexture('#938069','245,222,184');dirtMap.repeat.set(28,28);mats.ground.map=dirtMap;mats.ground.color.set(0xffffff);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(230,230),mats.ground);ground.rotation.x=-Math.PI/2;ground.position.y=-.12;ground.receiveShadow=true;world.add(ground);
scene.add(new THREE.HemisphereLight(0xd9e8e5,0x514539,2));const sun=new THREE.DirectionalLight(0xffe6c1,3.2);sun.position.set(-28,42,19);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-55;sun.shadow.camera.right=55;sun.shadow.camera.top=55;sun.shadow.camera.bottom=-55;sun.shadow.bias=-.0003;scene.add(sun);
const skyBall=new THREE.Mesh(new THREE.SphereGeometry(3,16,16),new THREE.MeshBasicMaterial({color:0xffe6a1}));skyBall.position.set(-65,58,-105);world.add(skyBall);
const horizonMats=[mat(0x737b70),mat(0x626e65),mat(0x53615c)];for(let row=0;row<3;row++)for(let i=0;i<13;i++){const a=i/13*Math.PI*2,r=74+row*18,h=13+((i*17+row*7)%11),m=new THREE.Mesh(new THREE.ConeGeometry(12+row*2,h,6),horizonMats[row]);m.position.set(Math.cos(a)*r,h/2-1,Math.sin(a)*r);m.rotation.y=a+.2;m.receiveShadow=true;world.add(m);}
box(world,'concrete apron',0,-.015,0,44,.12,38,mats.concrete,false);for(let i=-1;i<=1;i++)box(world,'paint line',i*2,.052,12,.08,.008,7,mat(0xd8c991),false);
box(world,'road',0,-.005,23,10,.08,40,mat(0x555954),false);for(let z=9;z<42;z+=5)box(world,'road dash',0,.04,z,.12,.02,2,mat(0xd6cda7),false);
// Rig chassis and derrick tower.
const rig=new THREE.Group();rig.position.set(0,0,-1);world.add(rig);box(rig,'rig skid',0,.35,0,9,.6,8,mats.dark);
for(const x of [-3.6,3.6])for(const z of [-3,3]){box(rig,'outrigger',x,.26,z,2.1,.42,1.2,mats.steel);cylinder(rig,'level foot',x,.12,z,.48,.48,.2,mats.dark,16)}
box(rig,'rotary floor',0,.77,0,6.6,.24,6,mats.steel);for(let i=0;i<8;i++){const a=i/8*Math.PI*2;cylinder(rig,'deck bolt',Math.cos(a)*2.8,.91,Math.sin(a)*2.5,.1,.1,.05,mats.safety,8)}
const basePts=[[-2.65,.9,-2.25],[2.65,.9,-2.25],[-2.65,.9,2.25],[2.65,.9,2.25]],topPts=[[-1.28,12,-1.05],[1.28,12,-1.05],[-1.28,12,1.05],[1.28,12,1.05]];
for(let i=0;i<4;i++)beam(rig,basePts[i],topPts[i],.14,mats.safety,7);
for(const y of [2.4,4.6,6.8,9,11.8]){const k=(y-.9)/11.1,w=2.65+(1.28-2.65)*k,d=2.25+(1.05-2.25)*k;for(const x of [-w,w])box(rig,'tower crossmember',x,y,0,.12,.12,d*2,mats.steelLite);for(const z of [-d,d])box(rig,'tower crossmember',0,y,z,w*2,.12,.12,mats.steelLite);}
for(const y of [2.4,4.6,6.8,9]){const k=(y-.9)/11.1,w=2.65+(1.28-2.65)*k,d=2.25+(1.05-2.25)*k;beam(rig,[-w,y,-d],[w,y+2.2,d],.07,mats.steelLite);beam(rig,[w,y,-d],[-w,y+2.2,d],.07,mats.steelLite);}
box(rig,'crown block',0,12.15,0,3.2,.7,2.8,mats.dark);for(let z of [-.9,.9])cylinder(rig,'crown sheave',0,12.65,z,.62,.62,.42,mats.safety,20).rotation.x=Math.PI/2;
const shaftGroup=new THREE.Group();shaftGroup.position.set(0,7.3,0);rig.add(shaftGroup);cylinder(shaftGroup,'drill rod',0,-1.4,0,.2,.2,9.3,mats.steelLite,16);
const rotary=cylinder(rig,'rotary drive',0,7.7,0,1.05,1.05,1.35,mats.dark,20);for(let y of [7.05,8.35])cylinder(rig,'rotary rim',0,y,0,1.14,1.14,.12,mats.safety,20);cylinder(rig,'well collar',0,.96,0,1.25,1.25,.25,mats.dark,24);
for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const tooth=box(rig,'collar tooth',Math.cos(a)*1.1,1.1,Math.sin(a)*1.1,.17,.22,.25,mats.safety);tooth.rotation.y=-a;}
const bit=cylinder(rig,'drill bit',0,-.55,0,.55,.12,1.8,mats.steelLite,10);
const platform=box(rig,'upper service platform',-2.55,5.25,.5,2.35,.2,3.8,mats.steel);platform.rotation.z=-.12;
for(const z of [-1.25,2.25])beam(rig,[-3.65,5.28,z],[-1.45,5.28,z],.05,mats.safety);for(const x of [-3.62,-1.47])for(const z of [-1.25,2.25])beam(rig,[x,5.3,z],[x,6.15,z],.045,mats.safety);
const ramp=new THREE.Mesh(new THREE.BoxGeometry(2.2,.15,9),mats.steel);ramp.position.set(-4.3,2.35,4.1);ramp.rotation.x=-.48;ramp.castShadow=true;ramp.receiveShadow=true;rig.add(ramp);
for(const x of [-5.25,-3.35])beam(rig,[x,.14,8.5],[x,4.85,-.25],.055,mats.safety);for(let z=1;z<8;z+=.75){const rung=box(rig,'ramp rung',-4.3,.55+(8.5-z)*.42,z,2.1,.08,.17,mats.steelLite);}
const refill=new THREE.Group();refill.position.set(-2.5,5.42,1.1);rig.add(refill);cylinder(refill,'oil hatch',0,0,0,.47,.47,.13,mats.dark,20);cylinder(refill,'oil hatch ring',0,.08,0,.34,.34,.04,mats.lime,20);const hatchGlow=new THREE.Mesh(new THREE.CircleGeometry(.21,24),new THREE.MeshBasicMaterial({color:0xb5e954,transparent:true,opacity:.75}));hatchGlow.rotation.x=-Math.PI/2;hatchGlow.position.y=.105;refill.add(hatchGlow);
beam(rig,[-2.7,6.3,1.1],[-2.7,5.8,1.1],.035,mats.dark);
const control=new THREE.Group();control.position.set(3.55,0,4.9);world.add(control);box(control,'control cabinet',0,1.1,0,1.25,2.2,.75,mats.dark);box(control,'console screen',0,1.65,.39,.82,.62,.04,mat(0x315650,.25,.25));box(control,'console glow',0,1.65,.42,.68,.44,.02,mat(0x6daa75,.25,.1));for(let i=0;i<3;i++)sphere(control,'control lamp',-.28+i*.28,1.14,.4,.055,i===1?mats.lime:mats.safety,8);box(control,'console shelf',0,1.23,.56,1.42,.09,.46,mats.steel);box(control,'control sign',0,2.55,-.03,1.45,.46,.12,mats.safety);
const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=128;const sctx=signCanvas.getContext('2d');sctx.fillStyle='#d5a448';sctx.fillRect(0,0,512,128);sctx.fillStyle='#17211e';sctx.font='bold 34px monospace';sctx.fillText('DRILL CONTROL',28,55);sctx.font='22px monospace';sctx.fillText('E  /  OPERATIONS',28,94);const signFace=new THREE.Mesh(new THREE.PlaneGeometry(1.38,.42),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(signCanvas)}));signFace.position.set(0,2.55,.105);control.add(signFace);
// Accessible science lab and oil depot, built as open-front interiors.
function makeSign(label,subtitle,color='#d0eb86'){const c=document.createElement('canvas');c.width=640;c.height=180;const g=c.getContext('2d');g.fillStyle='#192522';g.fillRect(0,0,640,180);g.fillStyle=color;g.fillRect(0,0,10,180);g.fillStyle='#f0f3e7';g.font='bold 43px monospace';g.fillText(label,30,78);g.fillStyle='#aab9aa';g.font='22px monospace';g.fillText(subtitle,32,126);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:texture});}
function building(x,z,title,subtitle,wallMat){const g=new THREE.Group();g.position.set(x,0,z);world.add(g);box(g,'building foundation',0,.12,0,8.5,.28,8,mats.concrete);box(g,'rear wall',0,2.7,-3.85,8.5,5.1,.3,wallMat);box(g,'left wall',-4.1,2.7,0,.3,5.1,7.7,wallMat);box(g,'right wall',4.1,2.7,0,.3,5.1,7.7,wallMat);box(g,'front wing',-2.85,2.7,3.83,2.6,5.1,.3,wallMat);box(g,'front wing',2.85,2.7,3.83,2.6,5.1,.3,wallMat);box(g,'door header',0,4.87,3.83,3.3,.75,.32,mats.dark);box(g,'roof',0,5.35,0,9,.35,8.5,mats.dark);for(let i=0;i<4;i++)box(g,'roof rib',-3.4+i*2.25,5.57,0,.1,.12,8.35,mats.steelLite);for(const side of [-1,1]){box(g,'front window',side*2.87,3.18,4.02,1.35,1.2,.06,mats.glass);box(g,'window sill',side*2.87,2.55,4.04,1.45,.09,.15,mats.steel);}box(g,'fascia',0,4.45,4.04,5.3,.12,.08,mats.safety);const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.3,.92),makeSign(title,subtitle));sign.position.set(0,4.02,4.04);g.add(sign);const lamp=new THREE.PointLight(0xffdba0,22,12,2);lamp.position.set(0,4.2,0);g.add(lamp);for(const side of [-1,1]){box(g,'interior bench',side*2.8,1.3,-1.8,1.55,.18,2.8,mats.dark);for(let y of [1.65,2.45])box(g,'shelf',side*2.8,y,-1.8,1.4,.09,2.4,mats.steelLite);}return g;}
const lab=building(14,-1,'SCIENCE LAB','GEOLOGY & MATERIALS','#68766f');
for(let i=0;i<5;i++){const col=[mats.sand,mats.rock,mats.red,mats.safety,mats.lime][i];cylinder(lab,'core sample',-2.8,1.92,-2.62+i*.42,.105,.105,.42,col,10);}
box(lab,'lab workbench',0,1.06,-2.4,3.4,.18,1.15,mats.wood);for(let i=0;i<3;i++){box(lab,'monitor',-.85+i*.85,1.72,-2.72,.62,.45,.08,mat(0x263e39,.25,.3));box(lab,'monitor display',-.85+i*.85,1.73,-2.67,.51,.31,.015,mat(i===1?0x8db370:0x5c9e8d,.3));}
const shop=building(24,-1,'SLOW BURN','OIL & EQUIPMENT','#75634e');box(shop,'sales counter',0,1.15,1.3,4.8,1.3,.75,mats.wood);box(shop,'counter cap',0,1.84,1.28,5,.12,.9,mats.safety);for(let x of [-2.7,-1.6,1.6,2.7]){cylinder(shop,'oil drum',x,.95,-1.5,.38,.38,1.25,mat(0x40534b,.45,.38),16);cylinder(shop,'drum lid',x,1.6,-1.5,.4,.4,.11,mats.steelLite,16);box(shop,'drum band',x,1.2,-1.5,.79,.09,.79,mats.safety).rotation.y=Math.PI/4;box(shop,'oil shelf item',x,2.2,-3.1,.55,.5,.5,mat(0x455b4d));}
// Site approach, boundary fence, bollards, lights, and small industrial detail.
for(let x=-21;x<=21;x+=3){if(Math.abs(x)<4||Math.abs(x-14)<5||Math.abs(x-24)<5)continue;box(world,'fence post',x,1.25,-19,.13,2.5,.13,mats.steel);}for(let z=-19;z<18;z+=3){box(world,'fence rail',-21,1.55,z,.12,.12,3,mats.steel);box(world,'fence rail',21,1.55,z,.12,.12,3,mats.steel);}
for(const x of [-7,7,10,19,29])cylinder(world,'site bollard',x,.55,10,.12,.12,1.1,mats.safety,10);
for(const [x,z] of [[-8,-7],[8,-7],[31,8],[-11,8]]){beam(world,[x,.1,z],[x,7,z],.09,mats.dark);beam(world,[x,7,z],[x+1,7,z],.06,mats.dark);const lamp=new THREE.PointLight(0xffdda2,8,13);lamp.position.set(x+1,6.8,z);world.add(lamp);sphere(world,'lamp housing',x+1,6.8,z,.18,mats.lime,10);}
for(let i=0;i<5;i++){const x=-8+i*2;beam(world,[x,.2,3.6],[x,.2,5.2],.06,mats.safety);}for(const [x,z] of [[-7,1],[-7,2.2],[7,-2],[9,-2]]){box(world,'equipment crate',x,.65,z,1.15,1.3,1.15,mats.wood);box(world,'crate band',x,.67,z,1.18,.09,1.18,mats.safety).rotation.y=Math.PI/4;}
const hose=cylinder(world,'oil transfer hose',-3.4,1.2,2.9,.08,.08,3.7,mat(0x232b28,.8),12);hose.rotation.x=Math.PI/2;
function worldLabel(text,x,y,z,color='#d4ed9a'){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='rgba(12,21,16,.82)';ctx.fillRect(0,0,512,96);ctx.fillStyle=color;ctx.font='bold 30px monospace';ctx.fillText(text,20,60);const tx=new THREE.CanvasTexture(c);const m=new THREE.Mesh(new THREE.PlaneGeometry(3.4,.62),new THREE.MeshBasicMaterial({map:tx,transparent:true,side:THREE.DoubleSide}));m.position.set(x,y,z);world.add(m);return m;}
worldLabel('01 // DRILL OPERATIONS',0,13.4,-1);worldLabel('02 // RESEARCH',14,7,-1);worldLabel('03 // SUPPLY DEPOT',24,7,-1);
const strata=[
 {name:'Surface Soil',color:0xb68c5b,depth:[0,20],seconds:16,hard:1,reward:0},
 {name:'Dirt & Clay',color:0x9b6849,depth:[20,55],seconds:18,hard:1,reward:140},
 {name:'Limestone',color:0xb9a880,depth:[55,140],seconds:19,hard:1,reward:190},
 {name:'Stone',color:0x7d817c,depth:[140,400],seconds:20,hard:1,reward:250},
 {name:'Coal Deposits',color:0x373a38,depth:[400,900],seconds:21,hard:1,reward:420},
 {name:'Iron Deposits',color:0x986149,depth:[900,1800],seconds:23,hard:2,reward:520},
 {name:'Gold Deposits',color:0xc9a64a,depth:[1800,3000],seconds:23,hard:3,reward:700},
 {name:'Diamond Deposits',color:0x8bcbd0,depth:[3000,4000],seconds:24,hard:4,reward:950},
 {name:'Deep Mantle',color:0x9a4935,depth:[4000,4500],seconds:25,hard:4,reward:1200},
 {name:'Magma Zone',color:0xf06431,depth:[4500,5000],seconds:27,hard:5,heat:2,reward:1500},
 {name:"Earth's Outer Core",color:0xeea43b,depth:[5000,5600],seconds:30,hard:5,heat:3,reward:1800},
 {name:"Earth's Inner Core",color:0xf4d16b,depth:[5600,6371000],seconds:34,hard:5,heat:4,reward:0}
];
const state={money:1250,oil:0,maxOil:100,carrying:0,carryingVisible:null,running:false,started:false,paused:false,stage:0,stageTime:0,depth:0,efficiency:1,power:1,speed:1,capacityLevel:1,eff:1,heat:1,durability:1,inventory:0,modal:null,jump:0,playerY:0,velY:0,yaw:0,pitch:.16,walk:0,toastTimer:0,animTime:0,won:false};
const upgradeData={power:{label:'Drill Power',symbol:'↗',desc:'Break tougher formations and unlock deep strata.'},speed:{label:'Drill Speed',symbol:'»',desc:'Shorten the time needed to cross each layer.'},capacityLevel:{label:'Oil Capacity',symbol:'▤',desc:'Expand the rig reservoir for longer drilling runs.'},eff:{label:'Oil Efficiency',symbol:'◉',desc:'Reduce operating oil consumption per minute.'},heat:{label:'Heat Resistance',symbol:'♨',desc:'Shield the drill through mantle and magma.'},durability:{label:'Drill Durability',symbol:'⬡',desc:'Improve uptime and rig reliability under load.'}};
const upgradeKeys=['power','speed','capacityLevel','eff','heat','durability'];
const depths=[0,20,55,140,400,900,1800,3000,4000,4500,5000,5600,6371000];
const oilPortWorld=new THREE.Vector3(-2.5,5.42,.1),controlWorld=new THREE.Vector3(3.55,0,4.9),labWorld=new THREE.Vector3(14,0,4.2),shopWorld=new THREE.Vector3(24,0,4.2);
const bore=new THREE.Group();bore.position.set(0,0,-1);world.add(bore);cylinder(bore,'bore darkness',0,.02,0,1.05,1.12,.08,mat(0x171b18),32);cylinder(bore,'bore lip',0,.08,0,1.35,1.35,.13,mats.steel,24);
const boreGlow=new THREE.PointLight(0xff6a38,0,8,2);boreGlow.position.set(0,-.8,0);bore.add(boreGlow);
const particleMat=new THREE.MeshBasicMaterial({color:0xd9a76b,transparent:true,opacity:.85});const particles=[];
for(let i=0;i<36;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.07+Math.random()*.1,0),particleMat.clone());m.visible=false;world.add(m);particles.push({mesh:m,life:0,vel:new THREE.Vector3()});}
// Held container is attached to the camera so the purchased barrel is visibly carried.
const heldCan=new THREE.Group();camera.add(heldCan);heldCan.position.set(.45,-.48,-.9);heldCan.rotation.set(.08,-.2,-.18);
cylinder(heldCan,'can body',0,0,0,.2,.24,.46,mat(0x4c5f52,.4,.3),16);cylinder(heldCan,'can shoulder',0,.24,0,.15,.2,.1,mats.steelLite,16);cylinder(heldCan,'can cap',0,.31,0,.065,.065,.08,mats.safety,12);for(let y of [-.1,.12])cylinder(heldCan,'can seam',0,y,0,.245,.245,.025,mats.steelLite,16);box(heldCan,'can label',0,.02,.205,.24,.2,.018,mats.lime,false);heldCan.visible=false;
const player={pos:new THREE.Vector3(0,0,14),velocity:new THREE.Vector3(),keys:{}};
function floorAt(x,z){if(x>-5.9&&x<-2.7&&z>-2.25&&z<8.65){return Math.max(.02,.04+(8.5-z)*.46);}if(x>-4.05&&x<-1.05&&z>-2.35&&z<1.7)return 5.25;return 0;}
function showToast(message){const t=$('toast');t.textContent=message;t.classList.add('show');state.toastTimer=2.6;}
function updateObjective(){let text='Inspect the rig',sub='Head to the drill control panel';if(state.won){text='Core reached';sub='The deepest frontier is yours.';}else if(state.carrying>0){text='Refill the rig';sub='Carry your oil to the top hatch';}else if(state.oil<=0){text='Buy an oil drum';sub='Visit Slow Burn to stock up';}else if(state.stage===0&&!state.running){text='Start the drill';sub='Use the operations console';}else if(state.running){text=`Drilling · ${strata[state.stage].name}`;sub='Keep the drill supplied with oil';}else if(state.stage>0){text='Upgrade the drill';sub='Research a stronger bit at the lab';} $('objective').textContent=text;$('objective-sub').textContent=sub;}
function updateHUD(){const layer=strata[Math.min(state.stage,strata.length-1)],f=state.stage>=12?1:Math.min(1,(state.stage+state.stageTime/layer.seconds)/12);const depth=state.stage>=12?6371000:Math.round(depths[state.stage]+(depths[state.stage+1]-depths[state.stage])*(state.stageTime/layer.seconds));state.depth=depth;$('depth').textContent=depth.toLocaleString('en-US');$('layer-chip').textContent=String(Math.min(12,state.stage+1)).padStart(2,'0');$('layer-name').textContent=state.stage>=12?'Earth’s Inner Core':layer.name;$('depth-fill').style.width=`${f*100}%`;$('depth-percent').textContent=`${(f*100).toFixed(1)}%`;$('money').textContent=Math.floor(state.money).toLocaleString('en-US');$('oil-current').textContent=state.oil.toFixed(0);$('oil-max').textContent=state.maxOil;$('oil-fill').style.width=`${Math.min(100,state.oil/state.maxOil*100)}%`;$('oil-state').textContent=state.oil<=0?'EMPTY':state.oil<10?'LOW':state.oil<30?'RESERVE':'READY';$('oil-state').classList.toggle('ready',state.oil>=30);$('oil-rate').textContent=`${(4.8/state.eff).toFixed(1)} L / MIN`;$('rig-status').textContent=state.running?'DRILLING':state.won?'CORE REACHED':state.stage>0?'STANDBY':'STANDBY';$('rig-detail').textContent=state.running?'Rotary drive engaged · nominal load':state.oil<=0?'Oil reserve depleted':state.stage>=12?'Mission complete':state.stage===0?'Awaiting start command':'Ready for restart';$('status-light').classList.toggle('running',state.running);$('status-symbol').classList.toggle('running',state.running);$('status-symbol').textContent=state.running?'↻':'Ⅱ';$('power-stat').innerHTML=`${String(state.power).padStart(2,'0')} <i>LVL</i>`;$('speed-stat').innerHTML=`${String(state.speed).padStart(2,'0')} <i>LVL</i>`;updateObjective();}
updateHUD();
function dist2(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function nearestAction(){const p={x:player.pos.x,z:player.pos.z};const pts=[['control',controlWorld,3.2],['lab',labWorld,4.4],['shop',shopWorld,4.4],['refill',oilPortWorld,2.4]];let best=null,bd=Infinity;for(const [id,v,r] of pts){const d=dist2(p,v);if(d<r&&d<bd){best=id;bd=d;}}return best;}
function interactionText(id){return ({control:state.running?'E  STOP DRILL':'E  DRILL CONTROLS',lab:'E  RESEARCH UPGRADES',shop:state.carrying?'E  SUPPLY DEPOT':'E  BUY OIL & TANKS',refill:'E  REFILL RESERVOIR'})[id]||'';}
function openModal(html,title){state.modal=title;$('modal-content').innerHTML=html;$('modal-layer').classList.remove('hidden');if(document.pointerLockElement)document.exitPointerLock();}
function closeModal(){state.modal=null;$('modal-layer').classList.add('hidden');if(state.started&&!state.paused)canvas.requestPointerLock?.();}
function modalShell(kicker,title,lede,body){return `<button class="modal-close" data-close>ESC / CLOSE</button><div class="modal-kicker">${kicker}</div><h2>${title}</h2><p class="modal-lede">${lede}</p>${body}`;}
function openShop(){
 const body=`<div class="balance-strip"><span>FIELD ACCOUNT</span><b>$${Math.floor(state.money).toLocaleString()}</b></div>
 <div class="shop-item"><div class="item-icon">◉</div><div class="item-copy"><b>Portable oil drum</b><small>50 L · carry to the rig's top refill port</small></div><button class="buy-button" data-buy="oil" ${state.carrying||state.money<150?'disabled':''}>$150 · BUY</button></div>
 <div class="shop-item"><div class="item-icon">▤</div><div class="item-copy"><b>Reservoir tank expansion</b><small>+50 L rig capacity · permanent installation</small></div><button class="buy-button" data-buy="tank" ${state.money<350||state.capacityLevel>=5?'disabled':''}>$350 · BUY</button></div>
 <div class="inventory-note"><strong>${state.carrying?`CARRYING ${state.carrying} L`:'NO DRUM IN HANDS'}</strong><span>— ${state.carrying?'deliver it to the illuminated hatch':'buy a drum, then carry it to the rig'}</span></div>`;
 openModal(modalShell('SLOW BURN / FIELD SUPPLIES','Stock up for the deep','Oil is purchased in a portable 50-liter drum. Carry it to the illuminated refill hatch at the top of the rig.',body),'shop');
}
function upgradeCost(key){const lvl=state[key];return Math.round(({power:230,speed:210,capacityLevel:260,eff:240,heat:280,durability:190}[key])*(1+Math.max(0,lvl-1)*.72));}
function openLab(){let items='';for(const key of upgradeKeys){const lvl=state[key],max=key==='capacityLevel'?5:key==='heat'?5:5,cost=upgradeCost(key),locked=(key==='heat'&&state.stage<7);items+=`<div class="upgrade-item"><div class="upgrade-symbol">${upgradeData[key].symbol}</div><div class="upgrade-copy"><b>${upgradeData[key].label} <small style="color:#93a095;font:9px var(--mono)">LV ${lvl}/${max}</small></b><p>${upgradeData[key].desc}${locked?' Unlocks at Diamond Deposits.':''}</p><div class="level-pips">${Array.from({length:max},(_,i)=>`<i class="${i<lvl?'active':''}"></i>`).join('')}</div></div><button class="upgrade-button" data-upgrade="${key}" ${lvl>=max||state.money<cost||locked?'disabled':''}>${lvl>=max?'MAX':locked?'LOCKED':`$${cost}`}</button></div>`;}
 openModal(modalShell('FIELD RESEARCH / SCIENCE LAB','Improve your equipment','Invest mined-resource credits in a permanent upgrade. Deeper layers demand stronger power and heat protection.',`<div class="balance-strip"><span>FIELD ACCOUNT</span><b>$${Math.floor(state.money).toLocaleString()}</b></div>${items}`),'lab');
}
function openRig(){const body=`<div class="balance-strip"><span>DEPTH / CURRENT STRATUM</span><b>${state.depth.toLocaleString()} M · ${strata[Math.min(state.stage,11)].name}</b></div><div class="shop-item"><div class="item-icon">${state.running?'Ⅱ':'↻'}</div><div class="item-copy"><b>${state.running?'Drill operating':'Drill controls'}</b><small>${state.running?'Stop the rig before servicing it.':`Oil: ${state.oil.toFixed(0)} / ${state.maxOil} L · Power: ${state.power} · Heat: ${state.heat}`}</small></div><button class="buy-button" data-drill>${state.running?'STOP DRILL':'START DRILL'}</button></div><div class="inventory-note">${state.running?'A running drill consumes oil and advances the bore.':state.oil<=0?'No oil in reservoir. Visit Slow Burn and carry a drum up to the hatch.':`Ready to drill. The current layer takes approximately ${Math.max(5,Math.round(strata[Math.min(state.stage,11)].seconds/state.speed))} seconds.`}</div>`;openModal(modalShell('RIG 01 / OPERATIONS','Drill control','Operate the rotary drive and monitor the bore. Drilling stops automatically when the reservoir is empty.',body),'rig');}
function interact(id=nearestAction()){
 if(!id)return;
 if(id==='shop'){openShop();return;}if(id==='lab'){openLab();return;}if(id==='control'){openRig();return;}
 if(id==='refill'){
  if(state.carrying<=0){showToast('No oil drum in hand. Purchase one at Slow Burn.');return;}
  const added=Math.min(state.carrying,state.maxOil-state.oil);if(added<=0){showToast('Reservoir is already full.');return;}
  state.oil+=added;state.carrying-=added;if(!state.carrying){heldCan.visible=false;}updateHUD();showToast(`Reservoir refilled · +${added} L`);return;
 }
}
function startDrill(){
 if(state.running){state.running=false;showToast('Drill stopped · operations on standby.');}
 else if(state.won){showToast('Core reached — mission complete.');}
 else if(state.oil<=0){showToast('No oil available. Visit Slow Burn to resupply.');}
 else {const layer=strata[Math.min(state.stage,11)];if(state.power<layer.hard){showToast(`Power level ${layer.hard} required for ${layer.name}. Visit the lab.`);return;}if(layer.heat&&state.heat<layer.heat){showToast(`Heat resistance level ${layer.heat} required for ${layer.name}.`);return;}state.running=true;showToast('Rotary drive engaged · drilling commenced.');}
 updateHUD();
}
function buyItem(kind){if(kind==='oil'){if(state.carrying){showToast('Carry your current drum to the rig first.');return;}if(state.money<150){showToast('Insufficient funds for an oil drum.');return;}state.money-=150;state.carrying=50;heldCan.visible=true;showToast('Oil drum purchased · carry it to the rig hatch.');openShop();}
 if(kind==='tank'){if(state.money<350||state.capacityLevel>=5)return;state.money-=350;state.capacityLevel++;state.maxOil+=50;updateHUD();showToast(`Reservoir expanded · capacity ${state.maxOil} L.`);openShop();}}
function buyUpgrade(key){const cost=upgradeCost(key),max=5;if(state[key]>=max||state.money<cost)return;if(key==='heat'&&state.stage<7)return;state.money-=cost;state[key]++;if(key==='capacityLevel')state.maxOil+=50;updateHUD();showToast(`${upgradeData[key].label} upgraded to level ${state[key]}.`);openLab();}
$('modal-content').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.hasAttribute('data-close')){closeModal();return;}if(t.hasAttribute('data-buy')){buyItem(t.dataset.buy);return;}if(t.hasAttribute('data-upgrade')){buyUpgrade(t.dataset.upgrade);return;}if(t.hasAttribute('data-drill')){startDrill();openRig();}});
$('modal-layer').addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeModal();});
function playerStart(){state.started=true;state.paused=false;$('welcome').classList.add('hidden');$('hint').style.opacity='1';canvas.requestPointerLock?.();}
$('start-button').addEventListener('click',playerStart);
$('pause-state').addEventListener('click',()=>{state.paused=false;$('pause-state').classList.add('hidden');canvas.requestPointerLock?.();});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&state.started&&!state.modal){state.paused=true;$('pause-state').classList.remove('hidden');}});
document.addEventListener('mousemove',e=>{if(!document.pointerLockElement||state.modal)return;state.yaw-=e.movementX*.0022;state.pitch=Math.max(-.8,Math.min(.8,state.pitch-e.movementY*.0018));});
document.addEventListener('keydown',e=>{if(e.code==='Escape'&&state.modal){closeModal();return;}if(state.modal)return;player.keys[e.code]=true;if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();if(e.code==='KeyE')interact();if(e.code==='Space'&&state.playerY<=.02)state.velY=6.2;});
document.addEventListener('keyup',e=>{player.keys[e.code]=false;});
document.addEventListener('mousedown',e=>{if(!state.started||state.modal||state.paused)return;if(e.button===0){const id=nearestAction();if(id)interact(id);else if(!document.pointerLockElement)canvas.requestPointerLock?.();}});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function updateClock(){const d=new Date();$('clock').textContent=d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true});}
updateClock();
setInterval(updateClock,15000);
const interaction=$('interaction');
const playerHeight=1.68;
function collides(x,z){
 if(Math.abs(x)>39||Math.abs(z)>39)return true;
 // Open-front interiors: walk through the central doorway, but not through the side/rear walls.
 for(const bx of [14,24]){
  const insideX=Math.abs(x-bx)<4.35,insideZ=z>-5.35&&z<2.8;
  if(insideX&&insideZ&&Math.abs(x-bx)>1.65)return true;
 }
 return false;
}
function updateMovement(dt){
 const k=player.keys;let f=(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0),s=(k.KeyD?1:0)-(k.KeyA?1:0);
 const len=Math.hypot(f,s);if(len){f/=len;s/=len;const speed=(k.ShiftLeft||k.ShiftRight?8.2:5.2)*dt,dx=(-Math.sin(state.yaw)*f+Math.cos(state.yaw)*s)*speed,dz=(-Math.cos(state.yaw)*f-Math.sin(state.yaw)*s)*speed;
  if(!collides(player.pos.x+dx,player.pos.z))player.pos.x+=dx;
  if(!collides(player.pos.x,player.pos.z+dz))player.pos.z+=dz;
  state.walk+=dt*(k.ShiftLeft||k.ShiftRight?12:8);
 }
 const floor=floorAt(player.pos.x,player.pos.z);
 if(state.playerY>0||state.velY>0){state.velY-=18*dt;state.playerY=Math.max(0,state.playerY+state.velY*dt);if(state.playerY===0)state.velY=0;}
 // Keep the player grounded on the rig's access ramp and service platform.
 state.floor=floor;
 camera.position.set(player.pos.x,floor+playerHeight+state.playerY,player.pos.z);
 camera.rotation.order='YXZ';camera.rotation.y=state.yaw;camera.rotation.x=state.pitch;
 const action=nearestAction();interaction.classList.toggle('visible',Boolean(action)&&state.started&&!state.paused&&!state.modal);$('interaction-label').textContent=interactionText(action);
}
function emitDebris(){
 for(let i=0;i<particles.length;i++){const p=particles[i];if(p.life>0)continue;p.life=.55+Math.random()*.7;p.mesh.visible=true;p.mesh.position.set((Math.random()-.5)*1.6,.5+Math.random()*1.5,-1+(Math.random()-.5)*1.5);p.vel.set((Math.random()-.5)*1.8,1+Math.random()*2,(Math.random()-.5)*1.8);break;}
}
function updateParticles(dt){for(const p of particles){if(p.life<=0)continue;p.life-=dt;p.vel.y-=4*dt;p.mesh.position.addScaledVector(p.vel,dt);p.mesh.material.opacity=Math.max(0,p.life);if(p.life<=0)p.mesh.visible=false;}}
function finishLayer(){
 const layer=strata[state.stage];state.money+=layer.reward;state.stage++;state.stageTime=0;state.running=false;state.depth=depths[Math.min(state.stage,12)];
 if(state.stage>=12){state.won=true;state.oil=Math.max(0,state.oil);showToast('EARTH’S INNER CORE REACHED · MISSION COMPLETE');$('radio-message').textContent='FIELD RADIO · Core sample secured. Shift complete.';}
 else {showToast(`${layer.name} crossed · resource credit +$${layer.reward.toLocaleString()}`);$('radio-message').textContent=`FIELD RADIO · ${strata[state.stage].name} detected below.`;}
 updateHUD();
}
function updateDrilling(dt){
 if(!state.running)return;
 const layer=strata[state.stage];state.stageTime+=dt*state.speed*(1+(state.durability-1)*.025);
 state.oil=Math.max(0,state.oil-dt*(4.8/60)/state.eff);
 rotary.rotation.y+=dt*9;shaftGroup.rotation.y+=dt*12;bit.rotation.y+=dt*16;boreGlow.intensity=2.5+Math.sin(state.animTime*10)*1.2;
 if(Math.random()<dt*8)emitDebris();
 if(state.oil<=0){state.running=false;showToast('Oil reserve depleted · drill automatically shut down.');$('radio-message').textContent='FIELD RADIO · Oil pressure lost. Resupply at the rig hatch.';}
 if(state.stageTime>=layer.seconds){finishLayer();}
}
function updateAnimations(dt){
 state.animTime+=dt;const running=state.running;
 if(!running){rotary.rotation.y*=.9;shaftGroup.rotation.y*=.9;bit.rotation.y*=.9;boreGlow.intensity=Math.max(0,boreGlow.intensity-dt*3);}
 hatchGlow.material.opacity=.52+Math.sin(state.animTime*3)*.22;
 for(const p of particles)if(p.life>0)p.mesh.material.opacity=Math.min(1,p.life*1.5);
 if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)$('toast').classList.remove('show');}
}
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.05);if(state.started&&!state.paused&&!state.modal){updateMovement(dt);updateDrilling(dt);}else if(state.started){camera.position.set(player.pos.x,(state.floor||0)+playerHeight+state.playerY,player.pos.z);camera.rotation.order='YXZ';camera.rotation.y=state.yaw;camera.rotation.x=state.pitch;}
 updateAnimations(dt);updateParticles(dt);
 if(state.running&&Math.floor(state.animTime*4)!==Math.floor((state.animTime-dt)*4))updateHUD();
 renderer.render(scene,camera);
}
tick();
