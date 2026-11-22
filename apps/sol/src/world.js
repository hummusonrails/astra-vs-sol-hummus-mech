import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const color = (hex) => new T.Color(hex);
function surfaceTexture(base, fine, scale=1){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,128,128);
  for(let i=0;i<6600;i++){
    ctx.globalAlpha=.035+random(i*3)*.2;ctx.fillStyle=fine[i%fine.length];
    ctx.fillRect(random(i*3+1)*128,random(i*3+2)*128,scale*(1+i%3),scale*(1+i%2));
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=8;
  return texture;
}
const standard=(hex,options={})=>new T.MeshStandardMaterial({color:hex,roughness:.94,...options});
const smooth=(a,b,t)=>T.MathUtils.lerp(a,b,t*t*(3-2*t));
const random=(i)=>((Math.sin(i*127.1+311.7)*43758.5453)%1+1)%1;
const widths={primary:4.9,secondary:4.15,tertiary:4.05,unclassified:3.45,residential:3.3,service:2.2,living_street:2.3,pedestrian:2.7,footway:1.05,path:.95,cycleway:1.15,steps:1.1,track:1.55};
const mainRoads=new Set(['primary','secondary','tertiary','unclassified','residential']);
const isPedestrian=(kind)=>['pedestrian','footway','path','cycleway','steps','track'].includes(kind);

function contains(points,x,z){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,az]=points[i], [bx,bz]=points[j];
    if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
  }
  return inside;
}
function distanceSq(a,b,x,z){
  const dx=b[0]-a[0], dz=b[1]-a[1];
  const t=T.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);
  return (x-a[0]-dx*t)**2+(z-a[1]-dz*t)**2;
}
function polygon(points,y,height){
  const shape=new T.Shape(points.map(([x,z])=>new T.Vector2(x,-z)));
  const geometry=new T.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++) position.setY(i,height?height(position.getX(i),position.getZ(i))+y:y);
  geometry.computeVertexNormals();
  return geometry;
}
function facade(index){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d'), light=['#d7c8ab','#e9dbc0','#d9cfb3','#e5d7b6'][index];
  ctx.fillStyle=light;ctx.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=8){
    for(let x=-16;x<128;x+=16){
      ctx.fillStyle=random(y*23+x+index)<.5?'#fff4d121':'#70543d1b';
      ctx.fillRect(x+(y%16),y,15,7);
    }
    ctx.fillStyle='#88765726';ctx.fillRect(0,y,128,1);
  }
  ctx.fillStyle='#b6a484';ctx.fillRect(24,22,80,77);
  ctx.fillStyle='#584e41';ctx.fillRect(28,25,72,69);
  const glass=ctx.createLinearGradient(32,28,87,89);glass.addColorStop(0,'#849795');glass.addColorStop(.43,'#405557');glass.addColorStop(1,'#2a393a');
  ctx.fillStyle=glass;ctx.fillRect(31,28,66,62);
  ctx.fillStyle='#e4ddbd';ctx.fillRect(60,27,4,64);ctx.fillRect(29,54,69,3);
  ctx.fillStyle='#f5e4bf';ctx.fillRect(20,94,88,7);ctx.fillStyle='#8a7458';ctx.fillRect(20,101,88,3);
  ctx.fillStyle='#f3e5cc';ctx.fillRect(0,118,128,5);ctx.fillStyle='#a99473';ctx.fillRect(0,123,128,3);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=8;
  return standard('#fff8e9',{map:tex,side:T.DoubleSide});
}
function buffered(positions,uv){
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  const coordinates=uv||[];
  if(!uv)for(let i=0;i<positions.length;i+=3)coordinates.push(positions[i]/9,positions[i+2]/9);
  geometry.setAttribute('uv',new T.Float32BufferAttribute(coordinates,2));geometry.computeVertexNormals();
  return geometry;
}
function drawBatch(scene,geometries,mat,shadow=false){
  if(!geometries.length)return;
  const mesh=new T.Mesh(mergeGeometries(geometries),mat);
  mesh.receiveShadow=true;mesh.castShadow=shadow;scene.add(mesh);
  for(const g of geometries)g.dispose();
  return mesh;
}
function roadStrip(points,w,offset,lift,height,markings=false){
  const list=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
    if(len<.03 || Math.min(a[0],b[0])>620 || Math.max(a[0],b[0])<-620 || Math.min(a[1],b[1])>620 || Math.max(a[1],b[1])<-620)continue;
    const tangent=(u,v)=>{const dx=v[0]-u[0],dz=v[1]-u[1];return Math.atan2(dz,dx);};
    const current=tangent(a,b), start=i>1?tangent(points[i-2],a):current, end=i+1<points.length?tangent(b,points[i+1]):current;
    const bisect=(a,b)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*.5;
    const n0=bisect(current,start),n1=bisect(current,end);
    const count=Math.ceil(len/(markings?5:3));
    const add=(t,side)=>{
      const n=bisect(n0,n1), angle=t===0?n0:t===1?n1:n;
      const x=a[0]+dx*t-Math.sin(angle)*(offset+side*w);
      const z=a[1]+dz*t+Math.cos(angle)*(offset+side*w);
      return [x,height(x,z)+lift,z];
    };
    for(let j=0;j<count;j++){
      const a=add(j/count,-1),b=add(j/count,1),c=add((j+(markings?.52:1))/count,-1),d=add((j+(markings?.52:1))/count,1);
      list.push(...a,...b,...c,...b,...d,...c);
    }
  }
  return buffered(list);
}

