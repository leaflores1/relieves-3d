// public/js/controls.js - Sistema de controles mejorado
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/controls/OrbitControls.js';

/**
 * Configura los controles de órbita de la cámara
 */
export function setupControls(camera, renderer, targetPosition = null) {
  const controls = new OrbitControls(camera, renderer.domElement);
  
  // Suavizado de movimiento
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  
  // Target (punto hacia donde mira la cámara)
  if (targetPosition) {
    controls.target.copy(targetPosition);
  } else {
    controls.target.set(0, 5, 0); // centro del terreno
  }
  
  // Auto-rotación (deshabilitada por defecto)
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.5;
  
  // Límites de ángulo vertical (evita ir debajo del terreno)
  controls.maxPolarAngle = Math.PI / 2.02; // casi 90° pero no completamente horizontal
  controls.minPolarAngle = Math.PI / 6;    // no demasiado vertical
  
  // Límites de zoom
  controls.minDistance = 5;
  controls.maxDistance = 120;
  
  // Velocidad de zoom
  controls.zoomSpeed = 1.2;
  
  // Pan (desplazamiento lateral)
  controls.enablePan = true;
  controls.panSpeed = 0.8;
  controls.screenSpacePanning = false; // pan horizontal en espacio del mundo
  
  // Rotación
  controls.rotateSpeed = 0.6;
  
  console.log('🎮 Controles de cámara configurados');
  
  return controls;
}

/**
 * Configura los controles de la interfaz (botones)
 */
export function setupUIControls(controls) {
  // Botón de auto-rotación
  const btnAutorotate = document.getElementById('btn-autorotate');
  const labAutorotate = document.getElementById('lab-autorotate');
  
  if (btnAutorotate && labAutorotate) {
    btnAutorotate.addEventListener('click', () => {
      controls.autoRotate = !controls.autoRotate;
      labAutorotate.textContent = controls.autoRotate ? 'ON' : 'OFF';
      console.log(`🔄 Auto-rotación: ${controls.autoRotate ? 'ON' : 'OFF'}`);
    });
  }
  
  // Botón de wireframe
  const btnWire = document.getElementById('btn-wire');
  const labWire = document.getElementById('lab-wire');
  
  if (btnWire && labWire) {
    let wireframeEnabled = false;
    btnWire.addEventListener('click', () => {
      wireframeEnabled = !wireframeEnabled;
      labWire.textContent = wireframeEnabled ? 'ON' : 'OFF';
      toggleWireframe(wireframeEnabled);
      console.log(`🔲 Wireframe: ${wireframeEnabled ? 'ON' : 'OFF'}`);
    });
  }
  
  // Botón de reset
  const btnReset = document.getElementById('btn-reset');
  
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      resetCamera(controls);
      console.log('🔄 Cámara reseteada');
    });
  }
  
  console.log('🎛️ Controles de UI configurados');
}

/**
 * Alterna el modo wireframe en todos los meshes de la escena
 */
function toggleWireframe(enabled) {
  // Esta función será llamada desde main.js pasándole la escena
  if (window.sceneRef) {
    window.sceneRef.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        obj.material.wireframe = enabled;
      }
    });
  }
}

/**
 * Resetea la posición y target de la cámara
 */
function resetCamera(controls) {
  const camera = controls.object;
  
  // Posición inicial
  camera.position.set(22, 10, 28);
  
  // Target inicial
  controls.target.set(0, 5, 0);
  
  // Desactivar auto-rotación
  controls.autoRotate = false;
  const labAutorotate = document.getElementById('lab-autorotate');
  if (labAutorotate) labAutorotate.textContent = 'OFF';
  
  controls.update();
}

/**
 * Anima la cámara a una posición específica
 */
export function animateCameraTo(controls, targetPos, targetLookAt, duration = 1000) {
  const camera = controls.object;
  const startPos = camera.position.clone();
  const startLookAt = controls.target.clone();
  
  const startTime = Date.now();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    
    // Easing suave (ease-in-out)
    const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    
    camera.position.lerpVectors(startPos, targetPos, eased);
    controls.target.lerpVectors(startLookAt, targetLookAt, eased);
    controls.update();
    
    if (t < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}