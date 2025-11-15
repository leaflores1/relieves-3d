// public/js/terrain.js
import * as THREE from 'three';

export async function createPotrerillosTerrain() {
  const loader = new THREE.TextureLoader();

  // 1) Cargar heightmap
  const heightmap = await loader.loadAsync('assets/dem/relieve-potrerillos-heightmapPNG.png');

  const width  = heightmap.image.width;
  const height = heightmap.image.height;

  // 2) Volcar a canvas para leer píxeles
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = width;
  canvas.height = height;
  ctx.drawImage(heightmap.image, 0, 0);

  const imgData = ctx.getImageData(0, 0, width, height).data;

  // 3) Buscar min/max reales del raster (en escala 0–255)
  let minVal = 255;
  let maxVal = 0;
  for (let i = 0; i < imgData.length; i += 4) {
    const v = imgData[i]; // canal R, en gris todos son iguales
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }
  const range = Math.max(1, maxVal - minVal); // evitar div/0

  // 4) Geometría base
  //    Usamos el aspect ratio del raster para no deformar el valle
  const WORLD_LONG = 80;                     // “largo” principal en tu escena (ajustable)
  const worldW = WORLD_LONG;                 // eje X
  const worldH = WORLD_LONG * (height / width); // eje Z manteniendo proporción
  const segments = 256;

  const geom = new THREE.PlaneGeometry(worldW, worldH, segments, segments);
  const pos  = geom.attributes.position;

  // 5) Escala vertical
  const MAX_HEIGHT = 12; // altura máxima “física” en tu mundo (prueba 10–16)

  for (let i = 0; i < pos.count; i++) {
    const ix = Math.floor((i % (segments + 1)) * (width  / (segments + 1)));
    const iy = Math.floor((i / (segments + 1)) * (height / (segments + 1)));

    const pix = (iy * width + ix) * 4;
    const raw = imgData[pix];               // 0–255
    const norm = (raw - minVal) / range;    // 0–1 usando solo el rango útil

    const heightMeters = norm * MAX_HEIGHT;
    pos.setZ(i, heightMeters);
  }

  pos.needsUpdate = true;
  geom.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x9399a5,
    roughness: 0.95,
    metalness: 0.1
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2;

  // Centrado en origen: la cámara lo ve mejor y después vos decidís dónde va la presa
  mesh.position.set(0, 0, 0);

  mesh.receiveShadow = false;
  mesh.castShadow = false;

  return mesh;
}
