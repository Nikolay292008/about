// hyperspace.js — гиперпространство на главной странице
import * as THREE from "three";

const container = document.getElementById("hyperspace-canvas");
if (!container) {
  console.log("Hyperspace не запущен — нет контейнера (не на главной странице)");
  // Если скрипт случайно подключится на других страницах — просто ничего не делаем
}

// === Настройки ===
const particleCount = 20000;
const radius = 1.0;
const length = 30.0;
const warpIntensity = 1.0;
const warpSpeed = 0.2;
const timeSlowdownFactor = 0.1;
const transitionSpeed = 0.01;

// === Renderer & Canvas ===
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// === Camera ===
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// === Scene ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// === Геометрия частиц ===
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const sizes = new Float32Array(particleCount);
const speeds = new Float32Array(particleCount);

for (let i = 0; i < particleCount; i++) {
  const i3 = i * 3;
  const angle = Math.random() * Math.PI * 2;
  const r = radius * (0.4 + Math.random() * 0.6);
  const z = -length * 0.5 + Math.random() * length;

  positions[i3]     = Math.cos(angle) * r;
  positions[i3 + 1] = Math.sin(angle) * r;
  positions[i3 + 2] = z;

  sizes[i]  = 0.2 + Math.random() * 0.4;
  speeds[i] = 1.0 + Math.random() * 2.0;
}

geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("size",     new THREE.BufferAttribute(sizes, 1));
geometry.setAttribute("speed",    new THREE.BufferAttribute(speeds, 1));

