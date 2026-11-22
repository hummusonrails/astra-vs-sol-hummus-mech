import * as T from './vendor/three.module.js';
import {city,data,ground,blocked,clamp} from './world.js';
import {makeMech} from './mech.js';
const $=s=>document.getElementById(s),view=$('view'),scene=new T.Scene();
let renderer;
try{renderer=new T.WebGLRenderer({canvas:view,antialias:true,powerPreference:'high-performance'})}catch(e){window.failGame('WebGL 2 is unavailable. Enable hardware acceleration or try a WebGL-capable browser.')}
if(renderer)start();
function start(){
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.55));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;
 const camera=new T.PerspectiveCamera(53,1,.12,2300);function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}resize();addEventListener('resize',resize);
 scene.fog=new T.FogExp2(0xe5ccac,.00285);scene.add(new T.HemisphereLight(0xfff4df,0xb9b297,1.65));
 const sun=new T.DirectionalLight(0xffdfac,2.3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-43,right:43,top:43,bottom:-43,near:1,far:220});sun.shadow.bias=-.00045;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
 const sky=new T.Mesh(new T.SphereGeometry(1700,48,24),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 dir;void main(){vec3 d=normalize(dir);float a=max(d.y,0.);vec3 col=mix(vec3(.94,.83,.68),vec3(.30,.62,.79),pow(a,.52));float s=max(dot(d,normalize(vec3(-.75,.29,-.55))),0.);col+=vec3(.54,.28,.06)*pow(s,24.)+vec3(1.,.8,.55)*smoothstep(.99955,.99985,s);gl_FragColor=vec4(col,1.);}`}));
 scene.add(sky);city(scene);
 const mech=makeMech(scene),root=mech.root,keys=new Set(),motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const effect=new T.Mesh(new T.RingGeometry(.85,1,80),new T.MeshBasicMaterial({color:0xfad598,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide}));effect.rotation.x=-Math.PI/2;effect.visible=false;scene.add(effect);
 let x,z,yaw,orbit,pitch,phase=0,stomp=-1,impact=-1,impacts=0,gait=0,last=performance.now(),snap=true,drag=false,mode='EXPLORING',mapTime=0;
 function reset(){x=58;z=-11;yaw=-.4;orbit=.18;pitch=.21;keys.clear();phase=0;gait=0;stomp=impact=-1;effect.visible=false;snap=true}
 reset();
 addEventListener('keydown',e=>{if(!['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','KeyR','Space'].includes(e.code))return;e.preventDefault();keys.add(e.code);if(!e.repeat&&e.code==='KeyR')reset();if(!e.repeat&&e.code==='Space'&&stomp<0){stomp=0}});
 addEventListener('keyup',e=>keys.delete(e.code));function clear(){keys.clear();drag=false}addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});
 view.onpointerdown=e=>{drag=true;view.setPointerCapture(e.pointerId)};view.onpointerup=view.onpointercancel=()=>drag=false;view.onpointermove=e=>{if(drag){orbit-=e.movementX*.006;pitch=clamp(pitch+e.movementY*.005,.13,.88)}};
 view.addEventListener('webglcontextlost',e=>{e.preventDefault();window.failGame('Graphics context lost. Reload to resume exploring.');renderer.setAnimationLoop(null)});
 const map=$('map'),mc=map.getContext('2d'),mapBG=document.createElement('canvas');mapBG.width=760;mapBG.height=734;let bc=mapBG.getContext('2d');bc.translate(380,367);bc.fillStyle='#e4dec9';bc.fillRect(-380,-367,760,734);
 function drawPaths(list,color,fill,line=1){bc.strokeStyle=bc.fillStyle=color;bc.lineWidth=line;for(let item of list){bc.beginPath();item.p.forEach(([a,b],i)=>i?bc.lineTo(a,b):bc.moveTo(a,b));if(fill)bc.fill();else bc.stroke()}}
 drawPaths(data.areas,'#b4bea0',true);drawPaths(data.buildings,'#c3baa6',true);drawPaths(data.roads,'#f7f0dc',false,4);drawPaths(data.roads.filter(r=>r.k==='tertiary'||r.k==='secondary'),'#a89170',false,3);
 function hud(){mc.fillStyle='#e4dec9';mc.fillRect(0,0,330,210);mc.drawImage(mapBG,380+x-126,367+z-80,252,160,0,0,330,210);mc.save();mc.translate(165,105);mc.rotate(-yaw);mc.fillStyle='#ac452d';mc.strokeStyle='#fff3cc';mc.lineWidth=3;mc.beginPath();mc.moveTo(0,-12);mc.lineTo(8,8);mc.lineTo(0,5);mc.lineTo(-8,8);mc.closePath();mc.fill();mc.stroke();mc.restore();
 $('coords').textContent=(31.9017-z/111320).toFixed(4)+'° N  '+(35.0062+x/94510).toFixed(4)+'° E';
 let best=10000,name='Central district';for(let r of data.roads){if(!r.n)continue;for(let i=1;i<r.p.length;i++){let [a,b]=r.p[i-1],[c,d]=r.p[i],dx=c-a,dz=d-b,k=clamp(((x-a)*dx+(z-b)*dz)/(dx*dx+dz*dz||1),0,1),dist=(x-a-k*dx)**2+(z-b-k*dz)**2;if(dist<best){best=dist;name=r.n}}}$('street').textContent=name;
 }
 const target=new T.Vector3(),desired=new T.Vector3(),look=new T.Vector3();
 const has=(a,b)=>keys.has(a)||keys.has(b)?1:0;
 function frame(now){
 let dt=Math.min(.06,Math.max(0,(now-last)/1000));last=now;
 let turn=has('KeyA','ArrowLeft')-has('KeyD','ArrowRight'),speed=has('KeyW','ArrowUp')-has('KeyS','ArrowDown');
 yaw+=turn*dt*1.65;if(stomp>=0)speed=0;
 let nextX=x-Math.sin(yaw)*speed*dt*8,nextZ=z-Math.cos(yaw)*speed*dt*8;
 if(!blocked(nextX,z))x=nextX;if(!blocked(x,nextZ))z=nextZ;
 gait=T.MathUtils.damp(gait,Math.abs(speed)||Math.abs(turn)*.4,11,dt);phase+=dt*(speed<0?-1:1)*7.3*gait;
 let lift=0;if(stomp>=0){stomp+=dt;if(stomp<.42)lift=Math.sin(stomp/.42*1.57)*.95;else if(stomp<.58)lift=.95*(1-(stomp-.42)/.16);else if(impact<0&&stomp<.67){impact=0;impacts++;effect.visible=true;effect.position.set(x,ground(x,z)+.34,z)}if(stomp>.98)stomp=-1}
 if(impact>=0){impact+=dt;effect.scale.setScalar(.7+impact*13);effect.material.opacity=Math.max(0,.8-impact);if(impact>.82){impact=-1;effect.visible=false}}
 let y=ground(x,z)+.23;root.position.set(x,y,z);root.rotation.y=yaw;
 mech.body.position.y=2.9+lift*.42+Math.abs(Math.cos(phase))*.09*gait;mech.body.rotation.z=Math.sin(phase)*.055*gait;mech.body.rotation.x=-.04*speed;
 mech.legs.forEach(({hip,knee,foot,side})=>{let s=Math.sin(phase+(side<0?Math.PI:0))*gait,bend=Math.max(0,Math.cos(phase+(side<0?Math.PI:0)))*gait;hip.rotation.x=s*.36+bend*.19+(side===1?lift*.82:0);knee.rotation.x=-bend*.62-(side===1?lift*1.22:0);foot.rotation.x=-hip.rotation.x-knee.rotation.x;hip.position.y=2.94+Math.abs(s)*.04});
 target.set(x,y+2.9,z);let a=yaw+orbit,dist=10.8;for(let t=.65;t<dist;t+=.35){if(blocked(x+Math.sin(a)*t,z+Math.cos(a)*t,.25)){dist=Math.max(1.5,t-.4);break}}
 desired.set(x+Math.sin(a)*dist,Math.max(y+3.1+Math.tan(pitch)*dist,ground(x+Math.sin(a)*dist,z+Math.cos(a)*dist)+1.1),z+Math.cos(a)*dist);
 if(snap||blocked(camera.position.x,camera.position.z,.2)){camera.position.copy(desired);snap=false}else camera.position.lerp(desired,1-Math.exp(-dt*10));
 look.copy(target);if(motion&&impact>=0&&impact<.23)look.y+=Math.sin(impact*74)*(.23-impact)*.55;camera.lookAt(look);sky.position.copy(camera.position);sun.target.position.set(x,y,z);sun.position.set(x-67,y+57,z+53);
 mode=stomp>=0?'STOMP CYCLE':speed?'WALKING':'EXPLORING';$('status').textContent=mode;mapTime-=dt;if(mapTime<=0){hud();mapTime=.18}
 window.walkerState={x,z,yaw,orbit,phase,stomp,impacts,held:keys.size};renderer.render(scene,camera);
 }
 renderer.setAnimationLoop(frame);$('loading').hidden=true;
}
