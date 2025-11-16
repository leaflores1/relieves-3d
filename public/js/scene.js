// public/js/scene.js - Configuración mejorada de la escena Three.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { CONFIG } from './config.js';

export const host = document.body;
export const root = document.getElementById('three-root');

// Escena principal
export const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.COLORS.bg);

// Niebla atmosférica
if (CONFIG.FOG.ENABLED) {
  scene.fog = new THREE.Fog(
    CONFIG.COLORS.bg, 
    CONFIG.FOG.NEAR, 
    CONFIG.FOG.FAR
  );
}

// Cámara perspectiva
const camConfig = CONFIG.CAMERA;
export const camera = new THREE.PerspectiveCamera(
  camConfig.FOV, 
  1, 
  camConfig.NEAR, 
  camConfig.FAR
);
// Posición inicial optimizada para ver montañas y valle
camera.position.set(20, 14, 32);

// Renderer con optimizaciones
export const renderer = new THREE.WebGLRenderer({ 
  antialias: true, 
  powerPreference: 'high-performance',
  logarithmicDepthBuffer: true // mejor precisión de profundidad
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false; // activar si querés sombras
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
root.appendChild(renderer.domElement);

// Sistema de iluminación mejorado
setupLighting();

/**
 * Configura un sistema de iluminación realista
 */
function setupLighting() {
  // Luz hemisférica (cielo + suelo)
  const hemiLight = new THREE.HemisphereLight(
    0xaed8ff, // color del cielo (azul claro)
    0x1a2332, // color del suelo (gris oscuro)
    0.9       // intensidad
  );
  scene.add(hemiLight);

  // Luz direccional principal (sol)
  const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.3);
  sunLight.position.set(12, 16, 8);
  sunLight.castShadow = false;
  
  // Configuración de sombras (si se activan)
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 100;
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  
  scene.add(sunLight);

  // Luz de relleno (suaviza sombras)
  const fillLight = new THREE.DirectionalLight(0x5580aa, 0.6);
  fillLight.position.set(-10, 8, -12);
  scene.add(fillLight);

  // Luz ambiental suave (ilumina todo uniformemente)
  const ambientLight = new THREE.AmbientLight(0x4a5f7a, 0.3);
  scene.add(ambientLight);

  console.log('💡 Sistema de iluminación configurado');
}

/**
 * Ajusta el tamaño del renderer y cámara
 */
export function resize() {
  const w = root.clientWidth || window.innerWidth;
  const h = root.clientHeight || window.innerHeight;
  
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// Event listener para redimensionamiento
window.addEventListener('resize', resize);

// Resize inicial
resize();

/**
 * Agrega un helper de ejes (útil para debugging)
 */
export function addAxisHelper(size = 10) {
  const axesHelper = new THREE.AxesHelper(size);
  scene.add(axesHelper);
  console.log('📐 Helper de ejes agregado');
}

/**
 * Agrega un grid helper (útil para debugging)
 */
export function addGridHelper(size = 100, divisions = 50) {
  const gridHelper = new THREE.GridHelper(size, divisions, 0x2a4a6a, 0x1d2e42);
  scene.add(gridHelper);
  console.log('📏 Grid helper agregado');
}