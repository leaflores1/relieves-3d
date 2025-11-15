import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ========================================================================== */
/* UTILIDADES (Sin cambios)                                                  */
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
/* ESCENA BASE + RENDER                                                      */
/* ========================================================================== */
const host = document.getElementById('hero3d') || document.body;
const root = document.getElementById('three-root');

const scene = new THREE.Scene();
// --- MEJORADO: Fondo y Niebla (ajustado para cielo) ---
scene.background = new THREE.Color(0x3e526b); 
scene.fog = new THREE.Fog(0x3e526b, 15, 60);

// Cámara
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 250);
camera.position.set(12, 6, 12); // Posición inicial mejorada

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
// --- MEJORADO: Habilitar Sombras y Tonalidad ---
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
root.appendChild(renderer.domElement);

// Luces mejoradas (Dir ahora proyecta sombras)
scene.add(new THREE.HemisphereLight(0xaed8ff, 0x1a2332, 0.6));
const dir = new THREE.DirectionalLight(0xffffff, 1.5); // Más brillante para sombras
dir.position.set(10, 15, 10); 
// --- MEJORADO: Configuración de sombras ---
dir.castShadow = true;
dir.shadow.mapSize.width = 2048;
dir.shadow.mapSize.height = 2048;
dir.shadow.camera.left = -20;
dir.shadow.camera.right = 20;
dir.shadow.camera.top = 20;
dir.shadow.camera.bottom = -20;
dir.shadow.camera.near = 0.1;
dir.shadow.camera.far = 80;
scene.add(dir);

const fill = new THREE.DirectionalLight(0x5580aa, 0.4);
fill.position.set(-3,3,-4); scene.add(fill);

/* ========================================================================== */
/* PARÁMETROS (Sin cambios)                                                  */
/* ========================================================================== */
const WATER_LEVEL = 1.50;
const VALLEY_W    = 14;
const VALLEY_L    = 200;
const SEGS        = 140;

/* ========================================================================== */
/* TERRENO MEJORADO - REALISTA CON MONTAÑAS ALTAS                              */
/* ========================================================================== */
const terrGeo = new THREE.PlaneGeometry(VALLEY_L, VALLEY_W, SEGS, SEGS);
for(let i=0;i<terrGeo.attributes.position.count;i++){
  const x = terrGeo.attributes.position.getX(i);
  const z = terrGeo.attributes.position.getY(i);

  // Cauce del río en el centro (forma de V)
  const riverWidth = 1.2;
  const riverDepth = 0.3;
  const distToCenter = Math.abs(z);
  const riverCut = riverDepth * Math.max(0, 1 - distToCenter/riverWidth);

  // --- MODIFICADO: Laderas del valle más pronunciadas (Montañas) ---
  const valleyWidth = VALLEY_W * 0.42;
  const slopeStart = 1.0; // Inicia antes
  const valleyHeight = 6.0; // Mayor altura de la montaña (Antes 3.2)
  const valleySlope = valleyHeight * smoothstep(slopeStart, valleyWidth, distToCenter);
  
  // Rugosidad de las laderas (erosión, rocas)
  const roughness = 0.45 * fbm((x+60)/8, (z+40)/6) * smoothstep(0.5, 2.5, distToCenter);
  
  // Ondulaciones del terreno (estratos geológicos)
  const strata = 0.25 * Math.sin(distToCenter * 3.2) * smoothstep(2.0, 4.0, distToCenter);
  
  // Altura base del terreno
  let h = valleySlope + roughness + strata - riverCut;

  // Aguas arriba: embalse (depresión gradual)
  const basinDepth = 2.5; // Mayor profundidad del embalse
  const basinTransition = VALLEY_L * 0.25;
  const basin = basinDepth * smoothstep(0, basinTransition, -x);
  h -= basin;

  // Transición suave cerca de la presa (para evitar picos)
  const damZone = smoothstep(-5, 5, x);
  const preDamSmooth = 0.4 * Math.sin(x * 0.5) * (1 - damZone);
  h += preDamSmooth;

  // Aguas abajo: piso nivelado con transición suave
  const downstreamFlatten = (valleySlope + roughness - riverCut * 0.5) * smoothstep(0, VALLEY_L*0.18, x);
  h -= downstreamFlatten;
  
  // Pequeñas irregularidades en el piso aguas abajo
  if(x > 0 && distToCenter < 3) {
    const floorNoise = 0.12 * fbm((x+30)/12, (z+20)/10);
    h += floorNoise;
  }

  terrGeo.attributes.position.setZ(i, h);
}
terrGeo.computeVertexNormals();

