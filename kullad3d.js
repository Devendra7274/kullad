(function(){
'use strict';

/* ---------- reveal on scroll + card tilt ---------- */
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.1});
document.querySelectorAll('.reveal').forEach(function(el,i){el.style.transitionDelay=(i%4)*80+'ms';io.observe(el)});
document.querySelectorAll('.card').forEach(function(c){
  c.addEventListener('pointermove',function(e){
    if(e.pointerType==='touch')return;
    var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    c.style.transform='rotateY('+(x*18)+'deg) rotateX('+(-y*18)+'deg) translateZ(14px)';
  });
  c.addEventListener('pointerleave',function(){c.style.transform=''});
});

if(!window.THREE){document.getElementById('bg').style.display='none';return}
var T=THREE;
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var isMob=function(){return innerWidth<820};
function smooth(a,b,x){x=Math.min(1,Math.max(0,(x-a)/(b-a)));return x*x*(3-2*x)}
function frac(x){return x-Math.floor(x)}

/* ---------- cup specs (real-ish proportions) ---------- */
var SPEC={
  100:{h:1.75,rT:1.0, rB:.74},
  150:{h:2.05,rT:1.02,rB:.74},
  250:{h:2.65,rT:.96, rB:.62},
  300:{h:2.95,rT:.98, rB:.62},
  350:{h:3.05,rT:1.08,rB:.70}
};

/* surface relief: real geometry displacement (flutes + patterned band) */
function disp(p,u,y,yb){
  if(p==='diamond'){
    var m=smooth(.14,.3,y)*(1-smooth(yb-.16,yb-.02,y));
    var a=Math.abs(frac(u*22)*2-1),b=Math.abs(frac((y-.1)/.2)*2-1);
    return .05*Math.max(0,1-(a+b))*m;
  }
  var top=yb-.03,bandH=.26,N=p==='scallop'?16:(p==='zig'?14:10);
  var t=Math.abs(2*frac(u*N)-1),arc;
  if(p==='scallop')arc=Math.sqrt(Math.max(0,1-t*t));
  else if(p==='zig')arc=1-t;
  else arc=1-Math.pow(t,.8);                 // lotus: pointed petals
  var edge=top-bandH*arc;
  var inBand=smooth(edge-.014,edge+.014,y)*(1-smooth(top-.01,top+.04,y));
  var fm=smooth(.28,.46,y)*(1-smooth(top-bandH-.02,top-.02,y))*(1-inBand);
  var c=(Math.cos(frac(u*46)*Math.PI*2)+1)/2;
  var d=.055*inBand+.032*Math.pow(c,1.5)*fm;
  if(p==='lotus'){d+=.02*Math.pow(Math.max(0,1-Math.abs(2*frac(u*N)-1)*3),1)*inBand}
  return d;
}

function kulladGeo(ml,pat,seg){
  var s=SPEC[ml],h=s.h,rT=s.rT,rB=s.rB,rimH=.34,yb=h-rimH,P=[];
  function A(r,y){P.push(new T.Vector2(r,y))}
  A(0,0);A(rB-.07,0);A(rB-.02,.045);
  var N=130,k;
  for(k=1;k<=N;k++){var q=k/N;A(rB+(rT-rB)*Math.pow(q,.9),.05+q*(yb-.05))}
  var nBody=P.length;
  A(rT+.045,yb+.02);A(rT+.068,yb+.1);A(rT+.074,h-.05);A(rT+.058,h-.01);A(rT,h+.006);A(rT-.065,h-.01);
  var ri0=rB-.11,ri1=rT-.078,M=40;
  for(k=0;k<=M;k++){var q2=1-k/M;A(ri0+(ri1-ri0)*Math.pow(q2,.9),.3+q2*(h-.3-.03))}
  A(0,.29);
  var g=new T.LatheGeometry(P,seg),pos=g.attributes.position,L=P.length,i,j;
  for(i=0;i<=seg;i++){
    for(j=3;j<nBody;j++){
      var ix=i*L+j,x=pos.getX(ix),y=pos.getY(ix),z=pos.getZ(ix),r=Math.hypot(x,z);
      if(r<1e-4)continue;
      var u=frac(Math.atan2(z,x)/(Math.PI*2)),d=disp(pat,u,y,yb),f=(r+d)/r;
      pos.setX(ix,x*f);pos.setZ(ix,z*f);
    }
  }
  g.computeVertexNormals();
  var n=g.attributes.normal;
  for(j=0;j<L;j++){ // fix seam normals
    var a=j,b=seg*L+j,nx=n.getX(a)+n.getX(b),ny=n.getY(a)+n.getY(b),nz=n.getZ(a)+n.getZ(b),l=Math.hypot(nx,ny,nz)||1;
    n.setXYZ(a,nx/l,ny/l,nz/l);n.setXYZ(b,nx/l,ny/l,nz/l);
  }
  g.userData={h:h,rT:rT};
  return g;
}