export function makeWorld(scene,data){
  const {values,size,half}=data.terrain;
  const base=values[Math.floor(values.length/2)];
  function height(x,z){
    const u=T.MathUtils.clamp((x/half+1)*.5*(size-1),0,size-1.0001),v=T.MathUtils.clamp((z/half+1)*.5*(size-1),0,size-1.0001);
    const i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j,k=j*size+i;
    return T.MathUtils.lerp(T.MathUtils.lerp(values[k],values[k+1],a),T.MathUtils.lerp(values[k+size],values[k+size+1],a),b)-base;
  }
  const terrain=new T.PlaneGeometry(half*2,half*2,200,200);terrain.rotateX(-Math.PI/2);
  const pos=terrain.attributes.position, terrainUV=terrain.attributes.uv, colors=[];
  const field=color('#b3a571'), scrub=color('#7a794b'), pale=color('#c9b685'), park=color('#809057');
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i),y=height(x,z);
    pos.setY(i,y);terrainUV.setXY(i,x/14,z/14);
    const mix=.46+.18*Math.sin(x*.03+z*.014)+.19*Math.sin(z*.05-x*.006)+.12*random(i);
    const slope=(Math.abs(height(x+2,z)-y)+Math.abs(height(x,z+2)-y))*.9;
    const tint=field.clone().lerp(scrub,mix).lerp(pale,Math.min(.48,slope*.32));
    if(data.greens.some(points=>contains(points,x,z)))tint.lerp(park,.67);
    colors.push(...tint.toArray());
  }
  terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();
  const ground=new T.Mesh(terrain,standard('#ffffff',{vertexColors:true,map:surfaceTexture('#e9dfba',['#3e4028','#aa945c','#faf1ca'],1.4)}));ground.receiveShadow=true;scene.add(ground);
  const horizon=new T.PlaneGeometry(3800,3800,90,90);horizon.rotateX(-Math.PI/2);
  const distant=horizon.attributes.position;
  for(let i=0;i<distant.count;i++){
    const x=distant.getX(i),z=distant.getZ(i),distance=Math.max(Math.abs(x),Math.abs(z));
    const blend=T.MathUtils.clamp((distance-580)/550,0,1);
    distant.setY(i,smooth(height(x,z)-2,-27+19*Math.sin(x*.004+z*.006)+22*Math.cos(z*.004-x*.004),blend)-(distance<620?3:0));
  }
  horizon.computeVertexNormals();scene.add(new T.Mesh(horizon,standard('#777651')));
  const waters=data.water.map(points=>{
    const x=points.reduce((sum,p)=>sum+p[0],0)/points.length;
    const z=points.reduce((sum,p)=>sum+p[1],0)/points.length;
    const y=height(x,z)+.55;
    return {points,y};
  });
  drawBatch(scene,waters.map(({points,y})=>polygon(points,y)),standard('#408c86',{roughness:.27,metalness:.2,side:T.DoubleSide}));
  const paths=[], streets=[], curbs=[], paint=[], roadSegments=[], poles=[], arms=[], luminaries=[], streetTrees=[];
  for(const [kind,,points,bridge] of data.roads){
    const width=widths[kind]||1.2;
    const lift=bridge?.47:.29;
    (isPedestrian(kind)?paths:streets).push(roadStrip(points,width,0,lift,height));
    if(mainRoads.has(kind)){
      curbs.push(roadStrip(points,width+1.45,0,lift-.045,height));
      if(kind!=='residential')paint.push(roadStrip(points,.078,0,lift+.025,height,true));
    }
    let traveled=0, next=9;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      roadSegments.push([a,b,width]);
      if(!mainRoads.has(kind)||bridge)continue;
      const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
      while(next<traveled+len){
        const fraction=(next-traveled)/len, sign=(poles.length%2===0?1:-1);
        const nx=-dz/len*sign,nz=dx/len*sign;
        const x=a[0]+dx*fraction+nx*(width+.93),z=a[1]+dz*fraction+nz*(width+.93);
        next+=25;
        if(Math.abs(x)>498||Math.abs(z)>498)continue;
        const y=height(x,z);
        poles.push([x,y+2.65,z,.074,5.3,.074,0]);
        const rotation=Math.atan2(nx,nz)+Math.PI/2;
        arms.push([x-nx*.46,y+5.27,z-nz*.46,.99,.09,.09,rotation]);
        luminaries.push([x-nx*.98,y+5.23,z-nz*.98,.37,.14,.22,rotation]);
        streetTrees.push([x+dx/len*7+nx*2.4,z+dz/len*7+nz*2.4]);
      }
      traveled+=len;
    }
  }
  drawBatch(scene,curbs,standard('#c2b79c',{side:T.DoubleSide,map:surfaceTexture('#d9d1bf',['#776855','#faefdf'])}));
  drawBatch(scene,streets,standard('#827c70',{side:T.DoubleSide,map:surfaceTexture('#bbb5a8',['#291f1a','#ece3cd','#6b635b'])}));
  drawBatch(scene,paths,standard('#d2b491',{side:T.DoubleSide}));
  drawBatch(scene,paint,standard('#e6daba',{side:T.DoubleSide}));

  const buildings=[], walls=[[],[],[],[]], roofs=[], trim=[];
  data.buildings.forEach(([points,sourced,kind],index)=>{
    const ys=points.map(([x,z])=>height(x,z)),low=Math.min(...ys)-.45;
    const tall=sourced|| (kind==='house'?6+random(index)*4:8+random(index)*9);
    const top=Math.max(...ys)+tall;
    const minX=Math.min(...points.map(p=>p[0])), minZ=Math.min(...points.map(p=>p[1]));
    const maxX=Math.max(...points.map(p=>p[0])), maxZ=Math.max(...points.map(p=>p[1]));
    buildings.push({points,minX,minZ,maxX,maxZ,top});
    roofs.push(polygon(points,top));
    const coords=[],uv=[],ledge=[];
    for(let i=0;i<points.length;i++){
      const [x,z]=points[i], [nx,nz]=points[(i+1)%points.length];
      const n=Math.max(1,Math.round(Math.hypot(x-nx,z-nz)/3.4)), floors=Math.max(1,Math.round((top-low)/3.05));
      coords.push(x,low,z,nx,low,nz,x,top,z,nx,low,nz,nx,top,nz,x,top,z);
      uv.push(0,0,n,0,0,floors,n,0,n,floors,0,floors);
      ledge.push(x,top-.14,z,nx,top-.14,nz,x,top+.36,z,nx,top-.14,nz,nx,top+.36,nz,x,top+.36,z);
    }
    walls[index%4].push(buffered(coords,uv));trim.push(buffered(ledge));
  });
  walls.forEach((parts,i)=>drawBatch(scene,parts,facade(i),true));
  drawBatch(scene,roofs,standard('#c9bca3',{side:T.DoubleSide}),true);
  drawBatch(scene,trim,standard('#eadbc2',{side:T.DoubleSide}));

  function blocked(x,z,radius=0,y=-Infinity){
    return buildings.some(b=>{
      if(x<b.minX-radius||x>b.maxX+radius||z<b.minZ-radius||z>b.maxZ+radius||y>b.top+.24)return false;
      return contains(b.points,x,z)||radius>0&&b.points.some((p,i)=>distanceSq(p,b.points[(i+1)%b.points.length],x,z)<radius*radius);
    });
  }
  const nearRoad=(x,z,radius)=>roadSegments.some(([a,b,w])=>
    x>=Math.min(a[0],b[0])-w-radius&&x<=Math.max(a[0],b[0])+w+radius&&
    z>=Math.min(a[1],b[1])-w-radius&&z<=Math.max(a[1],b[1])+w+radius&&distanceSq(a,b,x,z)<(w+radius)**2);
  const wet=(x,z)=>waters.some(w=>contains(w.points,x,z));
  function instances(geometry,mat,items,shadow=true){
    const mesh=new T.InstancedMesh(geometry,mat,items.length), dummy=new T.Object3D();
    items.forEach(([x,y,z,sx,sy,sz,rot,tint],i)=>{
      dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.y=rot;dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      if(tint)mesh.setColorAt(i,color(tint));
    });
    mesh.castShadow=shadow;mesh.receiveShadow=true;scene.add(mesh);
  }
  const trunks=[],crowns=[],cypresses=[],shrubs=[];
  for(const [x,z] of streetTrees){
    if(nearRoad(x,z,1.5)||blocked(x,z,2.3)||wet(x,z))continue;
    const y=height(x,z), scale=1.22;
    trunks.push([x,y+1.05,z,.16,2.1,.16,0]);
    for(let j=0;j<4;j++)crowns.push([x+Math.cos(j*2.1)*.75,y+2.5+j*.22,z+Math.sin(j*2.1)*.75,scale,1.12,scale,j,['#647950','#889361','#6e8254','#586f49'][j]]);
  }
  const poleMaterial=standard('#69695f',{metalness:.4});
  instances(new T.CylinderGeometry(.65,1,1,7),poleMaterial,poles);
  instances(new T.BoxGeometry(),poleMaterial,arms);
  instances(new T.BoxGeometry(),standard('#d9ca9d'),luminaries);
  for(let i=0;i<2650;i++){
    const x=(random(i*4)-.5)*1170,z=(random(i*4+1)-.5)*1140;
    if(nearRoad(x,z,2.2)||blocked(x,z,2.8)||wet(x,z))continue;
    const inPark=data.greens.some(points=>contains(points,x,z));
    if(!inPark && random(i*4+2)>(x<15?.40:.30))continue;
    const y=height(x,z),r=random(i*4+3);
    if(r<.32){
      shrubs.push([x,y+.25,z,.5+r*2,.43+r,.63,random(i)*6.3,['#81824a','#777346','#9b915a'][i%3]]);
    }else if(r>.85){
      trunks.push([x,y+.65,z,.19,1.3,.19,0]);
      cypresses.push([x,y+3.2,z,.85,2.7,.85,i,'#4e6847']);
    }else{
      const scale=1+r*1.1;
      trunks.push([x,y+scale*.64,z,.16,scale*1.28,.16,0]);
      for(let j=0;j<3;j++)crowns.push([x+Math.cos(j*2.1)*scale*.57,y+scale*(1.3+j*.17),z+Math.sin(j*2.1)*scale*.57,scale,.83*scale,.92*scale,i+j,['#647950','#889361','#6e8254','#586f49'][(i+j)%4]]);
    }
  }
  instances(new T.CylinderGeometry(.68,1,1,7),standard('#74634c'),trunks);
  instances(new T.IcosahedronGeometry(1,1),standard('#fff5d9'),crowns);
  instances(new T.IcosahedronGeometry(1,1),standard('#fff8dc'),cypresses);
  instances(new T.IcosahedronGeometry(1,0),standard('#fff8df'),shrubs,false);
  const [west,south,east,north]=data.bounds,[lon,lat]=data.center,[mx,mz]=data.metersPerDegree;
  const bounds={left:(west-lon)*mx,right:(east-lon)*mx,top:(lat-north)*mz,bottom:(lat-south)*mz};
  return {height,blocked,wet,bounds};
}