// === Шейдеры ===
const vertexShader = `
  attribute float size;
  attribute float speed;
  varying vec3 vColor;
  varying float vOpacity;
  varying float vLength;
  varying float vDistFromCamera;
  uniform float uTime;
  uniform float uRadius;
  uniform float uLength;
  uniform float uWarpIntensity;
  uniform float uWarpSpeed;
  uniform float uEffectsActive;
  uniform float uTimeSlowdown;
  void main() {
    vec3 pos = position;
    float effectiveSpeed = mix(uWarpSpeed, uWarpSpeed * uTimeSlowdown, uEffectsActive);
    float t = mod(uTime * speed * effectiveSpeed, uLength);
    pos.z = mod(pos.z + t, uLength) - uLength * 0.5;
    float distFromCamera = pos.z;
    vDistFromCamera = distFromCamera;
    float brightness = 1.0 - smoothstep(-uLength * 0.5, uLength * 0.5, distFromCamera);
    brightness = max(brightness, 0.4);
    float depthFactor = 1.0 - smoothstep(-uLength * 0.5, uLength * 0.5, distFromCamera);
    float distFromCenter = length(pos.xy);
    vLength = size * speed * uWarpIntensity * brightness * (1.0 + distFromCenter / uRadius * 0.6) * depthFactor;
    float forwardBrightness = 1.0 - smoothstep(-uLength * 0.3, uLength * 0.3, distFromCamera);
    float colorShift = sin(uTime * 0.8 + pos.x * 0.6 + pos.y * 0.4 + pos.z * 0.3) * 0.5 + 0.5;
    float colorShift2 = cos(uTime * 1.0 + pos.x * 0.5 - pos.y * 0.5 + pos.z * 0.4) * 0.5 + 0.5;
    float colorShift3 = sin(uTime * 0.6 + pos.x * 0.4 + pos.y * 0.5 - pos.z * 0.3) * 0.4 + 0.6;
    float blueIntensity = 0.3 + colorShift * 0.6 + forwardBrightness * 0.3;
    float cyanIntensity = 0.4 + colorShift2 * 0.5 + forwardBrightness * 0.3;
    float magentaIntensity = 0.5 + colorShift3 * 0.4 + forwardBrightness * 0.2;
    float whiteIntensity = 0.7 + (1.0 - colorShift) * 0.25 + forwardBrightness * 0.25;
    vColor = vec3(
      0.3 + blueIntensity * 0.4 + cyanIntensity * 0.2 + magentaIntensity * 0.2 + whiteIntensity * 0.2,
      0.4 + blueIntensity * 0.3 + cyanIntensity * 0.4 + magentaIntensity * 0.3 + whiteIntensity * 0.3,
      0.6 + blueIntensity * 0.3 + cyanIntensity * 0.5 + magentaIntensity * 0.2 + whiteIntensity * 0.5
    );
    float pulseSeed = pos.x * 50.0 + pos.y * 30.0 + pos.z * 20.0;
    float pulse = sin(uTime * 1.5 + pulseSeed) * 0.3 + 0.7;
    pulse = pow(pulse, 1.5);
    pulse = mix(1.0, pulse, uEffectsActive);
    float burstSeed = pos.x * 100.0 + pos.y * 70.0;
    float burst = sin(uTime * 0.8 + burstSeed) * 0.5 + 0.5;
    burst = pow(burst, 8.0);
    float burstIntensity = 1.0 + burst * 2.0 * uEffectsActive;
    vOpacity = brightness * pulse * (1.0 + (burstIntensity - 1.0));
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z) * brightness * depthFactor * (1.0 + vLength * 0.2) * (1.0 + burst * 0.3 * uEffectsActive);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;
  varying float vLength;
  varying float vDistFromCamera;
  uniform float uEffectsActive;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distortionIntensity = 0.0005 * uEffectsActive;
    float warpDistortion = sin(coord.y * 8.0 + vDistFromCamera * 0.3) * distortionIntensity;
    coord.x += warpDistortion;
    float timeDistortion = sin(coord.x * 6.0 + vDistFromCamera * 0.4) * 0.0004 * uEffectsActive;
    coord.y += timeDistortion;
    float lineWidth = 0.0035;
    float lineLength = vLength * 1.5;
    float perpDist = abs(coord.x);
    float alongLine = coord.y;
    float alpha = 0.0;
    if (alongLine >= -lineLength && alongLine <= 0.0 && perpDist < lineWidth) {
      float alongAlpha = 1.0 - smoothstep(-lineLength, 0.0, alongLine);
      float centerAlpha = 1.0 - smoothstep(0.0, lineWidth, perpDist);
      float energyPulse = sin(alongLine * 4.0 + vDistFromCamera * 0.6) * 0.2 + 0.8;
      energyPulse = mix(1.0, energyPulse, uEffectsActive);
      alpha = alongAlpha * centerAlpha * energyPulse;
      float trailColorShift = sin(alongLine * 3.0 + vDistFromCamera * 0.8) * 0.4 + 0.6;
      alpha *= trailColorShift;
    }
    float dist = length(coord);
    float core = pow(1.0 - smoothstep(0.0, 0.1, dist), 3.0);
    float corePulse = sin(vDistFromCamera * 0.5 + dist * 10.0) * 0.15 + 0.85;
    corePulse = mix(1.0, corePulse, uEffectsActive);
    alpha = max(alpha, core * 1.2 * corePulse);
    float glow = pow(1.0 - smoothstep(0.0, 0.35, dist), 2.0);
    float energyRings = sin(dist * 15.0 - vDistFromCamera * 0.4) * 0.1 + 0.9;
    energyRings = mix(1.0, energyRings, uEffectsActive);
    alpha = max(alpha, glow * 0.7 * energyRings);
    float outerGlow = pow(1.0 - smoothstep(0.0, 0.5, dist), 1.5);
    alpha = max(alpha, outerGlow * 0.2);
    float energyField = pow(1.0 - smoothstep(0.0, 0.4, dist), 1.8);
    float fieldPulse = sin(vDistFromCamera * 0.3 + dist * 8.0) * 0.2 + 0.8;
    fieldPulse = mix(1.0, fieldPulse, uEffectsActive);
    alpha = max(alpha, energyField * 0.15 * fieldPulse * uEffectsActive);
    float colorWave = sin(vDistFromCamera * 0.4 + dist * 6.0) * 0.3 + 0.7;
    vec3 spaceColor = vColor * colorWave;
    vec3 blueTone = vec3(0.4, 0.6, 1.0);
    vec3 cyanTone = vec3(0.3, 0.8, 1.0);
    vec3 magentaTone = vec3(0.8, 0.4, 1.0);
    float toneMix = sin(vDistFromCamera * 0.3) * 0.5 + 0.5;
    vec3 mixedTone = mix(blueTone, mix(cyanTone, magentaTone, toneMix), 0.3);
    spaceColor = mix(spaceColor, mixedTone, 0.25);
    vec3 finalColor = spaceColor * (1.0 + alpha * 2.5);
    float finalAlpha = alpha * vOpacity * 1.5;
    finalAlpha = min(finalAlpha, 1.0);
    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

// === Материал ===
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uRadius: { value: radius },
    uLength: { value: length },
    uWarpIntensity: { value: warpIntensity },
    uWarpSpeed: { value: warpSpeed },
    uEffectsActive: { value: 1.0 },
    uTimeSlowdown: { value: timeSlowdownFactor },
  },
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// === Анимация ===
let time = 0;
let currentEffectsActive = 0.0;
let targetEffectsActive = 0.0;

// При нажатии/касании — включаем турбо-режим (по желанию можно убрать)
document.addEventListener("mousedown", () => targetEffectsActive = 1.0);
document.addEventListener("mouseup", () => targetEffectsActive = 0.0);
document.addEventListener("touchstart", () => targetEffectsActive = 1.0);
document.addEventListener("touchend", () => targetEffectsActive = 0.0);

function animate() {
  requestAnimationFrame(animate);

  time += 0.016;

  // Плавный переход к турбо-режиму
  currentEffectsActive += (targetEffectsActive - currentEffectsActive) * transitionSpeed;

  material.uniforms.uEffectsActive.value = currentEffectsActive;
  material.uniforms.uTime.value = time;

  renderer.render(scene, camera);
}
animate();

// === Адаптация под изменение размера окна ===
window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});