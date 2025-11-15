import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// --- NUEVO: Importar el objeto 'Water' para agua realista ---
import { Water } from 'three/addons/objects/Water.js';

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
// --- MODIFICADO: El fondo ahora será el skybox ---
// scene.background = new THREE.Color(0x0b1220); 
scene.fog = new THREE.Fog(0x0b1220, 10, 42);

// Cámara
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 250);
camera.position.set(9, 4.2, 9);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
// --- MODIFICADO: Habilitar sombras y mejor manejo de color ---
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
root.appendChild(renderer.domElement);

// Luces
scene.add(new THREE.HemisphereLight(0xaed8ff, 0x0a0f1a, 0.4)); // Bajamos la intensidad de la hemisférica
const dir = new THREE.DirectionalLight(0xffffff, 1.5); // Subimos la del sol
dir.position.set(5, 7, 4);
// --- NUEVO: Configuración de sombras para la luz direccional ---
dir.castShadow = true;
dir.shadow.mapSize.width = 2048;
dir.shadow.mapSize.height = 2048;
dir.shadow.camera.left = -15;
dir.shadow.camera.right = 15;
dir.shadow.camera.top = 15;
dir.shadow.camera.bottom = -15;
dir.shadow.camera.near = 0.5;
dir.shadow.camera.far = 50;
scene.add(dir);

/* --- NUEVO: SKYBOX Y MAPA DE ENTORNO --- */
const path = 'https://threejs.org/examples/textures/cube/Park2/';
const urls = [ 'posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg' ];
const cubeMap = new THREE.CubeTextureLoader().setPath(path).load(urls);
scene.background = cubeMap; // Fondo de la escena
scene.environment = cubeMap;  // Reflejos en los materiales

/* --- NUEVO: CARGADOR DE TEXTURAS --- */
const textureLoader = new THREE.TextureLoader();

// Textura de roca (para terreno y presa)
const rockTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/rock.jpg');
rockTexture.wrapS = rockTexture.wrapT = THREE.RepeatWrapping;
rockTexture.repeat.set(50, 8); // Repetir 50x en X, 8x en Z

// Textura de "concreto" (para la losa)
const slabTexture = textureLoader.load('https://threejs.org/examples/textures/hardwood2_diffuse.jpg');
slabTexture.wrapS = slabTexture.wrapT = THREE.RepeatWrapping;
slabTexture.repeat.set(8, 4); // Repetir 8x en L, 4x en H

// Textura de asfalto (para el camino)
const roadTexture = textureLoader.load('https://threejs.org/examples/textures/brick_diffuse.jpg');
roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping;
roadTexture.repeat.set(10, 1);


/* ========================================================================== */
/* PARÁMETROS (Sin cambios)                                                  */
/* ========================================================================== */
const WATER_LEVEL = 1.50;
const VALLEY_W    = 12;
const VALLEY_L    = 200;
const SEGS        = 120;

/* ========================================================================== */
/* TERRENO                                                                   */
/* ========================================================================== */
const terrGeo = new THREE.PlaneGeometry(VALLEY_L, VALLEY_W, SEGS, SEGS);
for(let i=0;i<terrGeo.attributes.position.count;i++){
  const x = terrGeo.attributes.position.getX(i);
  const z = terrGeo.attributes.position.getY(i);
  const ridge = 2.4 * smoothstep(2.0, VALLEY_W*0.45, Math.abs(z));
  const n = 0.6 * fbm((x+60)/7, (z+40)/5);
  let h = n * 0.1; 
  h += ridge;
  const basinDepth = 1.8;
  const basin = basinDepth * smoothstep(0, VALLEY_L*0.2, -x); // x<0 piso de aguas arriba
  h -= basin;
  terrGeo.attributes.position.setZ(i, h);
}
terrGeo.computeVertexNormals();

// --- MODIFICADO: Aplicar textura de roca ---
const terrMat = new THREE.MeshStandardMaterial({ 
    map: rockTexture, 
    roughness: 0.95 
});
const terrain = new THREE.Mesh(terrGeo, terrMat);
terrain.rotation.x = -Math.PI/2;
terrain.position.set(0, 0.0, 0);
// --- NUEVO: El terreno recibe sombras ---
terrain.receiveShadow = true; 
scene.add(terrain);