// Material del terreno (ahora proyecta y recibe sombras)
const terrMat = new THREE.MeshStandardMaterial({ 
  color: 0x48586c, // Tono más terroso/rocoso
  roughness: 0.92,
  metalness: 0.05
});
const terrain = new THREE.Mesh(terrGeo, terrMat);
terrain.rotation.x = -Math.PI/2;
terrain.position.set(0, 0.0, 0);
// --- MEJORADO: Sombras ---
terrain.receiveShadow = true;
terrain.castShadow = true; 
scene.add(terrain);

// Wireframe (oculto por defecto)
const terrWire = new THREE.LineSegments(
  new THREE.EdgesGeometry(terrGeo, 10),
  new THREE.LineBasicMaterial({ color:0x8a99aa, opacity:0.18, transparent:true })
);
terrWire.rotation.copy(terrain.rotation);
terrWire.position.copy(terrain.position);
terrWire.visible = false;
scene.add(terrWire);

/* ========================================================================== */
/* PRESA CFRD (Ahora proyecta y recibe sombras)                               */
/* ========================================================================== */
function buildCFRD({H=2.0, crest=0.55, mup=1.45, mdown=1.7, L=8.0}) {
  const g = new THREE.Group();
  const runUp = mup * H;
  const runDn = mdown * H;

  // Perfil a extruir
  const sec = new THREE.Shape();
  sec.moveTo(0, 0);
  sec.lineTo(runUp, H);
  sec.lineTo(runUp + crest, H);
  sec.lineTo(runUp + crest + runDn, 0);
  sec.closePath();

  // Terraplén 
  const embGeo = new THREE.ExtrudeGeometry(sec, { depth: L, bevelEnabled:false });
  embGeo.translate(0, 0, -L/2);
  const embMat = new THREE.MeshStandardMaterial({ 
    color: 0x7a838f, // Color de roca/tierra
    roughness: 0.88,
    metalness: 0.08
  });
  const emb = new THREE.Mesh(embGeo, embMat);
  emb.castShadow = true; emb.receiveShadow = true; // Sombras
  g.add(emb);

  // Losa de concreto (cara aguas arriba)
  const slopeLen = Math.sqrt(runUp*runUp + H*H);
  const slabGeo = new THREE.PlaneGeometry(L, slopeLen);
  const slabMat = new THREE.MeshStandardMaterial({ 
    color: 0xcddeeb, // Color concreto claro
    metalness: 0.2, 
    roughness: 0.4, 
    side: THREE.DoubleSide 
  });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.castShadow = true; slab.receiveShadow = true; // Sombras
  const axisX = new THREE.Vector3(0,0,1).normalize();
  const axisY = new THREE.Vector3(runUp, H, 0).normalize();
  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize();
  const mat = new THREE.Matrix4().makeBasis(axisX, axisY, axisZ);
  slab.setRotationFromMatrix(mat);
  slab.position.set(runUp/2, H/2, 0);
  g.add(slab);

  // Corona/camino 
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(crest, 0.08, L),
    new THREE.MeshStandardMaterial({ 
      color: 0x4a505b, 
      roughness: 0.6, 
      metalness: 0.3 
    })
  );
  road.position.set(runUp + crest/2, H + 0.06, 0);
  road.castShadow = true; road.receiveShadow = true; // Sombras
  g.add(road);

  return { group:g, H, crest, runUp, runDn, L };
}

