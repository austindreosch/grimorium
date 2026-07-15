/**
 * Dark mystical background — swirling purple mist, faint arcane ring geometry,
 * gold dust particles rising, warm center glow. Designed to be atmospheric
 * and subtle: a living backdrop, not a spectacle. Shared by MainMenu and the
 * Grimoire board so both breathe the same animated backdrop.
 */
export const GRIMOIRE_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_resolution;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  float a = hash(i);
  float b = hash(i+vec2(1.0,0.0));
  float c = hash(i+vec2(0.0,1.0));
  float d = hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

float fbm(vec2 p){
  float v = 0.0;
  float a = 0.55;
  mat2 m = mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){
    v += a*noise(p);
    p = m*p + 0.07;
    a *= 0.5;
  }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 p = uv;
  p.x *= u_resolution.x / u_resolution.y;

  float screenScale = clamp(600.0 / max(u_resolution.x, u_resolution.y), 1.0, 1.5);
  p *= screenScale;

  float t = u_time * 0.06;

  // Dark swirling mist — two fbm layers for depth
  float mist1 = fbm(p * 2.0 + vec2(t * 0.8, -t * 0.5));
  float mist2 = fbm(p * 3.0 + vec2(-t * 0.6, t * 0.4));
  float mist = mist1 * 0.6 + mist2 * 0.4;

  // Faint arcane ring — slowly drifting center
  vec2 center = vec2(
    0.5 * (u_resolution.x / u_resolution.y) * screenScale,
    0.5 * screenScale
  );
  vec2 q = p - center;
  float r = length(q);
  float angle = atan(q.y, q.x);

  // Outer ring
  float ring = 1.0 - smoothstep(0.005, 0.018, abs(r - 0.30));
  ring *= 0.12;

  // Tick marks (12 positions, rotating slowly)
  float ticks = pow(max(0.0, cos((angle + t * 0.3) * 6.0)), 30.0);
  float tickMask = smoothstep(0.30 + 0.05, 0.30 + 0.01, r)
                 * smoothstep(0.30 - 0.05, 0.30 - 0.01, r);
  ticks *= tickMask * 0.10;

  // Inner ring
  float innerRing = 1.0 - smoothstep(0.004, 0.014, abs(r - 0.22));
  innerRing *= 0.07;

  // Gold dust particles rising
  vec2 sp = uv;
  sp.y += t * 0.5;
  vec2 grid = floor(sp * vec2(50.0, 70.0));
  float rnd = hash(grid);
  vec2 f = fract(sp * vec2(50.0, 70.0));
  float dust = step(0.992, rnd) * smoothstep(0.35, 0.0, length(f - 0.5));
  dust *= 0.5 + 0.5 * sin(rnd * 6.283 + u_time * 1.5);

  // Central warm glow
  float glow = smoothstep(0.55, 0.0, length(uv - 0.5));

  // Heavy vignette
  vec2 vc = uv - 0.5;
  float vig = smoothstep(1.1, 0.15, dot(vc, vc));

  // Color palette
  vec3 deep   = vec3(0.02, 0.01, 0.05);
  vec3 mid    = vec3(0.06, 0.03, 0.14);
  vec3 bright = vec3(0.10, 0.05, 0.22);
  vec3 gold   = vec3(0.85, 0.65, 0.20);

  vec3 col = mix(deep, mid, mist * 0.7);
  col = mix(col, bright, smoothstep(0.4, 0.8, mist) * 0.35);

  // Arcane geometry (gold tinted)
  col += gold * (ring + ticks + innerRing);

  // Gold dust
  col += gold * dust * 0.5;

  // Central glow (warm purple + gold hint)
  col += vec3(0.06, 0.03, 0.10) * glow * 0.4;
  col += gold * glow * 0.015;

  col *= vig;
  gl_FragColor = vec4(col, 1.0);
}
`
