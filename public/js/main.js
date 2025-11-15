import { scene, camera, renderer, resize } from './scene.js';
import { createPotrerillosTerrain } from './terrain.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

resize();

(async () => {
  try {
    const terrain = await createPotrerillosTerrain();
    scene.add(terrain);

    // Centrar cámara sobre el terreno
    camera.position.set(0, 20, 40);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(terrain.position);
    controls.update();

    function loop() {
      requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    }
    loop();
  } catch (err) {
    console.error('❌ Error creando el terreno:', err);
  }
})();
