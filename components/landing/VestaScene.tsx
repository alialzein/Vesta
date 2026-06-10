'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import type { Theme } from '@/lib/theme';

/**
 * Landing-page 3D world (Three.js) — "the journey of one email through Vesta".
 *
 * A LARGE isometric world split into four districts, far enough apart that each
 * scroll step arrives somewhere new (VECTR-style camera travel, Vesta story):
 *
 *   mail district (Outlook tower) ─▶ triage checkpoint (noise gate + Hidden
 *   vault + container yard) ─▶ radar campus (rings, sweep, score pylons, HQ)
 *   ─▶ signal field (send antenna + mast array).
 *
 * The glowing path draws itself slightly AHEAD of the camera and the camera
 * rides the path (scroll = travel), so the scene continuously adjusts. The
 * pointer is alive too: hovering anywhere blooms a dotted ripple that fades,
 * and the camera parallaxes a touch toward the cursor. Districts "wake up"
 * (dot-halo brightens, props rise) as their step approaches.
 *
 * Scroll drives everything via `setProgress(0..1)`. Theme-aware (both
 * palettes re-tint live), DPR-capped, pauses offscreen, honors
 * prefers-reduced-motion (static fully-revealed overview).
 */

export type VestaSceneHandle = {
  /** 0..1 scroll progress of the pinned story. */
  setProgress: (p: number) => void;
};

type Props = {
  theme: Theme;
  /** Render the final state with no motion (prefers-reduced-motion). */
  reducedMotion?: boolean;
  className?: string;
};

/* ------------------------------- palettes -------------------------------- */

type Palette = {
  bg: number;
  ground: number;
  building: number;
  buildingSoft: number;
  accent: number;
  accent2: number;
  grey: number;
  ringOpacity: number;
  dotOpacity: number;
  shadowOpacity: number;
  ambient: number;
  directional: number;
  fogFar: number;
};

const PALETTES: Record<Theme, Palette> = {
  dark: {
    bg: 0x0a0f17,
    ground: 0x0e1622,
    building: 0x182334,
    buildingSoft: 0x121b29,
    accent: 0x5ba8f5,
    accent2: 0x67e8d8,
    grey: 0x47536a,
    ringOpacity: 0.16,
    dotOpacity: 0.5,
    shadowOpacity: 0.32,
    ambient: 0.85,
    directional: 0.9,
    fogFar: 120,
  },
  light: {
    bg: 0xeef5ff,
    ground: 0xf6faff,
    building: 0xffffff,
    buildingSoft: 0xe7f0fc,
    accent: 0x2f7deb,
    accent2: 0x36b8e8,
    grey: 0xb9c6d8,
    ringOpacity: 0.5,
    dotOpacity: 0.55,
    shadowOpacity: 0.16,
    ambient: 1.05,
    directional: 0.75,
    fogFar: 150,
  },
};

/* ------------------------------ world layout ------------------------------ */

// Districts are spread far apart so each step is a real arrival, not a glance.
const TOWER = new THREE.Vector3(-34, 0, -26);
const GATE = new THREE.Vector3(-11, 0, -8);
const RADAR = new THREE.Vector3(13, 0, 9);
const ANTENNA = new THREE.Vector3(38, 0, 28);

const PATH_Y = 0.22;

function mainCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(TOWER.x + 1.2, PATH_Y, TOWER.z + 1.8),
      new THREE.Vector3(-27, PATH_Y, -22),
      new THREE.Vector3(-23, PATH_Y, -13),
      new THREE.Vector3(GATE.x - 2.2, PATH_Y, GATE.z - 2.4),
      new THREE.Vector3(GATE.x + 2.2, PATH_Y, GATE.z + 2.0),
      new THREE.Vector3(-2, PATH_Y, -1),
      new THREE.Vector3(5, PATH_Y, 5.5),
      new THREE.Vector3(RADAR.x - 2.4, PATH_Y, RADAR.z - 1.2),
      new THREE.Vector3(RADAR.x + 2.8, PATH_Y, RADAR.z + 2.4),
      new THREE.Vector3(24, PATH_Y, 16),
      new THREE.Vector3(30, PATH_Y, 23.5),
      new THREE.Vector3(ANTENNA.x - 1.0, PATH_Y, ANTENNA.z - 1.2),
    ],
    false,
    'catmullrom',
    0.1,
  );
}

