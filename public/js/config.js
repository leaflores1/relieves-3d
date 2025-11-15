// Tamaños globales (escena en metros “ficticios”)
export const CONFIG = {
  COLORS: {
    bg: 0x0b1220,
    terrain: 0x3d4654,
    gridMajor: 0x2a4a6a,
    gridMinor: 0x1d2e42,
    water: 0x1e5a9e
  },

  WATER_LEVEL: 1.6,

  // Valle MUCHO más grande
  VALLEY: {
    L: 420,      // largo total (eje X)  ← antes ~200
    W:  60,      // ancho total (eje Z)  ← antes ~14
    SEGS: 220    // resolución
  },

  // Embalse
  RESERVOIR: {
    UPSTREAM_LEN: 280,  // cuánto “entra” aguas arriba desde la cara
    WIDTH: 44           // ancho del espejo
  }
};
