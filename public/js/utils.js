export const fract = x => x - Math.floor(x);
export const lerp  = (a,b,t) => a + (b-a)*t;
export const smoothstep = (a,b,x) => {
  const t = Math.min(Math.max((x-a)/(b-a),0),1);
  return t*t*(3-2*t);
};
export const hash = (x, y) => fract(Math.sin(x*127.1 + y*311.7) * 43758.5453123);

export function noise2D(x,y){
  const iX = Math.floor(x), iY = Math.floor(y);
  const fX = x - iX,       fY = y - iY;
  const v00 = hash(iX, iY), v10 = hash(iX+1, iY);
  const v01 = hash(iX, iY+1), v11 = hash(iX+1, iY+1);
  const v0 = lerp(v00, v10, fX);
  const v1 = lerp(v01, v11, fX);
  return lerp(v0, v1, fY);
}

export function fbm(x,y){
  let t=0, a=.5, f=1;
  for(let i=0;i<4;i++){ t += a*noise2D(x*f, y*f); f*=2; a*=.5; }
  return t;
}
