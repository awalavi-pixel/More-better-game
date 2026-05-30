uniform sampler2D tDiffuse;
uniform float time;
varying vec2 vUv;

void main() {
  vec2 center = vec2(0.5);
  float dist = distance(vUv, center);

  // Circular scope mask
  float mask = step(dist, 0.45);

  // Vignette
  float vignette = smoothstep(0.45, 0.35, dist);

  // Slight chromatic aberration at edges
  float aberration = dist * 0.008;
  vec4 r = texture2D(tDiffuse, vUv + vec2(aberration, 0.0));
  vec4 g = texture2D(tDiffuse, vUv);
  vec4 b = texture2D(tDiffuse, vUv - vec2(aberration, 0.0));
  vec4 col = vec4(r.r, g.g, b.b, 1.0);

  // Crosshair lines
  float lineH = step(abs(vUv.y - 0.5), 0.002) * step(abs(vUv.x - 0.5), 0.15);
  float lineV = step(abs(vUv.x - 0.5), 0.002) * step(abs(vUv.y - 0.5), 0.15);
  float lines = max(lineH, lineV);

  col = mix(col, vec4(1.0, 0.0, 0.0, 1.0), lines * 0.8);
  col *= vignette;
  col = mix(vec4(0.0), col, mask);

  gl_FragColor = col;
}
