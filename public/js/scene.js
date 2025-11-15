import * as THREE from 'three';
import { CONFIG } from './config.js';

export const host = document.body;
export const root = document.getElementById('three-root');

export const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.COLORS.bg);
scene.fog = new THREE.Fog(CONFIG.COLORS.bg, 20, 650); // más lejos

export const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 800); // far ↑
camera.position.set(22, 10, 28);  // arranque más abierto

export const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = false;
root.appendChild(renderer.domElement);

// Luces
scene.add(new THREE.HemisphereLight(0xaed8ff, 0x1a2332, 0.9));
const dir = new THREE.DirectionalLight(0xfff5e6, 1.2); dir.position.set(10,14,6); scene.add(dir);
const fill = new THREE.DirectionalLight(0x5580aa, 0.5); fill.position.set(-8,6,-10); scene.add(fill);

export function resize(){
  const w = root.clientWidth || window.innerWidth;
  const h = root.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
