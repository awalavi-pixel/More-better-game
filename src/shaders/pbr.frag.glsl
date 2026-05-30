uniform vec3 color;
uniform float roughness;
uniform float metallic;
uniform vec3 lightDir;
uniform vec3 lightColor;
uniform vec3 ambientColor;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(lightDir);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 H = normalize(L + V);

  float NdotL = max(0.0, dot(N, L));
  float NdotH = max(0.0, dot(N, H));

  // Lambertian diffuse
  vec3 diffuse = color * lightColor * NdotL;

  // Blinn-Phong specular
  float shininess = mix(4.0, 128.0, 1.0 - roughness);
  float spec = pow(NdotH, shininess) * metallic;
  vec3 specular = lightColor * spec * 0.5;

  vec3 ambient = ambientColor * color * 0.3;

  gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
}