// Wire opcional (Sin cambios)
const terrWire = new THREE.LineSegments(
  new THREE.EdgesGeometry(terrGeo, 8),
  new THREE.LineBasicMaterial({ color:0x94a3b8, opacity:0.22, transparent:true })
);
terrWire.rotation.copy(terrain.rotation);
terrWire.position.copy(terrain.position);
terrWire.visible = false;
scene.add(terrWire);

/* ========================================================================== */
/* PRESA CFRD                                                                */
/* ========================================================================== */
function buildCFRD({H=2.0, crest=0.55, mup=1.45, mdown=1.7, L=8.0}) {
  const g = new THREE.Group();
  const runUp = mup * H;
  const runDn = mdown * H;

  // Perfil a extruir (Sin cambios)
  const sec = new THREE.Shape();
  sec.moveTo(0, 0);
  sec.lineTo(runUp, H);
  sec.lineTo(runUp + crest, H);
  sec.lineTo(runUp + crest + runDn, 0);
  sec.closePath();

  // Terraplén
  const embGeo = new THREE.ExtrudeGeometry(sec, { depth: L, bevelEnabled:false });
  embGeo.translate(0, 0, -L/2);
  // --- MODIFICADO: Usar una copia de la textura de roca ---
  const damRockTexture = rockTexture.clone();
  damRockTexture.repeat.set(4, 2); // Ajustar repetición para la presa
  damRockTexture.needsUpdate = true;
  const embMat = new THREE.MeshStandardMaterial({ 
      map: damRockTexture, 
      roughness: 0.95 
  });
  const emb = new THREE.Mesh(embGeo, embMat);
  g.add(emb);

  // Losa (cara aguas arriba)
  const slopeLen = Math.sqrt(runUp*runUp + H*H);
  const slabGeo = new THREE.PlaneGeometry(L, slopeLen);
  // --- MODIFICADO: Usar textura de "concreto" y más reflectivo ---
  const slabMat = new THREE.MeshStandardMaterial({ 
      map: slabTexture, 
      metalness: 0.3, // Un poco metálico para reflejar el cielo
      roughness: 0.4, // No tan rugoso
      side:THREE.DoubleSide 
  });
  const slab = new THREE.Mesh(slabGeo, slabMat);
  const axisX = new THREE.Vector3(0,0,1).normalize();
  const axisY = new THREE.Vector3(runUp, H, 0).normalize();
  const axisZ = new THREE.Vector3().crossVectors(axisX, axisY).normalize();
  const mat = new THREE.Matrix4().makeBasis(axisX, axisY, axisZ);
  slab.setRotationFromMatrix(mat);
  slab.position.set(runUp/2, H/2, 0);
  g.add(slab);

  // Corona/camino
  // --- MODIFICADO: Textura de asfalto/ladrillo ---
  const road = new THREE.Mesh(new THREE.BoxGeometry(crest, 0.07, L),
    new THREE.MeshStandardMaterial({ 
        map: roadTexture, 
        roughness: 0.8 
    }));
  road.position.set(runUp + crest/2, H + 0.05, 0);
  g.add(road);

  return { group:g, H, crest, runUp, runDn, L };
}

const CFRD = buildCFRD({ H:2.0, crest:0.55, mup:1.45, mdown:1.7, L:8.0 });
const dam  = CFRD.group;
dam.position.set(0, 0.02, 0);
// --- NUEVO: Hacer que toda la presa (hijos) proyecte y reciba sombras ---
dam.traverse(child => {
    if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
    }
});
scene.add(dam);

/* Cara aguas arriba en mundo (alineación con agua) */
const X_FACE_UP = 2.15;
const EPS_EDGE  = 0.005;

/* ========================================================================== */
/* EMBALSE (REHECHO CON 'Water')                                             */
/* ========================================================================== */
const RES_W = 20;
const RES_H = 10;

// Extremos del agua (Sin cambios)
const xMin = X_FACE_UP - RES_W;
const xMax = X_FACE_UP - EPS_EDGE;
const centerX = (xMin + xMax) * 0.5;
const widthX  = (xMax - xMin);

// --- NUEVO: Reemplazar PlaneGeometry simple por el objeto Water ---
const waterGeometry = new THREE.PlaneGeometry(widthX, RES_H, 72, 48);
const waterNormals = textureLoader.load('https://threejs.org/examples/textures/waternormals.jpg', (texture) => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
});

