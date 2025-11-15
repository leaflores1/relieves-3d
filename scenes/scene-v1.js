import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ========================================================================== */
/*  UTILIDADES: ruido sencillo para deformar el terreno (fbm)                 */
/* ========================================================================== */
function fract(x){ return x - Math.floor(x); }
function hash(x, y){ return fract(Math.sin(x*127.1 + y*311.7) * 43758.5453123); }
function lerp(a,b,t){ return a + (b-a)*t; }
function noise2D(x, y){
  const iX = Math.floor(x), iY = Math.floor(y);
  const fX = x - iX, fY = y - iY;
  const v00 = hash(iX, iY), v10 = hash(iX+1, iY);
  const v01 = hash(iX, iY+1), v11 = hash(iX+1, iY+1);
  const v0 = lerp(v00, v10, fX);
  const v1 = lerp(v01, v11, fX);
  return lerp(v0, v1, fY);
}
function fbm(x, y){
  let t = 0, a = .5, f = 1;
  for(let i=0;i<4;i++){ t += a * noise2D(x*f, y*f); f*=2; a*=.5; }
  return t;
}
function smoothstep(a,b,x){ const t=Math.min(Math.max((x-a)/(b-a),0),1); return t*t*(3-2*t); }

/* ========================================================================== */
/*  ESCENA BASE + RENDER                                                      */
/* ========================================================================== */
const host = document.getElementById('hero3d') || document.body; // contenedor (hero fijo) o página completa
const root = document.getElementById('three-root');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1220);
scene.fog = new THREE.Fog(0x0b1220, 10, 42);

// Cámara
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 250);
camera.position.set(9, 4.2, 9);

// Renderer (limitamos pixel ratio para no “pesar”)
const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = false;
root.appendChild(renderer.domElement);

// Luces
scene.add(new THREE.HemisphereLight(0xaed8ff, 0x0a0f1a, 0.95));
const dir = new THREE.DirectionalLight(0xffffff, 1); 
dir.position.set(5,7,4); 
scene.add(dir);

/* ========================================================================== */
/*  PARÁMETROS HIDRÁULICOS / GEOMÉTRICOS                                     */
/* ========================================================================== */
const WATER_LEVEL = 1.50;   // altura del espejo de agua del embalse
const VALLEY_W    = 12;     // ancho del valle (eje Z)
const VALLEY_L    = 44;     // largo del valle (eje X)
const SEGS        = 120;    // resolución del terreno

/* ========================================================================== */
/*  TERRENO: valle con laderas y depresión del embalse aguas arriba          */
/*  - x < 0  : embalse (depresión “basin”)                                   */
/*  - x > 0  : aguas abajo, más seco y algo más alto                          */
/* ========================================================================== */
const terrGeo = new THREE.PlaneGeometry(VALLEY_L, VALLEY_W, SEGS, SEGS);
for(let i=0;i<terrGeo.attributes.position.count;i++){
  const x = terrGeo.attributes.position.getX(i); // -L..+L (luego será X mundo)
  const z = terrGeo.attributes.position.getY(i); // -W..+W (luego será Z mundo)

  // Laderas: crecen con |z|
  const ridge = 0.0 + 2.4 * smoothstep(2.0, VALLEY_W*0.45, Math.abs(z));

  // Relieve base
  const n = 0.6 * fbm((x+60)/7, (z+40)/5);
  let h = ridge + n;

  // Embalse (x<0): depresión progresiva hacia aguas arriba
  const basinDepth = 1.3;
  const basin = basinDepth * smoothstep(0, VALLEY_L*0.35, -x);
  h -= basin;

  // Aguas abajo (x>0): levanto un poco para diferenciar y “secar”
  const dry = 0.6 * smoothstep(0, VALLEY_L*0.30, x);
  h += dry;

  terrGeo.attributes.position.setZ(i, h);
}
terrGeo.computeVertexNormals();

const terrMat = new THREE.MeshStandardMaterial({ color:0x3b4252, roughness:0.95 });
const terrain = new THREE.Mesh(terrGeo, terrMat);
terrain.rotation.x = -Math.PI/2;
terrain.position.set(0, 0.0, 0);
scene.add(terrain);

// Wire opcional (HUD -> Wireframe)
const terrWire = new THREE.LineSegments(
  new THREE.EdgesGeometry(terrGeo, 8),
  new THREE.LineBasicMaterial({ color:0x94a3b8, opacity:0.22, transparent:true })
);
terrWire.rotation.copy(terrain.rotation);
terrWire.position.copy(terrain.position);
terrWire.visible = false;
scene.add(terrWire);