/* ---------- procedural clay textures ---------- */
function clayCanvases(){
  var W=512,c=document.createElement('canvas');c.width=c.height=W;var g=c.getContext('2d');
  g.fillStyle='#d8762f';g.fillRect(0,0,W,W);
  var i;
  for(i=0;i<70;i++){var x=Math.random()*W,y=Math.random()*W,r=30+Math.random()*90,gr=g.createRadialGradient(x,y,0,x,y,r),light=Math.random()>.5;
    gr.addColorStop(0,light?'rgba(255,170,100,.16)':'rgba(120,45,10,.16)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2)}
  for(i=0;i<9000;i++){g.fillStyle='rgba('+(110+Math.random()*120|0)+','+(40+Math.random()*50|0)+',10,'+Math.random()*.14+')';g.fillRect(Math.random()*W,Math.random()*W,1+Math.random()*2,1+Math.random()*2)}
  for(i=0;i<10;i++){g.fillStyle='rgba(90,30,5,'+(.02+Math.random()*.03)+')';g.fillRect(0,Math.random()*W,W,1+Math.random()*1.5)}  // potter's-wheel rings
  var b=document.createElement('canvas');b.width=b.height=W;var h=b.getContext('2d');
  h.fillStyle='#808080';h.fillRect(0,0,W,W);
  for(i=0;i<3000;i++){var v=118+Math.random()*20|0;h.fillStyle='rgb('+v+','+v+','+v+')';h.fillRect(Math.random()*W,Math.random()*W,1+Math.random()*2,1+Math.random()*2)}
  
  return [c,b];
}
var cc=clayCanvases();
var mapTex=new T.CanvasTexture(cc[0]),bumpTex=new T.CanvasTexture(cc[1]);
[mapTex,bumpTex].forEach(function(t){t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8});
mapTex.repeat.set(2,1);bumpTex.repeat.set(2,1);mapTex.encoding=T.sRGBEncoding;
function clayMat(hex){
  return new T.MeshStandardMaterial({color:hex||0xffffff,map:mapTex,bumpMap:bumpTex,bumpScale:.08,roughness:.82,metalness:0,side:T.DoubleSide,envMapIntensity:.75});
}
var chaiTex=(function(){var c=document.createElement('canvas');c.width=c.height=256;var g=c.getContext('2d'),r=g.createRadialGradient(128,128,10,128,128,128);
  r.addColorStop(0,'#e3b07a');r.addColorStop(.6,'#c98a48');r.addColorStop(.9,'#8d5426');r.addColorStop(1,'#e8c9a0');g.fillStyle=r;g.fillRect(0,0,256,256);
  var t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t})();
var spriteTex=(function(){var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,255,255,.95)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return new T.CanvasTexture(c)})();

function makeCup(ml,pat,hex,seg){
  var geo=kulladGeo(ml,pat,seg),grp=new T.Group(),m=new T.Mesh(geo,clayMat(hex));
  m.castShadow=m.receiveShadow=true;grp.add(m);
  var chai=new T.Mesh(new T.CircleGeometry(geo.userData.rT-.1,64),new T.MeshStandardMaterial({map:chaiTex,roughness:.22,metalness:0}));
  chai.rotation.x=-Math.PI/2;chai.position.y=geo.userData.h-.22;grp.add(chai);
  grp.userData={h:geo.userData.h,body:m,chai:chai,geo:geo};
  return grp;
}

function makeEnv(r){
  var sc=new T.Scene();
  sc.add(new T.Mesh(new T.BoxGeometry(30,30,30),new T.MeshBasicMaterial({color:0xc99a6c,side:T.BackSide})));
  function panel(w,h,x,y,z,c,k){var m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(c).multiplyScalar(k),side:T.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);sc.add(m)}
  panel(16,9,6,13,8,0xfff2de,6);panel(6,14,-12,4,4,0xffd6a0,3.5);panel(10,3,0,-6,10,0xffffff,1.4);panel(9,9,0,3,-13,0xffe2c4,2);
  var pm=new T.PMREMGenerator(r),rt=pm.fromScene(sc,.03);pm.dispose();return rt.texture;
}
function setupRenderer(canvas){
  var r=new T.WebGLRenderer({canvas:canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
  r.outputEncoding=T.sRGBEncoding;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.08;
  r.shadowMap.enabled=true;r.shadowMap.type=T.PCFSoftShadowMap;r.shadowMap.autoUpdate=false;
  return r;
}
function lights(scene,renderer){
  scene.environment=makeEnv(renderer);
  scene.add(new T.HemisphereLight(0xfff0dc,0x9a4a1c,.35));
  var key=new T.DirectionalLight(0xffe6c0,2.2);key.castShadow=true;
  key.shadow.mapSize.set(isMob()?512:1024,isMob()?512:1024);
  var sh=key.shadow.camera;sh.left=-7;sh.right=7;sh.top=7;sh.bottom=-7;sh.near=1;sh.far=40;key.shadow.bias=-.0005;key.shadow.radius=4;
  scene.add(key);scene.add(key.target);
  var rim=new T.DirectionalLight(0xff9a50,1.1);rim.position.set(-6,4,-6);scene.add(rim);
  return key;
}
function shadowPlane(r){
  var m=new T.Mesh(new T.CircleGeometry(r,48),new T.ShadowMaterial({opacity:.2}));m.rotation.x=-Math.PI/2;m.position.y=.001;m.receiveShadow=true;return m;
}

/* =====================================================
   HERO: scroll-driven 3D cluster on the fixed canvas
   ===================================================== */
var canvas=document.getElementById('bg'),R,scene,camera,key,world,cups=[],steam,sg,SN=48,sv=[],sw=0,sh=0;
try{
  R=setupRenderer(canvas);
  scene=new T.Scene();camera=new T.PerspectiveCamera(32,1,.1,100);
  key=lights(scene,R);
  world=new T.Group();scene.add(world);
  world.add(shadowPlane(9));
  var seg=isMob()?112:168;
  var layoutD=[ // ml,pattern,x,z,tint
    [300,'scallop',0,.2,0xffffff],[250,'zig',-2.75,-.9,0xf2b890],[350,'lotus',2.85,-.8,0xffe0c4],
    [100,'diamond',1.5,2.1,0xffd2b0],[150,'scallop',-1.4,2.0,0xf0c3a0]];
  var layoutM=[[300,'scallop',0,.8,0xffffff],[250,'zig',-1.6,-1.1,0xf2b890],[350,'lotus',1.6,-1.1,0xffe0c4]];
  var L=isMob()?layoutM:layoutD;
  L.forEach(function(d,i){
    var c=makeCup(d[0],d[1],d[4],seg);c.position.set(d[2],0,d[3]);c.rotation.y=i*1.3;c.userData.dir=i%2?-1:1;world.add(c);cups.push(c);
  });
  // steam over the hero cup
  var sp=new Float32Array(SN*3);
  for(var i=0;i<SN;i++){sp[i*3]=(Math.random()-.5)*.7;sp[i*3+1]=Math.random()*2.2;sp[i*3+2]=(Math.random()-.5)*.7;sv.push(.004+Math.random()*.01)}
  sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(sp,3));
  steam=new T.Points(sg,new T.PointsMaterial({size:.7,map:spriteTex,transparent:true,opacity:.32,depthWrite:false}));
  steam.position.y=cups[0].userData.h-.2;cups[0].add(steam);
}catch(e){canvas.style.display='none';R=null}

/* section keyframes: [nx, ny, widthFraction, tilt, canvasOpacity] */
var IDS=['top','about','products','spin','uses','bulk','gallery','reviews','contact'];
var KD=[[.52,.12,.48,0,1],[-.6,-.05,.30,.38,1],[.7,-.28,.24,0,.95],[0,-1,.01,0,1],[-.72,-.05,.24,-.3,.95],[.74,.12,.26,.2,.95],[-.72,-.15,.24,0,.9],[.72,.0,.24,.3,.9],[0,-.15,.30,0,1]];
var KM=[[-.04,.8,1.28,0,1],[.62,-.78,.5,.35,.5],[.66,-.8,.42,0,.45],[0,-1,.01,0,.5],[.6,-.8,.42,-.3,.45],[.66,-.8,.42,.2,.45],[.6,-.8,.42,0,.4],[.66,-.8,.42,.3,.4],[.5,-.8,.5,0,.5]];
var tops=[],st=[.5,.12,.48,0,1],mx=0,my=0,tx=0,ty=0,scrollTarget=0,lastW=0,lastH=0;
function measure(){tops=IDS.map(function(id){var e=document.getElementById(id);return e?e.getBoundingClientRect().top+scrollY:0})}
function resize(){
  if(!R)return;
  var w=innerWidth,h=innerHeight;
  if(w===lastW&&Math.abs(h-lastH)<150)return;
  lastW=w;lastH=h;R.setPixelRatio(Math.min(devicePixelRatio||1,isMob()?1.25:1.5));R.setSize(w,h,false);
  camera.aspect=w/h;camera.updateProjectionMatrix();measure();
}
addEventListener('resize',function(){resize();measure();viewerResize()});
addEventListener('load',measure);
addEventListener('pointermove',function(e){tx=e.clientX/innerWidth-.5;ty=e.clientY/innerHeight-.5},{passive:true});
if(window.DeviceOrientationEvent&&isMob()){addEventListener('deviceorientation',function(e){if(e.gamma==null)return;tx=Math.max(-.5,Math.min(.5,e.gamma/60));ty=Math.max(-.5,Math.min(.5,(e.beta-50)/80))},{passive:true})}
resize();measure();
camera&&camera.position.set(0,2.4,12);

function target(){
  var K=isMob()?KM:KD,y=scrollY+innerHeight*.4,i=0;
  for(var k=0;k<tops.length;k++){if(tops[k]<=y)i=k}
  var j=Math.min(i+1,K.length-1),span=(tops[j]-tops[i])||1,f=smooth(0,1,(y-tops[i])/span),out=[];
  for(var q=0;q<5;q++)out.push(K[i][q]+(K[j][q]-K[i][q])*f);
  out.push(i+f);return out;
}

/* =====================================================
   VIEWER: drag-to-spin kullad (size + pattern)
   ===================================================== */
var V=null;
var INFO={100:['Mini Kullad','Tasting, sweets & dessert servings.'],150:['Classic Cup','The everyday chai cup.'],250:['Chai Glass','Cafés, stalls and offices.'],300:['Royal Glass','Lassi, shakes and big chai.'],350:['Jumbo Glass','Generous servings, cold drinks.']};
(function(){
  var el=document.getElementById('viewer');if(!el)return;
  var cv=el.querySelector('canvas'),r;
  try{r=setupRenderer(cv)}catch(e){el.querySelector('.stage').style.display='none';return}
  var sc=new T.Scene(),cam=new T.PerspectiveCamera(30,1,.1,60);cam.position.set(0,3.1,10.5);
  var k=lights(sc,r);k.position.set(5,9,6);k.target.position.set(0,0,0);
  sc.add(shadowPlane(7));
  var holder=new T.Group();sc.add(holder);
  var cur={ml:300,p:'scallop'},cup=null,s=1,sT=1,yaw=.6,vel=0,drag=false,lastX=0,vis=false,idle=0;
  var seg=isMob()?128:192;
  function rebuild(){
    if(cup){holder.remove(cup);cup.userData.geo.dispose()}
    cup=makeCup(cur.ml,cur.p,0xffffff,seg);holder.add(cup);
    sT=4.2/SPEC[cur.ml].h*.8+ (SPEC[cur.ml].h/3.05)*.2; // keep size differences visible
    sT=1.25*(.55+.45*SPEC[cur.ml].h/3.05);
    document.getElementById('vname').textContent=INFO[cur.ml][0]+' · '+cur.ml+' ml';
    document.getElementById('vdesc').textContent=INFO[cur.ml][1];
  }
  rebuild();
  el.querySelectorAll('.chips button').forEach(function(b){
    b.addEventListener('click',function(){
      var grp=b.parentNode,kk=grp.getAttribute('data-k');
      grp.querySelectorAll('button').forEach(function(x){x.classList.remove('on')});b.classList.add('on');
      cur[kk]=kk==='ml'?+b.getAttribute('data-v'):b.getAttribute('data-v');rebuild();
    });
  });
  var stage=el.querySelector('.stage');
  stage.addEventListener('pointerdown',function(e){drag=true;lastX=e.clientX;vel=0;idle=0;try{stage.setPointerCapture(e.pointerId)}catch(_){}});
  stage.addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-lastX;lastX=e.clientX;yaw+=dx*.012;vel=dx*.012;idle=0});
  var up=function(){drag=false};
  stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
  new IntersectionObserver(function(es){vis=es[0].isIntersecting}).observe(el);
  function size(){var w=stage.clientWidth,h=stage.clientHeight;r.setPixelRatio(Math.min(devicePixelRatio||1,isMob()?1.25:1.5));r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();cam.position.z=w/h<.9?13.5:10.5}
  size();
  V={render:function(t){
    if(!vis)return;
    if(!drag){idle+=1;vel*=.95;yaw+=vel+(idle>60&&!reduce?.006:0)}
    s+=(sT-s)*.12;holder.scale.setScalar(s);holder.rotation.y=yaw;
    var hh=SPEC[cur.ml].h*s;cam.lookAt(0,hh*.46,0);
    r.shadowMap.needsUpdate=true;r.render(sc,cam);
  },resize:size};
})();
function viewerResize(){if(V)V.resize()}

