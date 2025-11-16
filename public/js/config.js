// public/js/config.js - Configuración mejorada del modelo 3D

export const CONFIG = {
  // Colores de la escena
  COLORS: {
    bg: 0x0b1220,
    terrain: 0x3d4654,
    gridMajor: 0x2a4a6a,
    gridMinor: 0x1d2e42,
    water: 0x1e5a9e,
    waterDeep: 0x0d3a6e
  },

  // Datos reales del Dique Potrerillos
  REAL_ELEVATIONS: {
    MIN: 1300,  // metros sobre nivel del mar (base del valle)
    MAX: 1450,  // metros sobre nivel del mar (picos cercanos)
    WATER_LEVEL: 1350,  // nivel del embalse aproximado
    DAM_CREST: 1390,    // coronamiento de la presa
    DAM_BASE: 1300      // base de la presa
  },

  // Configuración del terreno
  TERRAIN: {
    WORLD_SIZE: 80,           // tamaño en unidades Three.js
    SEGMENTS: 512,            // resolución (mayor = más detalle)
    MAX_HEIGHT: 15,           // altura máxima en escena - balance realismo/detalle
    VERTICAL_EXAGGERATION: 1.2, // factor de exageración - balance medio
    EDGE_FADE_DISTANCE: 0.12,   // suavizado de bordes (0-1)
    SMOOTHING_KERNEL: 0         // SIN suavizado - mantener detalle original
  },

  // Configuración del agua (embalse)
  WATER: {
    ENABLED: true,
    SIZE_X: 58,      // ancho del embalse
    SIZE_Z: 38,      // largo del embalse
    HEIGHT: 2.5,     // altura del plano de agua - ajustado mejor
    OPACITY: 0.7,    
    ROUGHNESS: 0.12, 
    METALNESS: 0.25,  
    ANIMATE: true    // oleaje suave
  },

  // Colores del terreno por altura (gradiente) - estilo Mendoza con variedad
  TERRAIN_COLORS: {
    LOW: { r: 0.38, g: 0.42, b: 0.35 },      // verde-gris bajo (valle)
    MID: { r: 0.55, g: 0.52, b: 0.45 },      // marrón medio (laderas)
    HIGH: { r: 0.68, g: 0.65, b: 0.58 },     // gris alto (cumbres medias)
    PEAK: { r: 0.78, g: 0.76, b: 0.72 }      // gris claro (picos altos)
  },

  // Configuración de cámara inicial
  CAMERA: {
    FOV: 55,
    NEAR: 0.1,
    FAR: 800,
    INITIAL_POS: { x: 22, y: 10, z: 28 }
  },

  // Configuración de niebla
  FOG: {
    ENABLED: true,
    NEAR: 20,
    FAR: 650
  }
};