/* ========================================================================== */
/*  PRESA TIPO CFRD (cara aguas arriba de hormigón)                           */
/*  - Se construye una sección trapezoidal y se extruye en Z (longitud L).    */
/*  - La cara AGUAS ARRIBA queda sobre x = 0 (para alinear el embalse).       */
/* ========================================================================== */
function buildCFRD({H=2.0, crest=0.55, mup=1.45, mdown=1.7, L=8.0}) {
  const g = new THREE.Group();
  const runUp = mup * H;    // proyección horizontal aguas arriba
  const runDn = mdown * H;  // proyección horizontal aguas abajo

  // Perfil 2D (x,y) a extruir
  const sec = new THREE.Shape();
  sec.moveTo(0, 0);                        // cara aguas arriba EN x = 0
  sec.lineTo(runUp, H);
  sec.lineTo(runUp + crest, H);
  sec.lineTo(runUp + crest + runDn, 0);
  sec.closePath();

  // Terraplén
  const embGeo = new THREE.ExtrudeGeometry(sec, { depth: L, bevelEnabled:false });
  embGeo.translate(0, 0, -L/2);
  const embMat = new THREE.MeshStandardMaterial({ color:0x6b7280, roughness:0.95 });
  const emb = new THREE.Mesh(embGeo, embMat);
  g.add(emb);

  // Losa de hormigón (cara aguas arriba) colocada paralela al talud
  const slopeLen = Math.sqrt(runUp*runUp + H*H);
  const slabGeo = new THREE.PlaneGeometry(L, slopeLen);
  const slabMat = new THREE.MeshStandardMaterial({ color:0xd9dfe6, metalness:0.25, roughness:0.35, side:THREE.DoubleSide });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  const axisX = new THREE.Vector3(0,0,1).normalize();           // a lo largo (Z)
  const axisY = new THREE.Vector3(runUp, H, 0).normalize();     // normalizada sobre talud
  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize();
  const mat = new THREE.Matrix4().makeBasis(axisX, axisY, axisZ);
  slab.setRotationFromMatrix(mat);
  slab.position.set(runUp/2, H/2, 0);
  g.add(slab);

  // Corona/camino
  const road = new THREE.Mesh(new THREE.BoxGeometry(crest, 0.07, L),
    new THREE.MeshStandardMaterial({ color:0x3b3f46, roughness:0.55, metalness:0.25 }));
  road.position.set(runUp + crest/2, H + 0.05, 0);
  g.add(road);

  // “Portal” simbólico
  const house = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25),
    new THREE.MeshStandardMaterial({ color:0xf0da4c, roughness:0.5, metalness:0.1 }));
  house.position.set(runUp + crest*0.8, H + 0.15, L*0.30);
  g.add(house);

  return { group:g, H, crest, runUp, runDn, L };
}

// Creo la presa y la pongo con su CARA AGUAS ARRIBA en x=0
const CFRD = buildCFRD({ H:2.0, crest:0.55, mup:1.45, mdown:1.7, L:8.0 });
const dam = CFRD.group;
dam.position.set(0, 0.02, 0);
scene.add(dam);

// Guardamos la posición X de la cara aguas arriba (mundo): coincide con 0
const X_FACE_UP = 2.15; //dam.position.x        // = 0
const EPS_EDGE  = 0.005;                 // tolerancia para evitar z-fighting

/* ========================================================================== */
/*  EMBALSE (AGUA SOLO AGUAS ARRIBA)                                          */
/*  - Plano horizontal cuyo borde derecho se ALINEA con x = X_FACE_UP         */
/*    (con un pequeño “EPS_EDGE” para evitar parpadeo de z-buffer).           */
/*  - NO dibujamos agua aguas abajo.                                          */
/*  - Agregamos una “tira de borde/espuma” contra la presa para remarcarlo.   */
/* ========================================================================== */
const RES_W = 20;   // ancho del embalse en X (aguas arriba)
const RES_H = 10;   // ancho total en Z

const waterMat = new THREE.MeshStandardMaterial({
  color:0x2563eb, transparent:true, opacity:0.72, roughness:0.35, metalness:0.15
});

// El embalse va de x = X_FACE_UP - RES_W  hasta x = X_FACE_UP - EPS_EDGE
// Centrado en X: centerX = (xmin + xmax)/2
const xMin = X_FACE_UP - RES_W;
const xMax = X_FACE_UP - EPS_EDGE ; //ojo
const centerX = (xMin + xMax) * 0.5;
const widthX  = (xMax - xMin);

const reservoirGeo = new THREE.PlaneGeometry(widthX, RES_H, 72, 48);
const reservoir = new THREE.Mesh(reservoirGeo, waterMat);
reservoir.rotation.x = -Math.PI/2;
reservoir.position.set(centerX, WATER_LEVEL, 0);
scene.add(reservoir);