/** Grey spur: noise diverted off the gate into the Hidden vault. */
function spurCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(GATE.x + 0.4, PATH_Y, GATE.z - 0.4),
    new THREE.Vector3(GATE.x + 3.4, PATH_Y, GATE.z - 4.4),
    new THREE.Vector3(GATE.x + 5.2, PATH_Y - 0.05, GATE.z - 7.6),
  ]);
}

function smooth(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Eased 0..1 inside a progress window. */
function windowT(p: number, from: number, to: number): number {
  return smooth((p - from) / (to - from));
}

/** Activation of a station whose path-fraction is `frac` (1 = camera there). */
function stationActivation(pathT: number, frac: number): number {
  return smooth(1 - Math.abs(pathT - frac) / 0.22);
}

/* ------------------------------ textures ---------------------------------- */

/** Soft round blob (fake contact shadow). */
function shadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, 'rgba(10,20,35,0.55)');
  g.addColorStop(1, 'rgba(10,20,35,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

/** VECTR-style dotted halo: a disc of small dots, denser toward the center. */
function dotFieldTexture(): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  const step = 26;
  for (let x = step / 2; x < S; x += step) {
    for (let y = step / 2; y < S; y += step) {
      const dx = (x - S / 2) / (S / 2);
      const dy = (y - S / 2) / (S / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const r = 2.6 * (1 - d * 0.75);
      ctx.globalAlpha = Math.max(0, 1 - d * d);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return new THREE.CanvasTexture(c);
}

/** Dotted ring used by the pointer ripple (blooms then fades). */
function rippleTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(S / 2 + Math.cos(a) * 96, S / 2 + Math.sin(a) * 96, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // soft inner dot
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, 7, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

/** Radial glow sprite for the bright head of the path. */
function glowTexture(): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

/* ------------------------------ build helpers ----------------------------- */

function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

/* ---------------------------------- scene --------------------------------- */

export const VestaScene = forwardRef<VestaSceneHandle, Props>(function VestaScene(
  { theme, reducedMotion = false, className },
  ref,
) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useImperativeHandle(ref, () => ({
    setProgress(p: number) {
      progressRef.current = Math.min(1, Math.max(0, p));
    },
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const host = mount; // non-null for closures

    /* renderer / camera ----------------------------------------------------- */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 400);
    const ISO = new THREE.Vector3(1, 0.92, 1).normalize();
    let camZoom = 1;

    function frustum() {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      // Narrow screens get a wider view so districts still fit.
      const view = (aspect < 0.9 ? 15 : 11.5) / camZoom;
      camera.left = -view * aspect;
      camera.right = view * aspect;
      camera.top = view;
      camera.bottom = -view;
      camera.updateProjectionMatrix();
    }

    /* lights ----------------------------------------------------------------- */
    const ambient = new THREE.AmbientLight(0xffffff, 1);
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(6, 14, 4);
    const rim = new THREE.DirectionalLight(0xbfd9ff, 0.35);
    rim.position.set(-8, 6, -6);
    scene.add(ambient, sun, rim);

    /* materials --------------------------------------------------------------- */
    const matGround = new THREE.MeshLambertMaterial();
    const matBuilding = new THREE.MeshLambertMaterial();
    const matBuildingSoft = new THREE.MeshLambertMaterial();
    const matAccent = new THREE.MeshBasicMaterial();
    const matAccent2 = new THREE.MeshBasicMaterial();
    const matGrey = new THREE.MeshLambertMaterial();
    const matPathBase = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.14 });
    const matPathGlow = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 });
    const matSpur = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55 });
    const matRing = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
    const matSweep = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const matRippleStation = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const matShadow = new THREE.MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      depthWrite: false,
    });
    const dotTex = dotFieldTexture();
    const ripTex = rippleTexture();
    const headTex = glowTexture();

    /* ground ------------------------------------------------------------------- */
    const ground = new THREE.Mesh(new THREE.CircleGeometry(140, 72), matGround);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    function dropShadow(x: number, z: number, s: number) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), matShadow);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.005, z);
      scene.add(m);
    }

    /** Dotted halo under a station — brightens as its step approaches. */
    const dotFields: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; frac: number }[] = [];
    function dotField(center: THREE.Vector3, radius: number, frac: number) {
      const mat = new THREE.MeshBasicMaterial({
        map: dotTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(center.x, 0.02, center.z);
      scene.add(m);
      dotFields.push({ mesh: m, mat, frac });
    }

    /* districts ------------------------------------------------------------------ */
    /** Props that rise as their district wakes (scale.y 0.55 → 1). */
    const risers: { mesh: THREE.Mesh; frac: number; h: number }[] = [];
    function riser(mesh: THREE.Mesh, frac: number, h: number) {
      mesh.userData.baseY = mesh.position.y;
      risers.push({ mesh, frac, h });
      scene.add(mesh);
    }

    // Path fractions where each station sits (matched to mainCurve below).
    const FRAC = { tower: 0.02, gate: 0.33, radar: 0.62, antenna: 0.97 };

    // 01 — mail district: a small downtown around the Outlook tower.
    const towerGroup = new THREE.Group();
    towerGroup.add(box(2.8, 6.2, 2.8, matBuilding, 0, 3.1, 0));
    towerGroup.add(box(2.0, 1.2, 2.0, matBuildingSoft, 0, 6.8, 0));
    towerGroup.add(box(2.9, 0.18, 2.9, matAccent, 0, 1.05, 0)); // glowing mail band
    towerGroup.position.copy(TOWER);
    scene.add(towerGroup);
    dropShadow(TOWER.x, TOWER.z, 9);
    dotField(TOWER, 7.5, FRAC.tower);
    const downtown: [number, number, number, number, number][] = [
      [-4.2, 2.6, 1.8, 4.2, 1.8],
      [3.6, -1.8, 1.6, 3.0, 1.6],
      [-2.8, -3.4, 1.4, 2.2, 1.4],
      [4.4, 2.8, 1.3, 1.8, 1.3],
      [0.6, -5.2, 1.6, 2.6, 1.6],
    ];
    for (const [dx, dz, w, h, d] of downtown) {
      riser(
        box(w, h, d, Math.random() > 0.5 ? matBuilding : matBuildingSoft, TOWER.x + dx, h / 2, TOWER.z + dz),
        FRAC.tower,
        h,
      );
      dropShadow(TOWER.x + dx, TOWER.z + dz, Math.max(w, d) * 2.6);
    }

    // 02 — triage checkpoint: gate + scanner, container yard, Hidden vault.
    const gateGroup = new THREE.Group();
    gateGroup.add(box(0.6, 3.6, 0.6, matBuilding, -1.5, 1.8, 0));
    gateGroup.add(box(0.6, 3.6, 0.6, matBuilding, 1.5, 1.8, 0));
    gateGroup.add(box(3.6, 0.55, 0.6, matBuilding, 0, 3.85, 0));
    const scanner = box(2.9, 0.12, 0.45, matAccent2, 0, 3.45, 0);
    gateGroup.add(scanner);
    gateGroup.rotation.y = Math.PI / 4;
    gateGroup.position.copy(GATE);
    scene.add(gateGroup);
    dropShadow(GATE.x, GATE.z, 7);
    dotField(GATE, 8, FRAC.gate);
    // Container yard (the holding pen for filtered noise).
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        riser(
          box(1.5, 0.9, 0.9, matGrey, GATE.x + 4.6 + i * 1.8, 0.45, GATE.z - 5.8 + j * 1.3),
          FRAC.gate,
          0.9,
        );
      }
    }
    const vault = new THREE.Group();
    vault.add(box(2.6, 1.0, 2.6, matGrey, 0, 0.5, 0));
    vault.add(box(2.0, 0.2, 2.0, matBuildingSoft, 0, 1.1, 0));
    vault.position.set(GATE.x + 5.2, 0, GATE.z - 7.8);
    scene.add(vault);
    dropShadow(vault.position.x, vault.position.z, 5);

    // 03 — radar campus: platform, rings, sweep, pylons + Vesta HQ slab.
    const radarGroup = new THREE.Group();
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.2, 0.4, 56), matBuildingSoft);
    platform.position.y = 0.2;
    radarGroup.add(platform);
    for (const r of [1.6, 2.6, 3.6]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.035, r, 72), matRing);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.42;
      radarGroup.add(ring);
    }
    const sweep = new THREE.Mesh(new THREE.CircleGeometry(3.7, 28, 0, Math.PI / 3.1), matSweep);
    sweep.rotation.x = -Math.PI / 2;
    sweep.position.y = 0.43;
    radarGroup.add(sweep);
    const pylons: THREE.Mesh[] = [];
    const pylonSpecs: { x: number; z: number; h: number; mat: THREE.Material }[] = [
      { x: -1.3, z: 0.5, h: 2.8, mat: matAccent },
      { x: 0.6, z: -1.5, h: 1.9, mat: matAccent2 },
      { x: 1.7, z: 1.1, h: 1.2, mat: matBuilding },
    ];
    for (const s of pylonSpecs) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, s.h, 0.6), s.mat);
      p.position.set(s.x, 0.4, s.z);
      p.scale.y = 0.001;
      p.userData.h = s.h;
      radarGroup.add(p);
      pylons.push(p);
    }
    radarGroup.position.copy(RADAR);
    scene.add(radarGroup);
    dropShadow(RADAR.x, RADAR.z, 11);
    dotField(RADAR, 9, FRAC.radar);
    // HQ slab with a glowing accent band (the command center itself).
    const hq = new THREE.Group();
    hq.add(box(3.4, 2.4, 2.2, matBuilding, 0, 1.2, 0));
    hq.add(box(1.6, 1.0, 1.6, matBuildingSoft, 0, 2.9, 0));
    hq.add(box(3.5, 0.16, 2.3, matAccent, 0, 1.9, 0));
    hq.position.set(RADAR.x - 6.4, 0, RADAR.z + 4.2);
    scene.add(hq);
    dropShadow(hq.position.x, hq.position.z, 8);
    riser(box(1.6, 2.0, 1.6, matBuildingSoft, RADAR.x + 6.2, 1.0, RADAR.z - 3.4), FRAC.radar, 2.0);
    riser(box(1.3, 1.4, 1.3, matBuilding, RADAR.x + 7.8, 0.7, RADAR.z - 1.2), FRAC.radar, 1.4);

    // 04 — signal field: main antenna + a small mast array.
    const antennaGroup = new THREE.Group();
    antennaGroup.add(box(1.8, 0.8, 1.8, matBuilding, 0, 0.4, 0));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 4.4, 10), matBuilding);
    mast.position.y = 3.0;
    antennaGroup.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), matAccent2);
    beacon.position.y = 5.4;
    antennaGroup.add(beacon);
    const ripples: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 56), matRippleStation);
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.46;
      antennaGroup.add(r);
      ripples.push(r);
    }
    antennaGroup.position.copy(ANTENNA);
    scene.add(antennaGroup);
    dropShadow(ANTENNA.x, ANTENNA.z, 6);
    dotField(ANTENNA, 8, FRAC.antenna);
    const mastSpots: [number, number, number][] = [
      [-4.5, 3.2, 2.6],
      [-2.2, 5.4, 3.2],
      [4.8, -2.6, 2.2],
      [6.4, 1.8, 2.9],
    ];
    for (const [dx, dz, h] of mastSpots) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, h, 8), matBuilding);
      m.position.set(ANTENNA.x + dx, h / 2, ANTENNA.z + dz);
      riser(m, FRAC.antenna, h);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), matAccent);
      tip.position.set(ANTENNA.x + dx, h + 0.1, ANTENNA.z + dz);
      scene.add(tip);
      dropShadow(ANTENNA.x + dx, ANTENNA.z + dz, 2.6);
    }

    // En-route filler so the journey between districts never feels empty.
    const filler: [number, number, number, number, number][] = [
      [-20, -4, 1.5, 2.0, 1.5],
      [-16, -16, 1.7, 2.8, 1.7],
      [-5, 4, 1.4, 1.8, 1.4],
      [2, -8, 1.6, 2.4, 1.6],
      [7, 13, 1.5, 2.1, 1.5],
      [20, 4, 1.7, 2.6, 1.7],
      [27, 12, 1.4, 1.7, 1.4],
      [31, 33, 1.5, 2.2, 1.5],
      [-28, -32, 1.8, 3.0, 1.8],
      [44, 22, 1.6, 2.3, 1.6],
    ];
    for (const [x, z, w, h, d] of filler) {
      scene.add(box(w, h, d, Math.random() > 0.5 ? matBuilding : matBuildingSoft, x, h / 2, z));
      dropShadow(x, z, Math.max(w, d) * 2.5);
    }

    /* the glowing path ------------------------------------------------------------ */
    const curve = mainCurve();
    const TUBULAR = 420;
    const RADIAL = 8;
    // Faint full-length hint underneath…
    const baseTube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, TUBULAR, 0.07, RADIAL, false),
      matPathBase,
    );
    scene.add(baseTube);
    // …and a bright VECTR-style multi-line bundle that draws itself in.
    const offsets = [-0.22, 0, 0.22];
    const glowTubes: { mesh: THREE.Mesh; indexCount: number }[] = [];
    for (const off of offsets) {
      const pts: THREE.Vector3[] = [];
      const N = 240;
      const tangent = new THREE.Vector3();
      const normal = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const pt = curve.getPointAt(t);
        curve.getTangentAt(t, tangent);
        normal.crossVectors(up, tangent).normalize();
        pts.push(pt.clone().addScaledVector(normal, off));
      }
      const offCurve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(offCurve, TUBULAR, off === 0 ? 0.085 : 0.05, RADIAL, false),
        matPathGlow,
      );
      const indexCount = tube.geometry.index!.count;
      tube.geometry.setDrawRange(0, 0);
      scene.add(tube);
      glowTubes.push({ mesh: tube, indexCount });
    }
    // Bright head where the path is currently being drawn.
    const headGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: headTex, transparent: true, depthWrite: false }),
    );
    headGlow.scale.setScalar(3.4);
    scene.add(headGlow);

    const spur = spurCurve();
    const spurTube = new THREE.Mesh(new THREE.TubeGeometry(spur, 60, 0.055, RADIAL, false), matSpur);
    const spurIndexCount = spurTube.geometry.index!.count;
    spurTube.geometry.setDrawRange(0, 0);
    scene.add(spurTube);

    /* packets ----------------------------------------------------------------------- */
    const packetGeo = new THREE.BoxGeometry(0.38, 0.24, 0.52);
    const packets: { mesh: THREE.Mesh; offset: number }[] = [];
    for (let i = 0; i < 9; i++) {
      const mesh = new THREE.Mesh(packetGeo, i % 2 ? matAccent2 : matAccent);
      mesh.visible = false;
      scene.add(mesh);
      packets.push({ mesh, offset: i / 9 });
    }
    const greyPackets: { mesh: THREE.Mesh; offset: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(packetGeo, matGrey);
      mesh.visible = false;
      scene.add(mesh);
      greyPackets.push({ mesh, offset: i / 3 });
    }

    /* pointer: hover ripples + parallax ----------------------------------------------- */
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pointerNdc = new THREE.Vector2();
    const parallax = new THREE.Vector2(0, 0); // eased toward pointer
    const hit = new THREE.Vector3();

    type Ripple = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number };
    const ripplePool: Ripple[] = [];
    const rippleGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 18; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: ripTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(rippleGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.03;
      mesh.visible = false;
      scene.add(mesh);
      ripplePool.push({ mesh, mat, life: 0 });
    }
    let rippleIdx = 0;
    let lastRippleAt = 0;

    function onPointerMove(e: PointerEvent) {
      const rect = host.getBoundingClientRect();
      pointerNdc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      );
      if (reducedMotion) return;
      const now = performance.now();
      if (now - lastRippleAt < 90) return; // throttle spawns
      lastRippleAt = now;
      raycaster.setFromCamera(pointerNdc, camera);
      if (raycaster.ray.intersectPlane(groundPlane, hit)) {
        const r = ripplePool[rippleIdx++ % ripplePool.length];
        r.mesh.position.set(hit.x, 0.03 + (rippleIdx % 5) * 0.002, hit.z);
        r.life = 1;
        r.mesh.visible = true;
      }
    }
    // Window-level so ripples work even when the cursor is over DOM overlays
    // (hero copy, step rail); coordinates are mapped via the host rect.
    window.addEventListener('pointermove', onPointerMove);

    /* theme ---------------------------------------------------------------------------- */
    function applyTheme(t: Theme) {
      const p = PALETTES[t];
      scene.background = new THREE.Color(p.bg);
      scene.fog = new THREE.Fog(p.bg, 55, p.fogFar);
      matGround.color.set(p.ground);
      matBuilding.color.set(p.building);
      matBuildingSoft.color.set(p.buildingSoft);
      matAccent.color.set(p.accent);
      matAccent2.color.set(p.accent2);
      matGrey.color.set(p.grey);
      matPathBase.color.set(p.accent);
      matPathGlow.color.set(p.accent);
      matSpur.color.set(p.grey);
      matRing.color.set(p.accent);
      matRing.opacity = p.ringOpacity;
      matSweep.color.set(p.accent);
      matRippleStation.color.set(p.accent2);
      matShadow.opacity = p.shadowOpacity;
      for (const f of dotFields) f.mat.color.set(p.accent);
      for (const r of ripplePool) r.mat.color.set(p.accent);
      (headGlow.material as THREE.SpriteMaterial).color.set(p.accent);
      ambient.intensity = p.ambient;
      sun.intensity = p.directional;
    }
    applyTheme(themeRef.current);
    let appliedTheme: Theme = themeRef.current;

    /* animation loop --------------------------------------------------------------------- */
    let raf = 0;
    let running = true;
    let shown = 0;
    const clock = new THREE.Clock();
    const camPos = new THREE.Vector3();
    const camTarget = new THREE.Vector3(0, 0, 0);
    const followPt = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const OVERVIEW_TARGET = new THREE.Vector3(2, 0, 1);

    function render() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      if (appliedTheme !== themeRef.current) {
        appliedTheme = themeRef.current;
        applyTheme(appliedTheme);
      }

      const target = reducedMotion ? 1 : progressRef.current;
      shown += (target - shown) * Math.min(1, dt * 7);
      const p = reducedMotion ? 1 : shown;

      // Travel: the camera RIDES the path; the glow draws slightly ahead so the
      // path always leads and the scene keeps changing (the VECTR feel).
      const pathT = windowT(p, 0.06, 0.96);
      const reveal = reducedMotion ? 1 : Math.min(1, pathT + 0.06);
      curve.getPointAt(Math.min(0.999, Math.max(0.001, pathT)), followPt);

      const intro = windowT(p, 0.0, 0.12); // overview → follow blend
      if (reducedMotion) {
        camTarget.copy(OVERVIEW_TARGET);
        camZoom = 0.55;
      } else {
        camTarget.copy(OVERVIEW_TARGET).lerp(followPt, intro);
        camZoom = 0.62 + (1.5 - 0.62) * intro;
        // Pointer parallax — the world leans gently toward the cursor.
        parallax.x += (pointerNdc.x - parallax.x) * Math.min(1, dt * 3);
        parallax.y += (pointerNdc.y - parallax.y) * Math.min(1, dt * 3);
        camTarget.x += parallax.x * 1.1;
        camTarget.z -= parallax.y * 1.1;
      }
      frustum();
      camPos.copy(camTarget).addScaledVector(ISO, 60);
      camera.position.copy(camPos);
      camera.lookAt(camTarget);

      // Path reveal across the three glow lines + the bright head.
      for (const g of glowTubes) {
        g.mesh.geometry.setDrawRange(0, Math.floor(g.indexCount * reveal));
      }
      if (reveal > 0.015 && reveal < 0.995 && !reducedMotion) {
        headGlow.visible = true;
        curve.getPointAt(Math.min(0.999, reveal), tmp);
        headGlow.position.set(tmp.x, PATH_Y + 0.35, tmp.z);
        const pulse = 1 + Math.sin(elapsed * 5) * 0.12;
        headGlow.scale.setScalar(3.4 * pulse);
        (headGlow.material as THREE.SpriteMaterial).opacity = 0.85;
      } else {
        headGlow.visible = false;
      }

      // Packets ride the revealed path.
      const speed = 0.035;
      for (const pk of packets) {
        const t = (pk.offset + elapsed * speed) % 1;
        if (reveal > 0.03 && t < reveal) {
          pk.mesh.visible = true;
          curve.getPointAt(t, tmp);
          pk.mesh.position.copy(tmp);
          pk.mesh.position.y += 0.08 + Math.sin(elapsed * 3 + pk.offset * 9) * 0.03;
          curve.getTangentAt(t, tmp);
          pk.mesh.rotation.y = Math.atan2(tmp.x, tmp.z);
        } else {
          pk.mesh.visible = false;
        }
      }

      // District wake-ups: dotted halos brighten, props rise.
      const dotBase = PALETTES[appliedTheme].dotOpacity;
      for (const f of dotFields) {
        const act = reducedMotion ? 0.7 : stationActivation(pathT, f.frac);
        f.mat.opacity = dotBase * (0.12 + 0.88 * act) * (reveal > 0.01 ? 1 : 0.4);
      }
      for (const r of risers) {
        const act = reducedMotion ? 1 : 0.45 + 0.55 * stationActivation(pathT, r.frac);
        r.mesh.scale.y = act;
        r.mesh.position.y = (r.h * act) / 2;
      }

      // 02 — the gate diverts grey noise into the Hidden vault.
      const gateAct = reducedMotion ? 1 : stationActivation(pathT, FRAC.gate);
      const spurT = reducedMotion ? 1 : windowT(gateAct, 0.25, 0.9);
      spurTube.geometry.setDrawRange(0, Math.floor(spurIndexCount * spurT));
      scanner.position.y = 3.45 - Math.abs(Math.sin(elapsed * 2.2)) * 1.6 * gateAct;
      for (const gp of greyPackets) {
        if (spurT > 0.4) {
          const t = (gp.offset + elapsed * 0.08) % 1;
          gp.mesh.visible = true;
          spur.getPointAt(Math.min(t, 0.999), tmp);
          gp.mesh.position.copy(tmp);
          if (t > 0.85) gp.mesh.position.y -= (t - 0.85) * 2.4;
          gp.mesh.rotation.y = elapsed * 0.7 + gp.offset * 5;
        } else {
          gp.mesh.visible = false;
        }
      }

      // 03 — radar: pylons rise; sweep accelerates on arrival.
      const radarAct = reducedMotion ? 1 : stationActivation(pathT, FRAC.radar);
      for (const py of pylons) {
        const h = py.userData.h as number;
        py.scale.y = Math.max(0.001, radarAct);
        py.position.y = 0.4 + (h * py.scale.y) / 2;
      }
      sweep.rotation.z = -elapsed * (0.5 + radarAct * 1.1);

      // 04 — antenna fires once the reply is approved.
      const sendAct = reducedMotion ? 1 : stationActivation(pathT, FRAC.antenna);
      beacon.scale.setScalar(1 + sendAct * (0.3 + Math.sin(elapsed * 4) * 0.2));
      ripples.forEach((r, i) => {
        if (sendAct <= 0.05) {
          r.visible = false;
          return;
        }
        r.visible = true;
        const phase = (elapsed * 0.55 + i * 0.5) % 1;
        r.scale.setScalar(1 + phase * 10);
        matRippleStation.opacity = 0.5 * (1 - phase) * sendAct;
      });

      // Pointer ripples bloom out and fade.
      for (const r of ripplePool) {
        if (r.life <= 0) continue;
        r.life -= dt * 1.4;
        if (r.life <= 0) {
          r.mesh.visible = false;
          r.mat.opacity = 0;
          continue;
        }
        const k = 1 - r.life; // 0 → 1 over the ripple's life
        const s = 0.7 + k * 4.2;
        r.mesh.scale.set(s, s, 1);
        r.mat.opacity = 0.5 * r.life;
      }

      renderer.render(scene, camera);
      if (running) raf = requestAnimationFrame(render);
    }

    frustum();
    raf = requestAnimationFrame(render);

    /* lifecycle -------------------------------------------------------------------------- */
    const onResize = () => frustum();
    window.addEventListener('resize', onResize);

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && !document.hidden;
        if (visible && !running) {
          running = true;
          clock.getDelta();
          raf = requestAnimationFrame(render);
        } else if (!visible && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.01 },
    );
    io.observe(host);
    const onVisibility = () => {
      if (document.hidden && running) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!document.hidden && !running) {
        running = true;
        clock.getDelta();
        raf = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      [
        matGround, matBuilding, matBuildingSoft, matAccent, matAccent2, matGrey,
        matPathBase, matPathGlow, matSpur, matRing, matSweep, matRippleStation, matShadow,
      ].forEach((m) => m.dispose());
      for (const f of dotFields) f.mat.dispose();
      for (const r of ripplePool) r.mat.dispose();
      (headGlow.material as THREE.SpriteMaterial).dispose();
      dotTex.dispose();
      ripTex.dispose();
      headTex.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
    // Built once; theme flows through themeRef (no rebuild on toggle).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
});
