import * as T from 'three';
const material = (color, values = {}) => new T.MeshStandardMaterial({color, roughness:.55, ...values});
const ceramic=material('#f6dfaf',{roughness:.32}), red=material('#b94a30'), dark=material('#26353a',{metalness:.6}), brass=material('#b18a4d',{metalness:.55}), pea=material('#e9b86e'), hummus=material('#e9b77c'), tahini=material('#85694d'), green=material('#3c733c'), glass=material('#163831',{metalness:.65,roughness:.21}), glow=material('#d7db57',{emissive:'#c6ce26',emissiveIntensity:1.7});
const sphere=new T.SphereGeometry(1,18,12), box=new T.BoxGeometry(1,1,1);
function part(parent, geometry, mat, x,y,z, sx=1,sy=1,sz=1){
  const mesh=new T.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function tube(parent, points, radius, mat){
  const curve=new T.CatmullRomCurve3(points.map(point=>new T.Vector3(...point)));
  return part(parent,new T.TubeGeometry(curve,Math.max(8,points.length*2),radius,8,false),mat,0,0,0);
}
export function makeMech(scene){
  const root=new T.Group(), body=new T.Group();scene.add(root);root.add(body);
  const bowlProfile=[[.02,-.72],[.65,-.70],[1.06,-.58],[1.39,-.35],[1.65,.04],[1.77,.42],[1.79,.51],[1.75,.58],[1.64,.59],[1.61,.50],[1.60,.40],[.02,.39]];
  part(body,new T.LatheGeometry(bowlProfile.map(([x,y])=>new T.Vector2(x,y)),48),ceramic,0,0,0);
  const lip=part(body,new T.TorusGeometry(1.72,.074,10,48),red,0,.535,0);lip.rotation.x=Math.PI/2;
  const lower=part(body,new T.TorusGeometry(1.12,.05,8,36),brass,0,-.55,0);lower.rotation.x=Math.PI/2;
  part(body,sphere,hummus,0,.46,0,1.62,.17,1.62);
  const swirl=[];
  for(let i=0;i<=85;i++){
    const t=i/85, r=.19+1.28*t, a=t*Math.PI*4.8;
    swirl.push([r*Math.cos(a),.61-.085*t*t,r*Math.sin(a)]);
  }
  tube(body,swirl,.065,ceramic);
  part(body,sphere,glow,0,.62,0,.34,.05,.31);
  for(let i=0;i<31;i++){
    const a=i*2.39996,r=.48+((i*19)%32)/34;
    part(body,sphere,i%5?red:green,Math.cos(a)*r,.63-.06*r*r,Math.sin(a)*r,.035+(i%4)*.012,.026,.04);
  }
  for(let i=0;i<5;i++){
    const a=i*1.4;
    const leaf=part(body,sphere,green,-.71+Math.sin(a)*.17,.72,.53+Math.cos(a)*.16,.10,.045,.23);
    leaf.rotation.y=a;leaf.rotation.z=.36;
  }
  part(body,sphere,dark,0,-.29,-1.46,.69,.42,.18);
  part(body,sphere,glass,0,-.26,-1.60,.55,.27,.10);
  part(body,sphere,glow,0,-.26,-1.69,.33,.08,.055);
  part(body,box,dark,0,-.32,1.37,1.10,.53,.41);
  for(let i=-2;i<=2;i++){
    part(body,box,brass,i*.18,-.30,1.598,.107,.27,.041);
    part(body,box,glow,i*.18,-.31,1.624,.043,.15,.024);
  }
  for(const side of [-1,1]){
    part(body,sphere,dark,side*1.35,-.3,0,.42,.4,.52);
    part(body,sphere,pea,side*1.66,-.27,0,.35,.34,.42);
    part(body,sphere,red,side*1.88,-.27,0,.18,.14,.16);
    tube(body,[[side*1.38,-.15,.45],[side*1.72,-.75,.52],[side*1.39,-1.01,.18],[side*.88,-.79,-.09]],.075,tahini);
    tube(body,[[side*1.49,-.2,-.48],[side*1.74,-.61,-.50],[side*1.43,-.89,-.25],[side*.92,-.74,-.06]],.055,brass);
  }
  const legs=[-1,1].map(side=>{
    const thigh=new T.Group(), shin=new T.Group(), foot=new T.Group();
    root.add(thigh,shin,foot);
    part(thigh,box,dark,0,.5,0,.48,1,.53);
    part(thigh,box,ceramic,side*.12,.48,-.07,.53,.71,.53);
    part(thigh,box,red,side*.36,.46,-.08,.08,.48,.39);
    part(shin,sphere,pea,0,0,0,.39,.34,.36);
    part(shin,box,dark,0,.51,0,.39,1.02,.48);
    part(shin,box,ceramic,0,.56,-.14,.51,.66,.55);
    part(shin,box,brass,side*.24,.52,.22,.13,.79,.13);
    part(foot,box,dark,0,.15,-.12,.81,.27,1.17);
    part(foot,box,red,0,.30,-.18,.77,.18,1.03);
    part(foot,box,ceramic,0,.42,.10,.59,.18,.57);
    for(let i=-1;i<=1;i++)part(foot,box,brass,i*.24,.25,-.688,.12,.18,.07);
    return {side,thigh,shin,foot};
  });
  const down=new T.Vector3(0,1,0), delta=new T.Vector3(), hip=new T.Vector3(), knee=new T.Vector3(), ankle=new T.Vector3();
  function align(group,from,to){
    delta.subVectors(to,from);group.position.copy(from);group.scale.y=delta.length();
    group.quaternion.setFromUnitVectors(down,delta.normalize());
  }
  function pose(phase, stride, bodyY, feet){
    body.position.y=bodyY;body.rotation.z=Math.sin(phase)*stride*.062;
    body.rotation.x=Math.cos(phase*2)*stride*.028;
    legs.forEach(({side,thigh,shin,foot},i)=>{
      const {z,y}=feet[i];
      const x=side*.96;
      foot.position.set(x,y,z);
      hip.set(side*.90,bodyY-.65,.03);
      knee.set(x+side*.11,(hip.y+y+.32)*.5,-.46+z*.50);
      ankle.set(x,y+.39,z+.11);
      align(thigh,hip,knee);align(shin,knee,ankle);
    });
  }
  return {root,pose};
}
