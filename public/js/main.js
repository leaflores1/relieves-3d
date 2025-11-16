// public/js/main.js - Punto de entrada principal del modelo 3D
import { scene, camera, renderer, resize } from './scene.js';
import { createPotrerillosTerrain } from './terrain.js';
import { createWater, animateWater } from './water.js';
import { setupControls, setupUIControls } from './controls.js';
import { CONFIG } from './config.js';

// Hacer la escena accesible globalmente para los controles
window.sceneRef = scene;

// Variables globales
let controls;
let waterMesh;
let clock;
let stats = {
  frameCount: 0,
  lastTime: Date.now(),
  fps: 0
};

/**
 * Inicialización principal
 */
async function init() {
  console.log('🚀 Iniciando modelo 3D del Dique Potrerillos...');
  console.log('📋 Configuración:', CONFIG);

  try {
    // 1. Crear el terreno
    console.log('⏳ Generando terreno...');
    const terrain = await createPotrerillosTerrain();
    scene.add(terrain);
    console.log('✅ Terreno agregado a la escena');

    // 2. Crear el embalse (agua)
    if (CONFIG.WATER.ENABLED) {
      console.log('⏳ Generando embalse...');
      waterMesh = createWater();
      if (waterMesh) {
        scene.add(waterMesh);
        console.log('✅ Embalse agregado a la escena');
      }
    }

    // 3. Configurar controles de cámara
    controls = setupControls(camera, renderer);
    controls.update();

    // 4. Configurar controles de UI (botones)
    setupUIControls(controls);

    // 5. Crear reloj para animaciones
    clock = performance.now();

    // 6. Iniciar loop de renderizado
    console.log('🎬 Iniciando loop de renderizado...');
    loop();

    console.log('✅ Modelo 3D inicializado correctamente');

  } catch (err) {
    console.error('❌ Error durante la inicialización:', err);
    displayError(err);
  }
}

/**
 * Loop principal de renderizado
 */
function loop() {
  requestAnimationFrame(loop);

  // Calcular delta time
  const now = performance.now();
  const deltaTime = (now - clock) / 1000; // en segundos
  clock = now;

  // Actualizar controles
  if (controls) {
    controls.update();
  }

  // Animar agua
  if (waterMesh && CONFIG.WATER.ANIMATE) {
    animateWater(waterMesh, deltaTime);
  }

  // Renderizar escena
  renderer.render(scene, camera);

  // Actualizar estadísticas (FPS)
  updateStats();
}

/**
 * Actualiza las estadísticas de rendimiento
 */
function updateStats() {
  stats.frameCount++;
  const now = Date.now();
  
  if (now >= stats.lastTime + 1000) {
    stats.fps = Math.round((stats.frameCount * 1000) / (now - stats.lastTime));
    stats.frameCount = 0;
    stats.lastTime = now;
    
    // Mostrar FPS en consola cada 5 segundos
    if (stats.fps > 0 && Math.random() < 0.2) {
      console.log(`📊 FPS: ${stats.fps}`);
    }
  }
}

/**
 * Muestra un error en la UI
 */
function displayError(error) {
  const root = document.getElementById('three-root');
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(220, 38, 38, 0.95);
    color: white;
    padding: 24px;
    border-radius: 12px;
    max-width: 500px;
    font-family: monospace;
    z-index: 1000;
  `;
  errorDiv.innerHTML = `
    <h3 style="margin-top: 0;">❌ Error al cargar el modelo</h3>
    <p>${error.message || error}</p>
    <p style="font-size: 12px; opacity: 0.8;">Revisa la consola para más detalles</p>
  `;
  root.appendChild(errorDiv);
}

/**
 * Manejo de redimensionamiento
 */
window.addEventListener('resize', () => {
  resize();
  if (controls) {
    controls.update();
  }
});

/**
 * Cleanup al cerrar la página
 */
window.addEventListener('beforeunload', () => {
  console.log('🧹 Limpiando recursos...');
  
  // Liberar geometrías y materiales
  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(mat => mat.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });
  
  // Liberar renderer
  renderer.dispose();
  
  console.log('✅ Recursos liberados');
});

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Resize inicial
resize();