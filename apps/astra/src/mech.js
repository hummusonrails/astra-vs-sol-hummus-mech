import * as T from './vendor/three.module.js';
export function makeMech(scene){
 const root=new T.Group(),body=new T.Group();root.add(body);scene.add(root);
 let ceramic='#197674',ivory='#f3e8c7',metal='#263b3d',brass='#bc944f',pea='#e9bb72',paprika='#b94b2d';
 function mesh(p,g,c,x,y,z,shine=0){let m=new T.Mesh(g,new T.MeshStandardMaterial({color:c,metalness:shine,roughness:shine?.32:.58}));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;p.add(m);return m}
 function box(p,x,y,z,w,h,d,c){return mesh(p,new T.BoxGeometry(w,h,d),c,x,y,z,.24)}
 function egg(p,x,y,z,w,h,d,c){let m=mesh(p,new T.SphereGeometry(1,24,16),c,x,y,z,.15);m.scale.set(w,h,d);return m}
 function disc(p,y,rt,rb,h,c){return mesh(p,new T.CylinderGeometry(rt,rb,h,64),c,0,y,0,.32)}
 function hose(p,pts,r,c){return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(v=>new T.Vector3(...v))),Math.max(16,pts.length*2),r,8,false),c,0,0,0,.2)}
 function group(p,x,y,z){let g=new T.Group();p.add(g);g.position.set(x,y,z);return g}
 body.position.y=2.95;
 disc(body,-.28,1.03,.82,.4,metal);disc(body,-.05,1.32,1.02,.24,brass);
 let profile=[[.85,0],[1.28,.06],[1.55,.28],[1.85,.62],[2.03,1.06],[2.05,1.25],[1.92,1.29],[1.80,1.06],[.5,.48]];
 mesh(body,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),72),ivory,0,0,0,.28);
 disc(body,.61,1.89,1.70,.24,ceramic);disc(body,1.13,2.073,2.045,.12,ceramic);disc(body,.30,1.65,1.58,.09,paprika);
 for(let i=0;i<36;i++){let a=i*Math.PI/18;let m=box(body,1.92*Math.sin(a),.85,1.92*Math.cos(a),.13,.18,.06,ceramic);m.rotation.set(0,a,.55)}
 egg(body,0,1.21,0,1.92,.48,1.92,'#e8bb6a');
 let swirl=[];for(let i=0;i<135;i++){let t=i/134,r=1.68*(1-t)+.03,a=t*12.6;swirl.push([r*Math.cos(a),1.37+.36*(1-r/1.8),r*Math.sin(a)])}hose(body,swirl,.14,'#f4cd85');
 egg(body,0,1.64,0,.46,.13,.46,'#e0a332');
 for(let i=0;i<5;i++){let a=i*2.4;egg(body,.5+Math.sin(a)*.36,1.69,-.2+Math.cos(a)*.34,.22,.19,.21,pea)}
 for(let i=0;i<11;i++){let a=i*2.4,r=.25+i*.044;let m=egg(body,-.75+Math.cos(a)*r,1.63+Math.sin(i)*.09,.38+Math.sin(a)*r,.12,.08,.29,i%2?'#477641':'#699345');m.rotation.y=-a}
 for(let i=0;i<45;i++){let a=i*2.4,r=1.15+.45*Math.sin(i*1.3);egg(body,Math.cos(a)*r,1.44+.17*(1.6-r),Math.sin(a)*r,.043,.025,.055,paprika)}
 // Ceramic sensor pod and the amber oil sight glass on its rear.
 box(body,0,.61,-1.73,1.35,.49,.53,metal);for(let s of [-1,1]){let eye=egg(body,s*.36,.64,-2,.19,.13,.07,'#bfffe2');eye.material.emissive.set('#61d79a')}
 box(body,0,.53,1.81,1.05,.72,.32,metal);let lamp=box(body,0,.55,2,.69,.41,.13,'#ffd060');lamp.material.emissive.set('#ffae32');lamp.material.emissiveIntensity=.78;
 for(let x of [-.23,0,.23])box(body,x,.54,2.1,.045,.51,.08,brass);
 const legs=[];
 for(let side of [-1,1]){
 let hip=group(root,side*1.09,2.94,0),knee=group(hip,side*.14,-1.25,-.2),foot=group(knee,side*.08,-1.28,.16);
 egg(hip,0,0,0,.53,.48,.5,pea);box(hip,side*.10,-.61,-.08,.64,1.04,.66,metal);
 box(hip,side*.20,-.59,-.29,.69,.78,.47,ceramic);
 egg(knee,0,0,0,.49,.44,.44,pea);let hub=egg(knee,side*.42,.01,0,.1,.28,.28,brass);
 box(knee,0,-.65,.08,.54,1.18,.54,metal);box(knee,0,-.68,-.21,.75,.9,.48,ivory);box(knee,0,-.4,-.46,.65,.13,.07,paprika);
 hose(knee,[[side*.32,-.06,.12],[side*.44,-.55,.28],[side*.29,-1.11,.14]],.075,brass);
 box(foot,0,-.12,-.2,1.03,.39,1.65,metal);box(foot,0,.08,-.33,.99,.30,1.36,ceramic);for(let k of [-.26,.26])box(foot,k,-.03,-.93,.38,.24,.37,ivory);
 hose(body,[[side*1.62,.45,.43],[side*1.95,-.2,.55],[side*1.6,-.65,.28],[side*1.18,-.35,.06]],.105,'#d7b778');
 box(hip,0,-.56,.29,.63,.72,.18,ceramic);
 box(knee,0,-.68,.34,.66,.72,.19,ceramic);
 box(knee,0,-.44,.45,.61,.1,.055,paprika);
 for(let k of [-.17,.17]){box(knee,k,-.70,.46,.065,.38,.07,brass);egg(hip,k,-.40,.40,.055,.055,.04,brass)}
 box(foot,0,-.06,.59,.92,.12,.18,brass);
 legs.push({hip,knee,foot,side})
 }
 return {root,body,legs,lamp};
}
