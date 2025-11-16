// public/js/water.js - Componente del embalse con animación
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { CONFIG } from './config.js';

/**
 * Crea el plano de agua del embalse Potrerillos
 * Incluye transparencia, reflexión y oleaje suave
 */
export function createWater() {
  if (!CONFIG.WATER.ENABLED) {
    console.log('💧 Embalse deshabilitado en configuración');
    return null;
  }

  const waterConfig = CONFIG.WATER;
  
  // Geometría del plano de agua
  const geom = new THREE.PlaneGeometry(
    waterConfig.SIZE_X, 
    waterConfig.SIZE_Z,
    48, // balance entre detalle y performance
    48
  );

  // Computar bounding sphere inicial para evitar warnings
  geom.computeBoundingSphere();

  // Material semi-transparente con propiedades físicas
  const mat = new THREE.MeshStandardMaterial({
    color: CONFIG.COLORS.water,
    transparent: true,
    opacity: waterConfig.OPACITY,
    roughness: waterConfig.ROUGHNESS,
    metalness: waterConfig.METALNESS,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geom, mat);
  
  // Rotar para que sea horizontal
  mesh.rotation.x = -Math.PI / 2;
  
  // Posicionar a la altura del embalse
  mesh.position.y = waterConfig.HEIGHT;
  
  // Centrar en el área del embalse (ajustar según tu terreno)
  // Posicionado más al centro del valle
  mesh.position.x = 4;
  mesh.position.z = -4; // centrado
  
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  // Guardar referencia a la geometría para animación
  if (waterConfig.ANIMATE) {
    mesh.userData.animate = true;
    mesh.userData.time = 0;
  }

  console.log('💧 Embalse creado exitosamente');
  
  return mesh;
}

/**
 * Anima el oleaje del agua (llamar en el loop de renderizado)
 */
export function animateWater(waterMesh, deltaTime) {
  if (!waterMesh || !waterMesh.userData.animate) return;

  const pos = waterMesh.geometry.attributes.position;
  waterMesh.userData.time += deltaTime;
  const time = waterMesh.userData.time;

  // Oleaje suave pero visible
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    
    // Ondas equilibradas para agua de embalse
    const wave1 = Math.sin(x * 0.4 + time * 0.25) * 0.04;
    const wave2 = Math.sin(y * 0.25 + time * 0.3) * 0.025;
    const wave3 = Math.sin((x + y) * 0.18 + time * 0.18) * 0.015;
    
    const z = wave1 + wave2 + wave3;
    pos.setZ(i, z);
  }

  pos.needsUpdate = true;
  waterMesh.geometry.computeVertexNormals();
}

/**
 * Crea un borde del embalse (opcional, para mejor definición)
 */
export function createWaterBorder() {
  const waterConfig = CONFIG.WATER;
  
  const points = [];
  const segments = 64;
  const sizeX = waterConfig.SIZE_X / 2;
  const sizeZ = waterConfig.SIZE_Z / 2;
  
  // Crear borde rectangular
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    
    if (i <= segments / 4) {
      const s = (i / (segments / 4));
      points.push(new THREE.Vector3(-sizeX + s * sizeX * 2, 0, -sizeZ));
    } else if (i <= segments / 2) {
      const s = ((i - segments / 4) / (segments / 4));
      points.push(new THREE.Vector3(sizeX, 0, -sizeZ + s * sizeZ * 2));
    } else if (i <= 3 * segments / 4) {
      const s = ((i - segments / 2) / (segments / 4));
      points.push(new THREE.Vector3(sizeX - s * sizeX * 2, 0, sizeZ));
    } else {
      const s = ((i - 3 * segments / 4) / (segments / 4));
      points.push(new THREE.Vector3(-sizeX, 0, sizeZ - s * sizeZ * 2));
    }
  }
  
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ 
    color: CONFIG.COLORS.waterDeep,
    transparent: true,
    opacity: 0.4
  });
  
  const line = new THREE.Line(geom, mat);
  line.position.y = waterConfig.HEIGHT + 0.05;
  
  return line;
}