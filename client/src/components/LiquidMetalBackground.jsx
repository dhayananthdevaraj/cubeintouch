// src/components/LiquidMetalBackground.jsx
//
// Full-screen WebGL2 "liquid metal" shader background for TokenGate — flowing
// domain-warped noise rendered as metallic reflection bands with specular
// highlights, tinted to the CubeInTouch palette (indigo/blue/coral/orange on
// navy) instead of plain chrome so it matches the rest of the app. The
// cursor presses a soft dent into the surface with a couple of radiating
// ripple rings, like pressed mercury.
//
// Renders nothing (returns null) when WebGL2 isn't available or the user
// prefers reduced motion — TokenGate falls back to its static gradient in
// that case, so this is purely a progressive enhancement.
import { useEffect, useRef } from "react";

const VERTEX_SRC = `#version 300 es
void main() {
  vec2 pos[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));
  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);
}`;

const FRAGMENT_SRC = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_mouseActive;
uniform vec3  u_colorA; // deep pool
uniform vec3  u_colorB; // mid metal
uniform vec3  u_colorC; // accent
uniform vec3  u_colorD; // hot highlight
uniform vec3  u_bg;

out vec4 fragColor;

vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p){
  float v = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 4; i++) {
    v += amp * snoise(p);
    p *= 2.05;
    amp *= 0.55;
  }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 auv = uv; auv.x *= aspect;

  float t = u_time * 0.022;
  vec2 flow = vec2(cos(radians(18.0)), sin(radians(18.0)));

  vec2 mouseUv = u_mouse; mouseUv.x *= aspect;
  float mdist = length(auv - mouseUv);
  float dent = u_mouseActive * exp(-mdist * 5.5);
  float ripple = u_mouseActive * sin(mdist * 28.0 - u_time * 2.0) * exp(-mdist * 3.5) * 0.05;

  vec2 p = auv * 1.3 + flow * t;
  p += normalize(auv - mouseUv + 1e-4) * dent * 0.22;

  vec3 q = vec3(p, t * 0.5);
  float warp1 = fbm(q);
  float warp2 = fbm(q + vec3(5.2, 1.3, 2.0));
  vec2 warped = p + 0.22 * vec2(warp1, warp2);

  float n = fbm(vec3(warped * 1.4, t * 0.7)) + ripple;

  float bands = sin(n * 3.5 * 3.14159);
  bands = sign(bands) * pow(abs(bands), 0.85);
  float band01 = clamp((bands * 0.5 + 0.5 - 0.5) * 0.85 + 0.5, 0.0, 1.0);

  vec3 col = mix(u_colorA, u_colorB, smoothstep(0.0, 0.42, band01));
  col = mix(col, u_colorC, smoothstep(0.38, 0.72, band01));
  col = mix(col, u_colorD, smoothstep(0.68, 1.0, band01));

  float e = 0.015;
  float nx = fbm(vec3((warped + vec2(e, 0.0)) * 1.4, t * 0.7));
  float ny = fbm(vec3((warped + vec2(0.0, e)) * 1.4, t * 0.7));
  vec2 grad = vec2(nx - n, ny - n) / e;
  float spec = pow(max(0.0, 1.0 - length(grad) * 0.55), 16.0);
  col += spec * 0.35 * vec3(1.0, 0.99, 0.97);
  col += u_mouseActive * exp(-mdist * 7.5) * vec3(1.0, 0.98, 0.94) * 0.14;

  float vig = smoothstep(1.05, 0.2, length(uv - 0.5) * 1.35);
  col = mix(u_bg, col, vig);

  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + u_time * 60.0) * 43758.5453);
  col += (grain - 0.5) * 0.014;

  fragColor = vec4(col, 1.0);
}`;

function compileShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(info || "Shader compile failed");
  }
  return shader;
}

const HEX = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// Gray monochrome — subtle satin-metal sheen rather than saturated brand
// colors, so it stays a quiet backdrop instead of competing with the card.
const PALETTE = {
  bg: HEX("#e9eaee"),
  colorA: HEX("#d6d8de"), // shaded pool
  colorB: HEX("#c3c6ce"), // mid gray
  colorC: HEX("#eceef2"), // pale sheen
  colorD: HEX("#fbfbfc"), // near-white highlight
};

export default function LiquidMetalBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return undefined;

    let program;
    try {
      const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "Program link failed");
      }
    } catch {
      return undefined; // fall back silently — TokenGate keeps its plain background
    }

    gl.useProgram(program);
    const uniforms = {};
    ["u_time", "u_resolution", "u_mouse", "u_mouseActive", "u_colorA", "u_colorB", "u_colorC", "u_colorD", "u_bg"]
      .forEach((name) => { uniforms[name] = gl.getUniformLocation(program, name); });

    gl.uniform3fv(uniforms.u_colorA, PALETTE.colorA);
    gl.uniform3fv(uniforms.u_colorB, PALETTE.colorB);
    gl.uniform3fv(uniforms.u_colorC, PALETTE.colorC);
    gl.uniform3fv(uniforms.u_colorD, PALETTE.colorD);
    gl.uniform3fv(uniforms.u_bg, PALETTE.bg);

    const mouse = { x: 0.5, y: 0.5, target: 0, active: 0 };
    let idleTimer = null;

    function handlePointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = 1 - (e.clientY - rect.top) / rect.height;
      mouse.target = 1;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => { mouse.target = 0; }, 2200);
    }
    function handlePointerLeave() { mouse.target = 0; }

    window.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerleave", handlePointerLeave);

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    function resize() {
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      // IO callbacks only ever fire asynchronously, so `raf`/`frame`/`lastTs`
      // below are already initialized by the time this runs.
      if (visible && !prefersReducedMotion && !raf) { lastTs = null; raf = requestAnimationFrame(frame); }
    }, { threshold: 0 });
    io.observe(canvas);

    let raf = null;
    let elapsed = 0;
    let lastTs = null; // reset to null whenever the loop (re)starts, so a gap (tab hidden, off-screen) never produces a time jump — the next frame is just treated as a small first delta

    function frame(now) {
      const dt = lastTs == null ? 0 : Math.min((now - lastTs) / 1000, 0.1);
      lastTs = now;
      elapsed += dt;
      mouse.active += (mouse.target - mouse.active) * 0.06;

      gl.uniform1f(uniforms.u_time, elapsed);
      gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.u_mouse, mouse.x, mouse.y);
      gl.uniform1f(uniforms.u_mouseActive, mouse.active);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (visible && !prefersReducedMotion) raf = requestAnimationFrame(frame);
      else raf = null;
    }

    if (prefersReducedMotion) {
      gl.uniform1f(uniforms.u_time, 0);
      gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.u_mouse, 0.5, 0.5);
      gl.uniform1f(uniforms.u_mouseActive, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      raf = requestAnimationFrame(frame);
    }

    const handleVisibility = () => {
      if (document.hidden) { visible = false; }
      else if (!prefersReducedMotion) {
        visible = true;
        if (!raf) { lastTs = null; raf = requestAnimationFrame(frame); }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(idleTimer);
      window.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
      ro.disconnect();
      io.disconnect();
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="lm-canvas" aria-hidden="true" />;
}