const CFRD = buildCFRD({ H:2.0, crest:0.55, mup:1.45, mdown:1.7, L:8.0 });
const dam  = CFRD.group;
dam.position.set(0, 0.02, 0);
scene.add(dam);

const X_FACE_UP = 2.15;
const EPS_EDGE  = 0.005;

/* ========================================================================== */
/* EMBALSE MEJORADO (Agua más profunda y animación compleja)                 */
/* ========================================================================== */
const RES_W = 22;
const RES_H = 11;

// --- MODIFICADO: Color de agua más profundo ---
const waterMat = new THREE.MeshStandardMaterial({
  color: 0x104080, // Azul profundo de embalse
  transparent: true, 
  opacity: 0.8, // Ligeramente más opaco
  roughness: 0.15, // Más reflectivo
  metalness: 0.3 // Mayor reflejo del cielo
});

const xMin = X_FACE_UP - RES_W;
const xMax = X_FACE_UP - EPS_EDGE;
const centerX = (xMin + xMax) * 0.5;
const widthX  = (xMax - xMin);

const reservoirGeo = new THREE.PlaneGeometry(widthX, RES_H, 80, 56);
const reservoir = new THREE.Mesh(reservoirGeo, waterMat);
reservoir.rotation.x = -Math.PI/2;
reservoir.position.set(centerX, WATER_LEVEL, 0);
scene.add(reservoir);

// Borde de espuma sutil (más alto y visible)
const edgeH = 0.25;
const edge = new THREE.Mesh(
  new THREE.PlaneGeometry(CFRD.L, edgeH),
  new THREE.MeshStandardMaterial({
    color: 0xd4e8ff, 
    transparent: true, 
    opacity: 0.65,
    emissive: 0x0a1b2e, 
    emissiveIntensity: 0.4, 
    side: THREE.DoubleSide
  })
);
edge.rotation.y = Math.PI/2;
edge.position.set(X_FACE_UP - EPS_EDGE*0.6, WATER_LEVEL + edgeH*0.5, 0);
scene.add(edge);

/* ========================================================================== */
/* GRID MEJORADO (Sin cambios)                                               */
/* ========================================================================== */
const grid = new THREE.GridHelper(70, 70, 0x2a4a6a, 0x1d2e42);
grid.position.y = -0.001; 
scene.add(grid);

/* ========================================================================== */
/* CONTROLES (Sin cambios)                                                   */
/* ========================================================================== */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.dampingFactor = 0.05;
controls.target.set(CFRD.runUp + CFRD.crest*0.5 - 0.6, CFRD.H*0.8, 0); // Target ajustado
controls.autoRotate = false; 
controls.autoRotateSpeed = 0.5;
controls.maxPolarAngle = Math.PI/2.02;
controls.minDistance = 3;
controls.maxDistance = 40;

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
  camera.position.set(12, 6, 12); // Posición de reset ajustada
  controls.target.set(CFRD.runUp + CFRD.crest*0.5 - 0.6, CFRD.H*0.8, 0);
  controls.update();
};

/* ========================================================================== */
/* MARCADORES + CASETA (Ahora proyectan y reciben sombras)                   */
/* ========================================================================== */
const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();
const markers   = [];
const pickables = [];

const markerMat = new THREE.MeshBasicMaterial({ color: 0x2dffbb, transparent: true });
const markerGeo = new THREE.SphereGeometry(0.06, 14, 14);

function addMarker(x, y, z, name) {
  const m = new THREE.Mesh(markerGeo, markerMat.clone());
  m.position.set(x,y,z);
  m.userData = { name, kind:'pz' };
  scene.add(m);
  markers.push(m);
  pickables.push(m);
  return m;
}

function pad(num, size=2){ return String(num).padStart(size, '0'); }