const water = new Water(
    waterGeometry,
    {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: waterNormals,
        sunDirection: dir.position.clone().normalize(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f, // Un color de agua profundo
        distortionScale: 3.7,
        fog: scene.fog !== undefined
    }
);

water.rotation.x = -Math.PI / 2;
water.position.set(centerX, WATER_LEVEL, 0);
scene.add(water);

// --- ELIMINADO: El 'edge' de espuma ya no es necesario ---
// scene.add(edge);

/* ========================================================================== */
/* GRID                                                                      */
/* ========================================================================== */
const grid = new THREE.GridHelper(60, 60, 0x264064, 0x1b2a45);
grid.position.y = -0.001; 
// --- MODIFICADO: Ocultar la grilla para un look limpio ---
// scene.add(grid);

/* ========================================================================== */
/* CONTROLES + HUD (Sin cambios)                                             */
/* ========================================================================== */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.05;
controls.target.set(CFRD.runUp + CFRD.crest*0.5 - 0.6, CFRD.H*0.6, 0);
controls.autoRotate = false; controls.autoRotateSpeed = 0.6;
controls.maxPolarAngle = Math.PI/2.02;

const labAuto = document.getElementById('lab-autorotate');
const labWire = document.getElementById('lab-wire');
document.getElementById('btn-autorotate').onclick = () => {
  controls.autoRotate = !controls.autoRotate;
  labAuto.textContent = controls.autoRotate ? 'ON' : 'OFF';
};
let wireOn = false;
document.getElementById('btn-wire').onclick = () => {
  wireOn = !wireOn; terrWire.visible = wireOn; labWire.textContent = wireOn ? 'ON' : 'OFF';
};
document.getElementById('btn-reset').onclick = () => {
  camera.position.set(9,4.2,9);
  controls.target.set(CFRD.runUp + CFRD.crest*0.5 - 0.6, CFRD.H*0.6, 0);
  controls.update();
};

/* ========================================================================== */
/* MARCADORES + CASETA                                                       */
/* ========================================================================== */
const raycaster = new THREE.Raycaster();
const pointer   = new THREE.Vector2();
const markers   = [];
const pickables = [];

const markerMat = new THREE.MeshBasicMaterial({ color:0x33ffcc, transparent:true });
const markerGeo = new THREE.SphereGeometry(0.06, 12, 12);

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

/* ---- Piezómetros (Sin cambios) */
(function addPiezometersOnCrest(){
  const N = 9;
  const marginZ = 0.35;
  const zStart = -CFRD.L/2 + marginZ;
  const zEnd   =  CFRD.L/2 - marginZ;
  const x = CFRD.runUp + CFRD.crest*0.5;
  const y = CFRD.H + 0.10;
  for (let i=0; i<N; i++){
    const t = N===1 ? 0.5 : i/(N-1);
    const z = lerp(zStart, zEnd, t);
    addMarker(x, y, z, `PZ-${pad(i+1)}`);
  }
})();

/* ---- Caseta */
(function addCaseta(){
  const toeX = CFRD.runUp + CFRD.crest + CFRD.runDn;
  const caseta = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.35, 0.45),
    new THREE.MeshStandardMaterial({ color:0xf0da4c, roughness:0.5, metalness:0.1 })
  );
  caseta.position.set(toeX, 0.35 / 2, 0.0);
  caseta.userData = { name:'Caseta N°3 (ingesta automática)', kind:'caseta' };
  
  // --- NUEVO: La caseta también proyecta sombras ---
  caseta.castShadow = true;
  
  scene.add(caseta);
  pickables.push(caseta);
})();


/* Tooltips (Sin cambios) */
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
  const hit = raycaster.intersectObjects(pickables, false)[0];
  if (hit) {
    const p = hit.point.clone().project(camera);
    const x = (p.x*.5+.5)*rect.width + rect.left;
    const y = (-p.y*.5+.5)*rect.height + rect.top;
    tip.style.left = `${x}px`; tip.style.top = `${y}px`;
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
  // t += 0.01; // Ya no se usa para las olas

  // --- MODIFICADO: Animar el shader del objeto Water ---
  water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
  
  // --- ELIMINADO: El bucle de olas manual ---
  /*
  const pos = reservoir.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x = pos.getX(i), y = pos.getY(i);
    const h = Math.sin((x+t)*0.35)*0.02 + Math.cos((y-t)*0.28)*0.02;
    pos.setZ(i, h);
  }
  pos.needsUpdate = true;
  reservoir.geometry.computeVertexNormals();
  */

  // Piezómetros “respiran” (Sin cambios)
  markers.forEach((m,i)=>{
    const s = 1 + Math.sin(performance.now()*0.004 + i)*0.08;
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