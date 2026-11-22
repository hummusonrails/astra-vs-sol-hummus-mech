import * as T from './vendor/three.module.js';
import data from './district.json' with {type:'json'};
import dem from './elevation.json' with {type:'json'};
export {data};
export const clamp=T.MathUtils.clamp;
const cell=40075016.686*Math.cos(31.9017*Math.PI/180)/(8192*256);
export function ground(x,z){
 let u=clamp(149.8954-105-.5+x/cell,0,89.999),v=clamp(90.3601-48-.5+z/cell,0,84.999);
 let i=u|0,j=v|0,a=u-i,b=v-j;
 return (1-b)*(dem[j][i]*(1-a)+dem[j][i+1]*a)+b*(dem[j+1][i]*(1-a)+dem[j+1][i+1]*a)-220;
}
let seed=7231;export function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
export const solids=[];
export function blocked(x,z,r=1.6){
 if(Math.abs(x)>374-r||Math.abs(z)>362-r)return true;
 for(const s of solids){if(x<s.x0-r||x>s.x1+r||z<s.z0-r||z>s.z1+r)continue;
 let inside=false;for(let i=0,j=s.p.length-1;i<s.p.length;j=i++){
 let [a,b]=s.p[j],[c,d]=s.p[i],dx=c-a,dz=d-b,k=clamp(((x-a)*dx+(z-b)*dz)/(dx*dx+dz*dz||1),0,1);
 if((x-a-k*dx)**2+(z-b-k*dz)**2<r*r)return true;
 if((b>z)!=(d>z)&&x<(c-a)*(z-b)/(d-b)+a)inside=!inside;
 }if(inside)return true;
 }return false;
}
export function city(scene){
 let cube=new T.BoxGeometry(1,1,1),orb=new T.IcosahedronGeometry(1,1),pole=new T.CylinderGeometry(.5,.65,1,7);
 let buckets=new Map(),dummy=new T.Object3D();
 function prop(g,x,y,z,w,h,d,color,rot=0){if(!buckets.has(g))buckets.set(g,[]);dummy.position.set(x,y,z);dummy.rotation.set(0,rot,0);dummy.scale.set(w,h,d);dummy.updateMatrix();buckets.get(g).push([dummy.matrix.clone(),color])}
 let surfaces=new Map();
 function tri(key,pts,uv){if(!surfaces.has(key))surfaces.set(key,{pos:[],uv:[]});let s=surfaces.get(key);s.pos.push(...pts.flat());s.uv.push(...(uv||pts.map(v=>[v[0]/4,v[2]/4])).flat())}
 function poly(key,p,y){let idx=T.ShapeUtils.triangulateShape(p.map(([x,z])=>new T.Vector2(x,z)),[]);for(let ids of idx)tri(key,ids.map(i=>[p[i][0],y??ground(...p[i])+.08,p[i][1]]))}
 let terrain=new T.PlaneGeometry(1500,1500,110,110);terrain.rotateX(-Math.PI/2);let at=terrain.attributes.position;
 for(let i=0;i<at.count;i++)at.setY(i,ground(at.getX(i),at.getZ(i))-.22);terrain.computeVertexNormals();
 let land=new T.Mesh(terrain,new T.MeshStandardMaterial({color:0xb0a67e}));land.receiveShadow=true;scene.add(land);
 for(const a of data.areas)poly(a.k=='water'?'#72a69f':'#99a577',a.p);
 function strip(key,a,b,w,h){let dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.05)return;let nx=-dz/len*w/2,nz=dx/len*w/2;
 let v=[[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]].map(([x,z])=>[x,ground(x,z)+h,z]);tri(key,[v[0],v[1],v[2]]);tri(key,[v[0],v[2],v[3]])}
 for(let r of data.roads){let walk=/footway|pedestrian|steps|cycleway|path/.test(r.k);let w=walk?3:r.k=='service'?4:r.one?6.4:9;
 for(let i=1;i<r.p.length;i++){let a=r.p[i-1],b=r.p[i],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);if(l<.1)continue;
 for(let j=0;j<l;j+=6){let t=j/l,u=Math.min(1,(j+6)/l),p=[a[0]+dx*t,a[1]+dz*t],q=[a[0]+dx*u,a[1]+dz*u];strip('#ccbc9e',p,q,w+(walk?.5:3.2),.15);strip(walk?'#c6b79d':'#656b68',p,q,w,walk?.19:.22);
 if(!walk&&w>5&&u-t>.01)strip('#dad4b9',p,[p[0]+(q[0]-p[0])*.44,p[1]+(q[1]-p[1])*.44],.13,.26)}
 }}
 for(let b of data.buildings){let p=b.p;if(p.length<3)continue;
 let xs=p.map(v=>v[0]),zs=p.map(v=>v[1]),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);solids.push({p,x0,x1,z0,z1});
 let base=Math.min(...p.map(v=>ground(...v)))-.35,h=parseFloat(b.h)||((parseFloat(b.l)|| (b.type=='retail'?3:3+Math.floor(rand()*5)))*3.05),top=base+h;
 poly('#d7c9ae',p,top);for(let i=0;i<p.length;i++){let [x,z]=p[i],[xx,zz]=p[(i+1)%p.length],dx=xx-x,dz=zz-z,l=Math.hypot(dx,dz);if(l<.1)continue;let cols=Math.max(1,Math.round(l/3.5)),rows=Math.max(1,Math.round(h/3.05));
 let pts=[[x,base,z],[xx,base,zz],[xx,top,zz],[x,top,z]],uv=[[0,0],[cols,0],[cols,rows],[0,rows]];
 for(let ids of [[0,1,2],[0,2,3]])tri('wall',ids.map(i=>pts[i]),ids.map(i=>uv[i]));
 let angle=-Math.atan2(dz,dx);prop(cube,(x+xx)/2,top+.16,(z+zz)/2,l+.2,.33,.37,'#f3e3c7',angle);
 if(l>8&&l<70&&i%2==0){for(let row=1;row<rows;row++){for(let k=3.5;k<l-1;k+=9){let bx=x+dx*k/l,bz=z+dz*k/l;
 prop(cube,bx,base+row*h/rows+.3,bz,3.6,.24,2.8,'#dfcdb1',angle);prop(cube,bx,base+row*h/rows+.86,bz,3.5,.68,2.6,'#a9b9b3',angle)}}}
 }let cx=(x0+x1)/2,cz=(z0+z1)/2;if(x1-x0>9&&z1-z0>9){prop(cube,cx,top+.9,cz,4.2,1.8,3.3,'#ddcdb5');prop(cube,cx+2,top+1.5,cz+2,2.3,.22,2.4,'#465756')}
 }
 function tree(x,z,s=1){let y=ground(x,z);prop(pole,x,y+1.7*s,z,.48*s,3.6*s,.48*s,'#736345');let c=['#748455','#788b5a','#879565','#627b52'];for(let k=0;k<10;k++){let a=k*2.399;prop(orb,x+Math.cos(a)*1.35*s,y+(3.6+rand()*1.5)*s,z+Math.sin(a)*1.35*s,(1.05+rand()*.45)*s,(.9+rand()*.55)*s,1.23*s,c[k%4],a)}}
 for(let r of data.roads){if(!['tertiary','secondary','residential'].includes(r.k))continue;let carry=4,n=0;for(let i=1;i<r.p.length;i++){let a=r.p[i-1],b=r.p[i],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);if(!l)continue;
 for(;carry<l;carry+=14){let off=r.one?5:6.5,x=a[0]+(dx*carry-dz*off)/l,z=a[1]+(dz*carry+dx*off)/l;if(blocked(x,z,.6))continue;
 if(n%4===2){
 let side=off-2.35,px=a[0]+(dx*carry-dz*side)/l,pz=a[1]+(dz*carry+dx*side)/l,py=ground(px,pz)+.28,angle=Math.atan2(dx,dz);
 let car=['#9c5441','#c8c4b5','#859b9e','#d9ccb2','#727f84'][n%5];
 prop(cube,px,py+.53,pz,1.72,.66,3.96,car,angle);
 prop(cube,px,py+1.02,pz,1.51,.53,2.18,'#54696a',angle);
 prop(cube,px,py+1.32,pz,1.52,.11,1.94,car,angle);
 for(let side of [-1,1])for(let end of [-1,1]){let ox=side*.79,oz=end*1.22;prop(orb,px+ox*Math.cos(angle)+oz*Math.sin(angle),py+.32,pz-ox*Math.sin(angle)+oz*Math.cos(angle),.18,.32,.33,'#374143',angle)}
 }
 if(n++%4){tree(x,z,.85+rand()*.38)}else{let y=ground(x,z);prop(pole,x,y+2.85,z,.16,5.7,.16,'#586668');prop(cube,x,y+5.66,z,.98,.18,.4,'#53615e')}
 }carry-=l;}}
 let cv=document.createElement('canvas');cv.width=cv.height=128;let c=cv.getContext('2d');c.fillStyle='#e4d6bd';c.fillRect(0,0,128,128);
 for(let j=0;j<8;j++)for(let k=-1;k<5;k++){c.fillStyle=['#e7dac4','#e3d5be','#eddfc9','#dfd1ba'][rand()*4|0];c.fillRect(k*36+(j%2)*18,j*16,35,15)}
 c.fillStyle='#a99c87';c.fillRect(24,24,79,79);c.fillStyle='#ffefd5';c.fillRect(27,25,73,75);c.fillStyle='#576d70';c.fillRect(31,29,65,65);c.fillStyle='#8b9d9b';c.fillRect(33,31,28,60);c.fillStyle='#647d80';c.fillRect(66,31,28,60);c.fillStyle='#d7c8b0';c.fillRect(62,27,3,68);c.fillRect(26,94,77,5);c.fillStyle='#c4bba8';c.fillRect(29,27,68,9);
 let tex=new T.CanvasTexture(cv);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
 for(let [key,s] of surfaces){let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(s.pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(s.uv,2));g.computeVertexNormals();let m=new T.Mesh(g,new T.MeshStandardMaterial({color:key=='wall'?0xffffff:key,map:key=='wall'?tex:null,side:T.DoubleSide,roughness:.9}));m.receiveShadow=true;m.castShadow=key=='wall';scene.add(m)}
 for(let [g,items] of buckets){let m=new T.InstancedMesh(g,new T.MeshStandardMaterial({roughness:.88}),items.length);items.forEach(([a,c],i)=>{m.setMatrixAt(i,a);m.setColorAt(i,new T.Color(c))});m.castShadow=m.receiveShadow=true;scene.add(m)}
}