// Piezómetros
(function addPiezometersOnCrest(){
  const N = 9;
  const marginZ = 0.35;
  const zStart = -CFRD.L/2 + marginZ;
  const zEnd   =  CFRD.L/2 - marginZ;
  const x = CFRD.runUp + CFRD.crest*0.5;
  const y = CFRD.H + 0.12;

  for (let i=0; i<N; i++){
    const t = N===1 ? 0.5 : i/(N-1);
    const z = lerp(zStart, zEnd, t);
    addMarker(x, y, z, `PZ-${pad(i+1)}`);
  }
})();

// Caseta
(function addCaseta(){
  const toeX = CFRD.runUp + CFRD.crest + CFRD.runDn;
  const caseta = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.35, 0.45),
    new THREE.MeshStandardMaterial({ 
      color: 0xf5d84a, 
      roughness: 0.45, 
      metalness: 0.15,
      emissive: 0x3a2f0a,
      emissiveIntensity: 0.1
    })
  );
  caseta.position.set(toeX + 0.6, 0.175, 0.0);
  caseta.userData = { name:'Caseta N°3 (ingesta automática)', kind:'caseta' };
  caseta.castShadow = true; caseta.receiveShadow = true; // Sombras
  scene.add(caseta);
  pickables.push(caseta);
  
  // Techo de la caseta
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.15, 4),
    new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 })
  );
  roof.position.set(toeX + 0.6, 0.35 + 0.075, 0.0);
  roof.rotation.y = Math.PI/4;
  roof.castShadow = true; roof.receiveShadow = true; // Sombras
  scene.add(roof);
})();

// Tooltips (Sin cambios)
const tip = document.createElement('div');
Object.assign(tip.style, {
  position:'fixed', padding:'7px 10px', background:'rgba(5,15,25,.85)',
  color:'#b8f0e8', font:'13px system-ui,Segoe UI,Roboto', fontWeight:'500',
  border:'1px solid rgba(45,255,187,.25)', borderRadius:'6px',
  pointerEvents:'none', transform:'translate(-50%,-120%)', display:'none', 
  zIndex:12, boxShadow:'0 4px 12px rgba(0,0,0,.4)'
});
document.body.appendChild(tip);

renderer.domElement.addEventListener('pointermove', (e)=>{
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables, false)[0];
  if (hit) {
    const p = hit.point.clone().project(camera);
    const x = (p.x*.5+.5)*rect.width + rect.left;
    const y = (-p.y*.5+.5)*rect.height + rect.top;
    tip.style.left = `${x}px`; 
    tip.style.top = `${y}px`;
    tip.textContent = hit.object.userData.name || '—';
    tip.style.display = 'block';
  } else tip.style.display = 'none';
});

/* ========================================================================== */
/* ANIMACIÓN                                                                 */
/* ========================================================================== */
let t = 0;
function animate(){
  requestAnimationFrame(animate);
  t += 0.01;

  // --- MODIFICADO: Olas más complejas y sutiles (simulando agua de embalse) ---
  const pos = reservoir.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x = pos.getX(i), y = pos.getY(i);
    const wave1 = Math.sin((x+t)*0.3)*0.015;
    const wave2 = Math.cos((y-t*0.7)*0.25)*0.02;
    const wave3 = Math.sin((x*0.4+y*0.4+t*0.5))*0.01;
    const wave4 = Math.sin((x*0.1-y*0.2+t*0.9))*0.01; // Onda de fondo lenta
    pos.setZ(i, wave1 + wave2 + wave3 + wave4);
  }
  pos.needsUpdate = true;
  reservoir.geometry.computeVertexNormals();

  // Animación piezómetros (Sin cambios)
  markers.forEach((m,i)=>{
    const s = 1 + Math.sin(performance.now()*0.003 + i*0.5)*0.12;
    m.scale.set(s,s,s);
  });

  controls.update();
  renderer.render(scene, camera);
}
animate();

/* ========================================================================== */
/* RESPONSIVE (Sin cambios)                                                  */
/* ========================================================================== */
function resize(){
  const w = host.clientWidth, h = host.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);