// public/js/utils.js - Funciones de utilidad mejoradas

/**
 * Parte fraccional de un número
 */
export const fract = x => x - Math.floor(x);

/**
 * Interpolación lineal entre dos valores
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Interpolación suave (curva S)
 */
export const smoothstep = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * Función hash para generación de números pseudoaleatorios
 */
export const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);

/**
 * Ruido 2D básico usando interpolación bilineal
 */
export function noise2D(x, y) {
  const iX = Math.floor(x), iY = Math.floor(y);
  const fX = x - iX, fY = y - iY;
  
  const v00 = hash(iX, iY);
  const v10 = hash(iX + 1, iY);
  const v01 = hash(iX, iY + 1);
  const v11 = hash(iX + 1, iY + 1);
  
  const v0 = lerp(v00, v10, fX);
  const v1 = lerp(v01, v11, fX);
  
  return lerp(v0, v1, fY);
}

/**
 * Fractional Brownian Motion (ruido con múltiples octavas)
 */
export function fbm(x, y, octaves = 4) {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  
  for (let i = 0; i < octaves; i++) {
    total += amplitude * noise2D(x * frequency, y * frequency);
    frequency *= 2;
    amplitude *= 0.5;
  }
  
  return total;
}

/**
 * Clamp (limitar un valor entre min y max)
 */
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Mapea un valor de un rango a otro
 */
export const map = (value, inMin, inMax, outMin, outMax) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

/**
 * Calcula la distancia euclidiana entre dos puntos 2D
 */
export const distance2D = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calcula la distancia euclidiana entre dos puntos 3D
 */
export const distance3D = (x1, y1, z1, x2, y2, z2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Convierte grados a radianes
 */
export const degToRad = deg => (deg * Math.PI) / 180;

/**
 * Convierte radianes a grados
 */
export const radToDeg = rad => (rad * 180) / Math.PI;

/**
 * Genera un color aleatorio en formato hexadecimal
 */
export const randomColor = () => {
  return Math.floor(Math.random() * 16777215);
};

/**
 * Convierte un color RGB (0-1) a hexadecimal
 */
export const rgbToHex = (r, g, b) => {
  const toHex = val => {
    const hex = Math.floor(val * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return parseInt('0x' + toHex(r) + toHex(g) + toHex(b));
};

/**
 * Debounce - ejecuta una función después de un delay
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle - limita la frecuencia de ejecución de una función
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Formatea un número con separadores de miles
 */
export const formatNumber = (num, decimals = 2) => {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Calcula el promedio de un array de números
 */
export const average = arr => arr.reduce((a, b) => a + b, 0) / arr.length;

/**
 * Calcula la mediana de un array de números
 */
export const median = arr => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Genera un ID único simple
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Carga una imagen y retorna una promesa
 */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Espera un tiempo determinado (promesa)
 */
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Verifica si un punto está dentro de un círculo
 */
export const isPointInCircle = (px, py, cx, cy, radius) => {
  return distance2D(px, py, cx, cy) <= radius;
};

/**
 * Verifica si un punto está dentro de un rectángulo
 */
export const isPointInRect = (px, py, rx, ry, rw, rh) => {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
};