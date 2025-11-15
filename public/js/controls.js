import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function setupControls(camera, renderer, CFRD){
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(CFRD.runUp + CFRD.crest*0.5 - 0.6, CFRD.H*0.6, 0);
  controls.autoRotate = false; //poner ON para iniciar rotacion
  controls.autoRotateSpeed = 0.5;
  controls.maxPolarAngle = Math.PI/2.02;
  controls.minDistance = 3;
  controls.maxDistance = 40;
  return controls;
}
