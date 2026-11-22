import * as T from 'three';
import {makeMech} from './mech.js';
import {makeWorld} from './world.js';
import './style.css';

const status=document.querySelector('#status');
function fail(message){
  status.hidden=false;status.querySelector('p').textContent=message;
}
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const keys=new Set();
const movement=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Space','KeyR']);
const clamp=T.MathUtils.clamp, lerp=T.MathUtils.lerp;
const angle=(value)=>Math.atan2(Math.sin(value),Math.cos(value));

async function launch(){
  const canvas=document.createElement('canvas');
  const gl=canvas.getContext('webgl2',{antialias:true,alpha:false});
  if(!gl){fail('This experience needs WebGL 2. Try a browser with hardware acceleration enabled.');return;}
  const response=await fetch(import.meta.env.BASE_URL+'data/district.json');
  if(!response.ok)throw new Error('District data returned '+response.status);
  const data=await response.json();
  const renderer=new T.WebGLRenderer({canvas,context:gl,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  document.querySelector('#world').append(canvas);

  const scene=new T.Scene();
  const haze=new T.Color('#c9ccb0');
  scene.fog=new T.FogExp2(haze,.0022);
  const sky=new T.Mesh(new T.SphereGeometry(1300,32,16),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,uniforms:{
      high:{value:new T.Color('#68a3bc')}, low:{value:haze},sun:{value:new T.Vector3(-.68,.36,.38).normalize()}
    },
    vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 high,low,sun;
      varying vec3 v;
      void main(){
        vec3 ray=normalize(v); float altitude=max(0.,ray.y);
        vec3 c=mix(low,high,smoothstep(0.,.64,altitude));
        float flare=max(0.,dot(ray,sun));
        c+=vec3(.32,.17,.07)*pow(flare,12.)+vec3(1.,.68,.33)*smoothstep(.9992,.9997,flare);
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`
  }));
  scene.add(sky,new T.HemisphereLight('#e7f4ff','#a58c58',2.12));
  const sun=new T.DirectionalLight('#ffdfad',2.55);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-89,right:89,top:89,bottom:-89,near:5,far:320});
  sun.shadow.bias=-.00035;sun.shadow.normalBias=.20;sun.shadow.radius=2.6;
  scene.add(sun,sun.target);

  const world=makeWorld(scene,data), mech=makeMech(scene);
  const camera=new T.PerspectiveCamera(51,1,.25,1700);
  const target=new T.Vector3(), desired=new T.Vector3(), cameraPos=new T.Vector3();
  const spawn={x:89,z:34,heading:-1.91};
  const state={x:spawn.x,z:spawn.z,heading:spawn.heading,orbit:-.53,pitch:.29,phase:0,stomp:-1,shake:0,distance:0,stomps:0};
  const feet=[{z:0,y:0},{z:0,y:0}];
  let stride=0, impact=false, drag=null, mapClock=0, cameraReady=false, stopped=false;
  const effects=[];
  const ringGeometry=new T.RingGeometry(.83,1,64);ringGeometry.rotateX(-Math.PI/2);
  const debrisGeometry=new T.IcosahedronGeometry(.18,0);
  function dust(x,z){
    const ring=new T.Mesh(ringGeometry,new T.MeshBasicMaterial({color:'#f3cc85',transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide}));
    ring.position.set(x,world.height(x,z)+.34,z);scene.add(ring);
    const motes=[];
    const mat=new T.MeshBasicMaterial({color:'#d5b484',transparent:true,opacity:.78,depthWrite:false});
    for(let i=0;i<(reduce.matches?8:25);i++){
      const a=i*2.39996,p=.5+(i%5)*.28;
      const mote=new T.Mesh(debrisGeometry,mat);mote.scale.setScalar(.6+(i%6)*.21);scene.add(mote);
      motes.push([mote,Math.cos(a)*p,Math.sin(a)*p,.8+(i%7)*.28]);
    }
    effects.push({ring,motes,mat,x,z,age:0});
  }
  function effectsFrame(dt){
    for(let i=effects.length-1;i>=0;i--){
      const effect=effects[i], {ring,motes,mat,x,z}=effect,t=(effect.age+=dt),p=t/.72;
      if(p>=1){
        scene.remove(ring,...motes.map(mote=>mote[0]));
        ring.material.dispose();mat.dispose();effects.splice(i,1);continue;
      }
      ring.scale.setScalar(.85+8*p);
      ring.material.opacity=(1-p)**2*.75;
      mat.opacity=(1-p)*.77;
      for(const [mote,dx,dz,v] of motes){
        const px=x+dx*(1+t*5.6),pz=z+dz*(1+t*5.6);
        mote.position.set(px,world.height(px,pz)+.22+Math.max(0,t*v*2.4-t*t*3.7),pz);
        mote.rotation.y=t*4;
      }
    }
  }

  function reset(){
    Object.assign(state,spawn,{orbit:-.53,pitch:.29,phase:0,stomp:-1,shake:0});
    stride=0;keys.clear();cameraReady=false;
    for(const effect of effects)effect.age=1;
  }
  function press(event){
    if(!movement.has(event.code)||event.altKey||event.ctrlKey||event.metaKey||event.target.closest?.('a,button')&&event.code==='Space')return;
    event.preventDefault();
    if(event.code==='KeyR'&&!event.repeat){reset();return;}
    if(event.code==='Space'&&!event.repeat&&state.stomp<0){state.stomp=0;impact=false;}
    keys.add(event.code);
  }
  addEventListener('keydown',press);
  addEventListener('keyup',event=>keys.delete(event.code));
  addEventListener('blur',()=>{keys.clear();drag=null;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();drag=null;}});
  document.querySelector('#reset').addEventListener('click',reset);
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    canvas.setPointerCapture(event.pointerId);drag=[event.clientX,event.clientY];canvas.focus();
  });
  canvas.addEventListener('pointermove',event=>{
    if(!drag)return;
    state.orbit=angle(state.orbit-(event.clientX-drag[0])*.007);
    state.pitch=clamp(state.pitch+(event.clientY-drag[1])*.005,.12,.77);
    drag=[event.clientX,event.clientY];
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>{drag=null;});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stopped=true;keys.clear();fail('The graphics context was lost. Reload to return to the district.');});
  function resize(){
    camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
  }
  addEventListener('resize',resize);resize();

  const map=document.querySelector('#map'), m=map.getContext('2d');
  const backdrop=document.createElement('canvas');backdrop.width=map.width;backdrop.height=map.height;
  const b=backdrop.getContext('2d'), bounds=world.bounds;
  const project=(x,z)=>[(x-bounds.left)/(bounds.right-bounds.left)*map.width,(z-bounds.top)/(bounds.bottom-bounds.top)*map.height];
  b.fillStyle='#374e41';b.fillRect(0,0,map.width,map.height);
  function path(points,fill,outline,width){
    b.beginPath();points.forEach(([x,z],i)=>b[i?'lineTo':'moveTo'](...project(x,z)));
    if(fill){b.closePath();b.fillStyle=fill;b.fill();}
    if(outline){b.strokeStyle=outline;b.lineWidth=width;b.stroke();}
  }
  data.greens.forEach(points=>path(points,'#536848'));
  data.water.forEach(points=>path(points,'#69a7a2'));
  data.buildings.forEach(([points])=>path(points,'#beb292'));
  data.roads.forEach(([kind,,points])=>{
    const big=['primary','secondary','tertiary'].includes(kind);
    path(points,null,big?'#e6c99b':'#b1b594',big?1.15:.38);
  });
  const position=document.querySelector('#position');
  function drawMap(){
    m.drawImage(backdrop,0,0);
    const [x,z]=project(state.x,state.z);
    m.save();m.translate(x,z);m.rotate(-state.heading);
    m.beginPath();m.moveTo(0,-7);m.lineTo(4,4);m.lineTo(0,2);m.lineTo(-4,4);m.closePath();
    m.fillStyle='#ffe1a0';m.strokeStyle='#172b28';m.lineWidth=1.6;m.stroke();m.fill();m.restore();
    const [lon,lat]=data.center,[mx,mz]=data.metersPerDegree;
    position.textContent=(lat-state.z/mz).toFixed(4)+'° N   '+(lon+state.x/mx).toFixed(4)+'° E';
  }

  function walkable(x,z){
    return x>bounds.left+2&&x<bounds.right-2&&z>bounds.top+2&&z<bounds.bottom-2&&!world.blocked(x,z,1.68)&&!world.wet(x,z);
  }
  const held=(key,arrow)=>Number(keys.has(key)||keys.has(arrow));
  function update(dt){
    const turn=held('KeyA','ArrowLeft')-held('KeyD','ArrowRight');
    const move=held('KeyW','ArrowUp')-held('KeyS','ArrowDown');
    if(state.stomp<0)state.heading=angle(state.heading+turn*dt*1.73);
    const oldX=state.x,oldZ=state.z;
    if(move&&state.stomp<0){
      const speed=move>0?9.4:5.1;
      const x=state.x-Math.sin(state.heading)*dt*speed*move,z=state.z-Math.cos(state.heading)*dt*speed*move;
      if(walkable(x,z)){state.x=x;state.z=z;}
      else if(walkable(x,state.z))state.x=x;
      else if(walkable(state.x,z))state.z=z;
    }
    const distance=Math.hypot(state.x-oldX,state.z-oldZ);
    state.distance+=distance;
    stride=lerp(stride,distance>.0001?1:turn&&state.stomp<0?.55:0,1-Math.exp(-dt*12));
    if(stride>.02)state.phase+=distance*1.47+(distance<.001?dt*5:0);
    let bodyY=2.64+(1-Math.abs(Math.sin(state.phase)))*.17*stride;
    const height=world.height(state.x,state.z), sin=Math.sin(state.heading),cos=Math.cos(state.heading);
    for(let i=0;i<2;i++){
      const phase=state.phase+i*Math.PI,foot=feet[i],side=(i===0?-1:1)*.96;
      const swing=Math.sin(phase), step=Math.cos(phase)*.73*stride*(move<0?-1:1);
      foot.z=step;
      foot.y=world.height(state.x+side*cos+step*sin,state.z-side*sin+step*cos)-height+Math.max(0,swing)*.58*stride;
    }
    if(state.stomp>=0){
      state.stomp+=dt;
      const t=state.stomp;
      if(t<=.31){
        feet[0].y+=Math.sin(clamp(t/.31,0,1)*Math.PI*.5)*1.04;
        bodyY-=.12*Math.sin(t/.31*Math.PI*.5);
      }else if(t<.49){
        feet[0].y+=(1-((t-.31)/.18)**2)*1.04;
        bodyY-=.17;
      }else{
        if(!impact){
          impact=true;state.stomps++;
          dust(state.x-.94*cos-.25*sin,state.z+.94*sin-.25*cos);
          state.shake=reduce.matches?0:.21;
        }
        bodyY-=.38*Math.max(0,1-(t-.49)/.26);
        if(t>.84)state.stomp=-1;
      }
    }
    mech.root.position.set(state.x,height+.18,state.z);mech.root.rotation.y=state.heading;
    mech.pose(state.phase,stride,bodyY,feet);
    effectsFrame(dt);

    target.set(state.x,height+2.17,state.z);
    const a=state.heading+state.orbit,d=12.1*Math.cos(state.pitch);
    desired.set(target.x+Math.sin(a)*d,target.y+12.1*Math.sin(state.pitch),target.z+Math.cos(a)*d);
    let camX=desired.x,camZ=desired.z,camY=desired.y;
    for(let i=1;i<=23;i++){
      const k=i/23,x=lerp(target.x,desired.x,k),y=lerp(target.y,desired.y,k),z=lerp(target.z,desired.z,k);
      if(y<world.height(x,z)+.58||world.blocked(x,z,.58,y)){
        const t=Math.max(.12,k-.065);
        camX=lerp(target.x,desired.x,t);camY=lerp(target.y,desired.y,t);camZ=lerp(target.z,desired.z,t);break;
      }
    }
    desired.set(camX,Math.max(camY,world.height(camX,camZ)+.65),camZ);
    if(!cameraReady||cameraPos.distanceTo(target)>desired.distanceTo(target)+.65){cameraPos.copy(desired);cameraReady=true;}
    else cameraPos.lerp(desired,1-Math.exp(-dt*7));
    if(world.blocked(cameraPos.x,cameraPos.z,.46,cameraPos.y))cameraPos.copy(desired);
    camera.position.copy(cameraPos);
    if(state.shake>0){
      state.shake=Math.max(0,state.shake-dt);
      camera.position.y+=Math.sin(state.shake*154)*state.shake*.28;
    }
    camera.lookAt(target);
    sky.position.copy(camera.position);
    sun.target.position.set(state.x,height,state.z);
    sun.position.copy(sun.target.position).add(new T.Vector3(-114,99,64));
    if((mapClock+=dt)>.09){drawMap();mapClock=0;}
    canvas.dataset.x=state.x.toFixed(3);canvas.dataset.z=state.z.toFixed(3);
    canvas.dataset.heading=state.heading.toFixed(3);canvas.dataset.stomps=String(state.stomps);
    canvas.dataset.orbit=state.orbit.toFixed(3);
  }
  reset();update(0);drawMap();
  renderer.render(scene,camera);
  status.hidden=true;
  let last=performance.now();
  function frame(now){
    if(stopped)return;
    const dt=clamp((now-last)/1000,0,.05);last=now;
    update(dt);renderer.render(scene,camera);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

launch().catch(error=>{console.error(error);fail('The district could not load. Reload to try again.');});
