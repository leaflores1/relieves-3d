// public/js/terrain.js - Generación mejorada del terreno con heightmap real
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { CONFIG } from './config.js';

/**
 * Crea el terreno 3D basado en el heightmap de Potrerillos
 * Mejoras: normalización automática, coloración por altura, suavizado, bordes difuminados
 */
export async function createPotrerillosTerrain() {
  const loader = new THREE.TextureLoader();

  // 1) Cargar heightmap
  console.log('🗺️ Cargando heightmap de Potrerillos...');
  const heightmap = await loader.loadAsync('assets/dem/relieve-potrerillos-heightmapPNG.png');

  const width  = heightmap.image.width;
  const height = heightmap.image.height;
  console.log(`📐 Dimensiones del heightmap: ${width}x${height}px`);

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
    const v = imgData[i]; // canal R
    if (v < minVal) minVal = v;
    if (v > maxVal) maxVal = v;
  }
  const range = Math.max(1, maxVal - minVal);
  console.log(`📊 Rango de valores: ${minVal} - ${maxVal} (rango: ${range})`);

  // 4) Geometría base con aspect ratio del raster
  const WORLD_SIZE = CONFIG.TERRAIN.WORLD_SIZE;
  const worldW = WORLD_SIZE;
  const worldH = WORLD_SIZE * (height / width);
  const segments = CONFIG.TERRAIN.SEGMENTS;

  console.log(`🔷 Creando geometría: ${worldW}x${worldH} unidades, ${segments}x${segments} segmentos`);
  
  const geom = new THREE.PlaneGeometry(worldW, worldH, segments, segments);
  const pos  = geom.attributes.position;

  // 5) Calcular alturas y aplicar suavizado
  const MAX_HEIGHT = CONFIG.TERRAIN.MAX_HEIGHT;
  const VERT_EXAG = CONFIG.TERRAIN.VERTICAL_EXAGGERATION;
  const EDGE_FADE = CONFIG.TERRAIN.EDGE_FADE_DISTANCE;
  const SMOOTH_K = CONFIG.TERRAIN.SMOOTHING_KERNEL;

  // Array temporal para almacenar alturas sin procesar
  const rawHeights = new Float32Array(pos.count);

  // Primera pasada: leer alturas del heightmap
  for (let i = 0; i < pos.count; i++) {
    const col = i % (segments + 1);
    const row = Math.floor(i / (segments + 1));
    
    const ix = Math.floor(col * (width  / segments));
    const iy = Math.floor(row * (height / segments));

    const pix = (iy * width + ix) * 4;
    const raw = imgData[pix];
    const norm = (raw - minVal) / range;

    rawHeights[i] = norm * MAX_HEIGHT * VERT_EXAG;
  }

  // Segunda pasada: aplicar suavizado opcional
  if (SMOOTH_K > 0) {
    console.log(`🔧 Aplicando suavizado con kernel ${SMOOTH_K}...`);
    for (let i = 0; i < pos.count; i++) {
      const smoothed = smoothHeight(i, rawHeights, segments + 1, SMOOTH_K);
      pos.setZ(i, smoothed);
    }
  } else {
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, rawHeights[i]);
    }
  }

  // Tercera pasada: aplicar fade en bordes
  if (EDGE_FADE > 0) {
    console.log(`🌫️ Aplicando fade en bordes...`);
    for (let i = 0; i < pos.count; i++) {
      const col = i % (segments + 1);
      const row = Math.floor(i / (segments + 1));
      
      const u = col / segments;
      const v = row / segments;
      
      const fadeFactor = calculateEdgeFade(u, v, EDGE_FADE);
      const currentZ = pos.getZ(i);
      pos.setZ(i, currentZ * fadeFactor);
    }
  }

  pos.needsUpdate = true;
  geom.computeVertexNormals();

  // 6) Coloración por altura (vertex colors)
  console.log('🎨 Aplicando colores por altura...');
  const colors = new Float32Array(pos.count * 3);
  
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getZ(i);
    const t = h / (MAX_HEIGHT * VERT_EXAG);
    
    const color = getTerrainColor(t);
    colors[i * 3]     = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // 7) Material con vertex colors - balance entre realismo y detalle visual
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,  // rugoso pero no extremo
    metalness: 0.05,  // mínimo reflejo
    flatShading: false,
    side: THREE.FrontSide
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0, 0);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  console.log('✅ Terreno de Potrerillos creado exitosamente');
  
  return mesh;
}

/**
 * Suaviza la altura usando el promedio de vecinos
 */
function smoothHeight(index, heights, cols, kernel) {
  let sum = 0;
  let count = 0;
  
  const row = Math.floor(index / cols);
  const col = index % cols;
  
  for (let dy = -kernel; dy <= kernel; dy++) {
    for (let dx = -kernel; dx <= kernel; dx++) {
      const nRow = row + dy;
      const nCol = col + dx;
      
      if (nRow >= 0 && nRow < cols && nCol >= 0 && nCol < cols) {
        const nIndex = nRow * cols + nCol;
        sum += heights[nIndex];
        count++;
      }
    }
  }
  
  return sum / count;
}

/**
 * Calcula el factor de fade en los bordes (0=borde, 1=centro)
 */
function calculateEdgeFade(u, v, fadeDistance) {
  const distToEdgeU = Math.min(u, 1 - u);
  const distToEdgeV = Math.min(v, 1 - v);
  const minDist = Math.min(distToEdgeU, distToEdgeV);
  
  if (minDist > fadeDistance) return 1.0;
  
  // Suavizado smooth step
  const t = minDist / fadeDistance;
  return t * t * (3 - 2 * t);
}

/**
 * Obtiene el color del terreno según la altura normalizada (0-1)
 * Gradiente más dramático para resaltar el relieve
 */
function getTerrainColor(t) {
  const colors = CONFIG.TERRAIN_COLORS;
  
  if (t < 0.3) {
    // Zonas bajas: valle y orillas del embalse
    const local = t / 0.3;
    return lerpColor(colors.LOW, colors.MID, local);
  } else if (t < 0.65) {
    // Zonas medias: laderas principales
    const local = (t - 0.3) / 0.35;
    return lerpColor(colors.MID, colors.HIGH, local);
  } else {
    // Zonas altas: cumbres y picos
    const local = (t - 0.65) / 0.35;
    return lerpColor(colors.HIGH, colors.PEAK, local);
  }
}

/**
 * Interpolación lineal entre dos colores
 */
function lerpColor(c1, c2, t) {
  return {
    r: c1.r + (c2.r - c1.r) * t,
    g: c1.g + (c2.g - c1.g) * t,
    b: c1.b + (c2.b - c1.b) * t
  };
}