/* ---------- main loop ---------- */
var t0=performance.now();
var fc=0,lastT=0,lastOp=-1;
function frame(now){
  requestAnimationFrame(frame);
  if(document.hidden)return;
  if(now-lastT<(isMob()?30:15))return;lastT=now;fc++;
  var t=(performance.now()-t0)/1000;
  if(R){
    var tg=target(),k=.07;
    for(var q=0;q<5;q++)st[q]+=(tg[q]-st[q])*k;
    mx+=(tx-mx)*.05;my+=(ty-my)*.05;
    var mob=isMob(),dist=camera.position.z,visH=2*Math.tan(camera.fov*Math.PI/360)*dist,visW=visH*camera.aspect;
    var W=mob?5.3:7.9,scale=Math.max(.001,visW*st[2]/W);
    world.scale.setScalar(scale);
    world.position.set(st[0]*visW/2,1.4+st[1]*visH/2-1.6*scale-.1,0);
    world.rotation.y=(reduce?0:Math.sin(t*.28)*.35)+tg[5]*.55+mx*.9;
    camera.position.x=-mx*.8;camera.position.y=2.4+my*-.6;camera.lookAt(0,1.4,0);
    key.position.set(world.position.x+3,12,5);key.target.position.copy(world.position);
    var big=scale*7>0;
    cups.forEach(function(c,i){
      c.rotation.y+=reduce?0:.004*c.userData.dir;
      c.rotation.z+=((st[3]*(i===0?1:.6))-c.rotation.z)*.1;
    });
    // steam
    if(steam&&!reduce){var pa=sg.attributes.position;for(var i=0;i<SN;i++){var y=pa.array[i*3+1]+sv[i];if(y>2.4){y=0;pa.array[i*3]=(Math.random()-.5)*.7;pa.array[i*3+2]=(Math.random()-.5)*.7}pa.array[i*3+1]=y;pa.array[i*3]+=Math.sin(t*1.2+i)*.0025}pa.needsUpdate=true;steam.material.opacity=.32*(1-Math.min(1,st[3]*2))}
    if(Math.abs(st[4]-lastOp)>.01){canvas.style.opacity=st[4];lastOp=st[4]}
    if(st[2]>.03){R.shadowMap.needsUpdate=(fc%2===0);R.render(scene,camera)}
  }
  if(V)V.render(t);
}
requestAnimationFrame(frame);
})();