// Tira de “borde” contra la cara (efecto espuma/contacto)
const edgeH = 0.0;                           // altura visible de la tira
const edge = new THREE.Mesh(
  new THREE.PlaneGeometry(CFRD.L, edgeH),
  new THREE.MeshStandardMaterial({
    color:0xcfe8ff, transparent:true, opacity:0.65,
    emissive:0x0a1b2e, emissiveIntensity:0.25, side:THREE.DoubleSide
  })
);
// Vertical, pegada a la cara aguas arriba (ligeramente a su izquierda)
edge.rotation.y = Math.PI/2;
edge.position.set(X_FACE_UP  - EPS_EDGE*0.6, WATER_LEVEL + edgeH*0.5, 50);
scene.add(edge);

/* ========================================================================== */
/*  GRID / REFERENCIA                                                          */
/* ========================================================================== */
const grid = new THREE.GridHelper(60, 60, 0x264064, 0x1b2a45);
grid.position.y = -0.001;
scene.add(grid);

/* ========================================================================== */
/*  CONTROLES + HUD                                                            */
/* ========================================================================== */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.dampingFactor = 0.05;
controls.target.set(CFRD.runUp + CFRD.crest*0.5 - 0.6, CFRD.H*0.6, 0); // mira al “corazón” de la presa
controls.autoRotate = false; 
controls.autoRotateSpeed = 0.6;
controls.maxPolarAngle = Math.PI/2.02;

// HUD
const labAuto = document.getElementById('lab-autorotate');
const labWire = document.getElementById('lab-wire');
document.getElementById('btn-autorotate').onclick = () => {
  controls.autoRotate = !controls.autoRotate;
  labAuto.textContent = controls.autoRotate ? 'ON' : 'OFF';
};
let wireOn = false;
document.getElementById('btn-wire').onclick = () => {
  wireOn = !wireOn; 
  terrWire.visible = wireOn; 
  labWire.textContent = wireOn ? 'ON' : 'OFF';
};
document.getElementById('btn-reset').onclick = () => {
  camera.position.set(9,4.2,9);
  controls.target.set(CFRD.runUp + CFRD.crest*0.5 - 0.6, CFRD.H*0.6, 0);
  controls.update();
};

/* ========================================================================== */
/*  MARCADORES (puntos de instrumentos con hover)                              */
/* ========================================================================== */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const markers = [];
const markerMat = new THREE.MeshBasicMaterial({ color:0x33ffcc, transparent:true });
const markerGeo = new THREE.SphereGeometry(0.06, 12, 12);

function addMarker(x, y, z, name) {
  const m = new THREE.Mesh(markerGeo, markerMat.clone());
  m.position.set(x,y,z); 
  m.userData={name}; 
  scene.add(m); 
  markers.push(m); 
  return m;
}
// Ejemplos: sobre losa, en corona y uno en el embalse
addMarker(CFRD.runUp*0.78, CFRD.H*0.75,  CFRD.L*0.08, 'PZ-01');
addMarker(CFRD.runUp + CFRD.crest*0.5, CFRD.H+0.14, CFRD.L*0.30, 'Nivel-Corona');
addMarker(centerX - widthX*0.35, WATER_LEVEL+0.04, -1.2, 'Boyarín FR-01');

// Tooltip simple
const tip = document.createElement('div');
Object.assign(tip.style, {
  position:'fixed', padding:'6px 8px', background:'rgba(0,0,0,.72)',
  color:'#c8f3e8', font:'12px system-ui,Segoe UI,Roboto',
  border:'1px solid rgba(255,255,255,.15)', borderRadius:'8px',
  pointerEvents:'none', transform:'translate(-50%,-120%)', display:'none', zIndex:12
});
document.body.appendChild(tip);

renderer.domElement.addEventListener('pointermove', (e)=>{
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(markers, false)[0];
  if (hit) {
    const p = hit.point.clone().project(camera);
    const x = (p.x*.5+.5)*rect.width + rect.left;
    const y = (-p.y*.5+.5)*rect.height + rect.top;
    tip.style.left = `${x}px`; tip.style.top = `${y}px`;
    tip.textContent = hit.object.userData.name; 
    tip.style.display = 'block';
  } else tip.style.display = 'none';
});

/* ========================================================================== */
/*  ANIMACIÓN (olas suaves y “latido” de marcadores)                           */
/* ========================================================================== */
let t = 0;
function animate(){
  requestAnimationFrame(animate);
  t += 0.01;

  // Olas embalse (solo aguas arriba)
  const pos = reservoir.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x = pos.getX(i), y = pos.getY(i);
    const h = Math.sin((x+t)*0.35)*0.02 + Math.cos((y-t)*0.28)*0.02;
    pos.setZ(i, h);
  }
  pos.needsUpdate = true;
  reservoir.geometry.computeVertexNormals();

  // Marcadores “respiran”
  markers.forEach((m,i)=>{
    const s = 1 + Math.sin(performance.now()*0.004 + i)*0.08;
    m.scale.set(s,s,s);
  });

  controls.update();
  renderer.render(scene, camera);
}
animate();

/* ========================================================================== */
/*  RESPONSIVE                                                                 */
/* ========================================================================== */
function resize(){
  const w = host.clientWidth, h = host.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);
