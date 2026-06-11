'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Theme } from '@/lib/theme';

/**
 * Landing-page 3D world (Three.js) — "the journey of one email through Vesta".
 *
 * v4: SIX labeled beats. An isometric world whose stations literally tell the
 * product story, each carrying crisp in-world mono labels:
 *
 *   01 · INBOX        the envelope monument (mail arrives)
 *   02 · FILTERING    the scanner gate — noise diverts into the HIDDEN TRAY
 *   03 · AI ANALYSIS  the thinking core — reads, scores 0–100, writes reasons
 *   04 · TODAY'S RADAR the dial — colored priority blips + ranked score bars
 *   05 · APPROVE & SEND the antenna — a paper plane launches (your approval)
 *   06 · IT KEEPS WORKING the fan-out finale: the single path SPLITS into
 *        colored streams flowing to shipped islands (waiting-on-them, tasks,
 *        morning brief) while a violet wireframe horizon teases what's coming
 *        (memory & rules, decision desk, Teams). The camera pulls up and back
 *        for the wide delta reveal.
 *
 * The glowing path draws itself slightly AHEAD of the camera and the camera
 * rides the path (scroll = travel). Labels are canvas-texture sprites in the
 * app's mono font, redrawn on theme toggle so both palettes stay crisp.
 * Theme-aware, DPR-capped, pauses offscreen, honors prefers-reduced-motion.
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
  /**
   * Hands the scroll-control handle to the parent once the scene is live.
   * A callback (not a ref) because `next/dynamic` does NOT forward refs —
   * a `ref` on the dynamic component silently stays null and the camera
   * would never move.
   */
  onReady?: (handle: VestaSceneHandle) => void;
};

/* ------------------------------- palettes -------------------------------- */

type Palette = {
  bg: number;
  ground: number;
  building: number;
  buildingSoft: number;
  paper: number;
  accent: number;
  accent2: number;
  grey: number;
  ink: number;
  ringOpacity: number;
  dotOpacity: number;
  shadowOpacity: number;
  ambient: number;
  directional: number;
  fogNear: number;
  fogFar: number;
};

const PALETTES: Record<Theme, Palette> = {
  dark: {
    bg: 0x0a0f17,
    ground: 0x101a29,
    building: 0x24344e,
    buildingSoft: 0x1a2638,
    paper: 0xd9e5f4,
    accent: 0x5ba8f5,
    accent2: 0x67e8d8,
    grey: 0x4b5870,
    ink: 0xe4eefb,
    ringOpacity: 0.28,
    dotOpacity: 0.5,
    shadowOpacity: 0.3,
    ambient: 1.0,
    directional: 0.9,
    fogNear: 70,
    fogFar: 175,
  },
  light: {
    bg: 0xeef5ff,
    ground: 0xf6faff,
    building: 0xffffff,
    buildingSoft: 0xe3edf9,
    paper: 0xffffff,
    accent: 0x2f7deb,
    accent2: 0x36b8e8,
    grey: 0xb9c6d8,
    ink: 0x182a44,
    ringOpacity: 0.55,
    dotOpacity: 0.55,
    shadowOpacity: 0.16,
    ambient: 1.05,
    directional: 0.75,
    fogNear: 80,
    fogFar: 210,
  },
};

// Status colors (same in both themes — they match the app's priority tokens).
const STATUS = { red: 0xe5484d, amber: 0xeb9d2a, green: 0x3fa066 } as const;
// "Future" color for the coming-soon horizon — readable on both backgrounds.
const VIOLET = 0x8b7cf6;

/* ------------------------------ world layout ------------------------------ */

// Five stations spaced so each scroll beat is a real arrival, plus a fan-out
// finale zone past the antenna.
const TOWER = new THREE.Vector3(-30, 0, -24);
const GATE = new THREE.Vector3(-15, 0, -11.5);
const AICORE = new THREE.Vector3(-1, 0, -0.5);
const RADAR = new THREE.Vector3(13, 0, 10.5);
const ANTENNA = new THREE.Vector3(27, 0, 21.5);

const PATH_Y = 0.22;

// Fan-out basis: forward continues the route's diagonal, sideways spreads the
// streams into the delta.
const FAN_DIR = new THREE.Vector3(14, 0, 11).normalize();
const FAN_NORMAL = new THREE.Vector3(-FAN_DIR.z, 0, FAN_DIR.x);
function fanPoint(forward: number, side: number): THREE.Vector3 {
  return ANTENNA.clone().addScaledVector(FAN_DIR, forward).addScaledVector(FAN_NORMAL, side);
}
const FAN_ORIGIN = fanPoint(2.6, 0);
const FAN_CENTER = fanPoint(11.5, 0);
const ISLAND_WAIT = fanPoint(11, -9.5);
const ISLAND_TASKS = fanPoint(13, 0);
const ISLAND_BRIEF = fanPoint(11, 9.5);
const SOON_MEMORY = fanPoint(19, -12);
const SOON_DESK = fanPoint(21, 0);
const SOON_TEAMS = fanPoint(19, 12);

function mainCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(TOWER.x + 1.4, PATH_Y, TOWER.z + 1.6),
      new THREE.Vector3(-25, PATH_Y, -20.5),
      new THREE.Vector3(-22, PATH_Y, -15.5),
      new THREE.Vector3(GATE.x - 2.0, PATH_Y, GATE.z - 1.8),
      new THREE.Vector3(GATE.x + 1.6, PATH_Y, GATE.z + 1.4),
      new THREE.Vector3(-9.5, PATH_Y, -6.5),
      new THREE.Vector3(-5, PATH_Y, -3.8),
      new THREE.Vector3(AICORE.x - 2.0, PATH_Y, AICORE.z - 1.0),
      new THREE.Vector3(AICORE.x + 2.0, PATH_Y, AICORE.z + 1.6),
      new THREE.Vector3(4.5, PATH_Y, 4.2),
      new THREE.Vector3(8.5, PATH_Y, 7.2),
      new THREE.Vector3(RADAR.x - 2.0, PATH_Y, RADAR.z - 0.8),
      new THREE.Vector3(RADAR.x + 2.2, PATH_Y, RADAR.z + 1.8),
      new THREE.Vector3(19.5, PATH_Y, 15),
      new THREE.Vector3(23, PATH_Y, 18.5),
      new THREE.Vector3(ANTENNA.x - 0.8, PATH_Y, ANTENNA.z - 1.0),
    ],
    false,
    'catmullrom',
    0.1,
  );
}

/** Grey spur: noise diverted off the gate into the open Hidden tray. */
function spurCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(GATE.x + 0.3, PATH_Y, GATE.z - 0.3),
    new THREE.Vector3(GATE.x + 2.4, PATH_Y, GATE.z - 3.0),
    new THREE.Vector3(GATE.x + 3.8, PATH_Y - 0.02, GATE.z - 5.4),
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

/** Activation of a station whose path-fraction is `frac` (1 = camera there).
 *  Tighter window than v3 (5 stations now share the route). */
function stationActivation(pathT: number, frac: number): number {
  return smooth(1 - Math.abs(pathT - frac) / 0.24);
}

/** Labels use an even tighter window so neighbors' text never bleeds into an
 *  arrival — only the station being visited speaks. */
function labelActivation(pathT: number, frac: number): number {
  return smooth(1 - Math.abs(pathT - frac) / 0.17);
}

/** Path fraction (arc-length t) where the curve passes closest to `target`. */
function closestT(curve: THREE.CatmullRomCurve3, target: THREE.Vector3): number {
  const pt = new THREE.Vector3();
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    curve.getPointAt(t, pt);
    const d = pt.distanceToSquared(target);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
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

/* --------------------------- in-world text labels --------------------------- */

const MONO_STACK = `'JetBrains Mono', ui-monospace, monospace`;

type LabelDriver = 'path' | 'fan' | 'soon';

type LabelEntry = {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  tex: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  text: string;
  station: boolean;
  driver: LabelDriver;
  frac: number;
  height: number;
  baseW: number;
  maxOpacity: number;
  soonSuffix: boolean;
};

function setLabelFont(ctx: CanvasRenderingContext2D, px: number) {
  ctx.font = `600 ${px}px ${MONO_STACK}`;
  // Chromium supports canvas letter-spacing; elsewhere this is a harmless no-op.
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
    `${Math.round(px * 0.13)}px`;
}

/** (Re)draws a label's canvas — crisp 2x text with an accent bullet for
 *  station tags and a violet "· SOON" suffix for the roadmap monuments. */
function drawLabel(l: LabelEntry, ink: string, accent: string, violet: string) {
  const px = l.station ? 66 : 46;
  const pad = Math.round(px * 0.4);
  const gap = Math.round(px * 0.36);
  const bullet = l.station ? Math.round(px * 0.4) : 0;
  const suffix = l.soonSuffix ? ' · SOON' : '';
  const measure = l.canvas.getContext('2d')!;
  setLabelFont(measure, px);
  const wMain = measure.measureText(l.text).width;
  const wSuffix = suffix ? measure.measureText(suffix).width : 0;
  l.canvas.width = Math.max(2, Math.ceil(pad * 2 + (bullet ? bullet + gap : 0) + wMain + wSuffix));
  l.canvas.height = Math.ceil(px * 1.75);
  const ctx = l.canvas.getContext('2d')!; // resizing reset the context state
  setLabelFont(ctx, px);
  ctx.textBaseline = 'middle';
  const midY = l.canvas.height / 2;
  let x = pad;
  if (bullet) {
    ctx.fillStyle = accent;
    ctx.fillRect(x, Math.round(midY - bullet / 2), bullet, bullet);
    x += bullet + gap;
  }
  ctx.fillStyle = ink;
  ctx.fillText(l.text, x, midY + px * 0.04);
  if (suffix) {
    ctx.fillStyle = violet;
    ctx.fillText(suffix, x + wMain, midY + px * 0.04);
  }
  l.tex.needsUpdate = true;
  // Base world size; the render loop applies a narrow-screen factor on top.
  l.baseW = l.height * (l.canvas.width / l.canvas.height);
  l.sprite.scale.set(l.baseW, l.height, 1);
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

export function VestaScene({ theme, reducedMotion = false, className, onReady }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);
  const themeRef = useRef(theme);
  themeRef.current = theme;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    onReadyRef.current?.({
      setProgress(p: number) {
        progressRef.current = Math.min(1, Math.max(0, p));
      },
    });
  }, []);

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
    let vw = 1;
    let vh = 1;

    function applyProjection() {
      const aspect = vw / vh;
      // Narrow screens get a wider view so the stations still fit.
      const view = (aspect < 0.9 ? 15 : 11.5) / camZoom;
      camera.left = -view * aspect;
      camera.right = view * aspect;
      camera.top = view;
      camera.bottom = -view;
      camera.updateProjectionMatrix();
    }

    function resize() {
      vw = host.clientWidth || 1;
      vh = host.clientHeight || 1;
      renderer.setSize(vw, vh, false);
      applyProjection();
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
    const matPaper = new THREE.MeshLambertMaterial();
    const matAccent = new THREE.MeshBasicMaterial();
    const matAccent2 = new THREE.MeshBasicMaterial();
    const matGrey = new THREE.MeshLambertMaterial();
    const matRed = new THREE.MeshBasicMaterial({ color: STATUS.red });
    const matAmber = new THREE.MeshBasicMaterial({ color: STATUS.amber });
    const matGreen = new THREE.MeshBasicMaterial({ color: STATUS.green });
    const matViolet = new THREE.MeshBasicMaterial({ color: VIOLET });
    const matPlane = new THREE.MeshLambertMaterial({ transparent: true });
    const matPathBase = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.18 });
    const matPathGlow = new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 });
    const matSpur = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55 });
    const matRing = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
    const matCoreWire = new THREE.MeshBasicMaterial({
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const matSoonWire = new THREE.MeshBasicMaterial({
      color: VIOLET,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    const matSweep = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.2,
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
    const ground = new THREE.Mesh(new THREE.CircleGeometry(170, 72), matGround);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    function dropShadow(x: number, z: number, s: number) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), matShadow);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.005, z);
      scene.add(m);
    }

    /** Dotted halo — brightens with its driver (path pass / fan reveal). */
    const dotFields: {
      mesh: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      frac: number;
      weight: number;
      driver: LabelDriver;
    }[] = [];
    function dotField(
      center: THREE.Vector3,
      radius: number,
      frac: number,
      weight = 1,
      driver: LabelDriver = 'path',
    ) {
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
      dotFields.push({ mesh: m, mat, frac, weight, driver });
    }

    /* labels --------------------------------------------------------------------- */
    const labels: LabelEntry[] = [];
    function makeLabel(
      text: string,
      pos: THREE.Vector3,
      opts: {
        station?: boolean;
        driver?: LabelDriver;
        frac?: number;
        height?: number;
        maxOpacity?: number;
        soon?: boolean;
      } = {},
    ) {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 2;
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(pos);
      sprite.renderOrder = 60;
      scene.add(sprite);
      labels.push({
        sprite,
        mat,
        tex,
        canvas,
        text,
        station: !!opts.station,
        driver: opts.driver ?? 'path',
        frac: opts.frac ?? 0,
        height: opts.height ?? (opts.station ? 1.45 : 0.8),
        baseW: 1,
        maxOpacity: opts.maxOpacity ?? (opts.station ? 0.95 : 0.85),
        soonSuffix: !!opts.soon,
      });
    }

    /* the route (built early so districts can hug it) --------------------------- */
    const curve = mainCurve();
    const FRAC = {
      tower: closestT(curve, TOWER),
      gate: closestT(curve, GATE),
      ai: closestT(curve, AICORE),
      radar: closestT(curve, RADAR),
      antenna: closestT(curve, ANTENNA),
    };

    /* districts ------------------------------------------------------------------ */
    /** Props that rise as their district wakes (scale.y 0.8 → 1). */
    const risers: { mesh: THREE.Mesh; frac: number; h: number }[] = [];
    function riser(mesh: THREE.Mesh, frac: number, h: number) {
      risers.push({ mesh, frac, h });
      scene.add(mesh);
    }

    // 01 — the envelope monument: mail arrives. A paper envelope with a glowing
    // accent flap floats over a plinth, ringed by a small mail-district downtown.
    const envelope = new THREE.Group();
    envelope.add(box(4.2, 0.5, 3.2, matBuildingSoft, 0, 0.25, 0)); // plinth
    const envBody = new THREE.Group();
    envBody.add(box(3.0, 1.9, 0.22, matPaper, 0, 1.55, 0));
    const flapL = box(1.86, 0.1, 0.06, matAccent, -0.75, 1.975, 0.15);
    flapL.rotation.z = -0.611;
    const flapR = box(1.86, 0.1, 0.06, matAccent, 0.75, 1.975, 0.15);
    flapR.rotation.z = 0.611;
    envBody.add(flapL, flapR);
    envBody.rotation.y = Math.PI / 4; // face the camera
    envelope.add(envBody);
    envelope.position.copy(TOWER);
    scene.add(envelope);
    dropShadow(TOWER.x, TOWER.z, 9);
    dotField(TOWER, 7, FRAC.tower);
    makeLabel('01 · INBOX', new THREE.Vector3(TOWER.x, 5.0, TOWER.z), {
      station: true,
      frac: FRAC.tower,
    });
    makeLabel('OUTLOOK', new THREE.Vector3(TOWER.x + 2.6, 3.4, TOWER.z + 2.6), {
      frac: FRAC.tower,
    });
    // Floating letter sheets drifting toward the path (mail materializing).
    const sheets: { mesh: THREE.Mesh; phase: number }[] = [];
    const sheetSpots: [number, number, number][] = [
      [-2.6, 2.2, 1.6],
      [2.8, 2.8, -1.2],
      [1.6, 3.4, 2.4],
    ];
    for (const [dx, baseY, dz] of sheetSpots) {
      const s = box(0.9, 0.05, 0.66, matPaper, TOWER.x + dx, baseY, TOWER.z + dz);
      s.rotation.y = dx; // varied, deterministic
      scene.add(s);
      sheets.push({ mesh: s, phase: dx * 2 });
    }
    const downtown: [number, number, number, number, number][] = [
      [-4.4, 2.4, 1.8, 4.0, 1.8],
      [3.8, -2.0, 1.6, 3.0, 1.6],
      [-3.0, -3.2, 1.4, 2.2, 1.4],
      [4.6, 2.6, 1.3, 1.8, 1.3],
      [0.4, -5.0, 1.6, 2.6, 1.6],
    ];
    downtown.forEach(([dx, dz, w, h, d], i) => {
      riser(
        box(w, h, d, i % 2 ? matBuilding : matBuildingSoft, TOWER.x + dx, h / 2, TOWER.z + dz),
        FRAC.tower,
        h,
      );
      dropShadow(TOWER.x + dx, TOWER.z + dz, Math.max(w, d) * 2.6);
    });

    // 02 — the scanner gate: triage. The path runs under a gate whose scanning
    // bar sweeps; noise leaves down the grey spur into the open Hidden tray.
    const gateGroup = new THREE.Group();
    gateGroup.add(box(0.6, 3.6, 0.6, matBuilding, -1.5, 1.8, 0));
    gateGroup.add(box(0.6, 3.6, 0.6, matBuilding, 1.5, 1.8, 0));
    gateGroup.add(box(3.6, 0.55, 0.6, matBuilding, 0, 3.85, 0));
    const scanner = box(2.9, 0.12, 0.45, matAccent2, 0, 3.45, 0);
    gateGroup.add(scanner);
    gateGroup.rotation.y = Math.PI / 4; // straddles the diagonal path
    gateGroup.position.copy(GATE);
    scene.add(gateGroup);
    dropShadow(GATE.x, GATE.z, 7);
    dotField(GATE, 7.5, FRAC.gate);
    makeLabel('02 · FILTERING', new THREE.Vector3(GATE.x, 6.2, GATE.z), {
      station: true,
      frac: FRAC.gate,
    });
    // The Hidden tray: an open-top bin the grey packets sink into (reviewable,
    // not deleted — that's the product promise).
    const tray = new THREE.Group();
    tray.add(box(2.4, 0.14, 2.4, matGrey, 0, 0.07, 0));
    tray.add(box(2.4, 0.8, 0.14, matGrey, 0, 0.4, -1.13));
    tray.add(box(2.4, 0.8, 0.14, matGrey, 0, 0.4, 1.13));
    tray.add(box(0.14, 0.8, 2.4, matGrey, -1.13, 0.4, 0));
    tray.add(box(0.14, 0.8, 2.4, matGrey, 1.13, 0.4, 0));
    tray.position.set(GATE.x + 3.9, 0, GATE.z - 5.7);
    scene.add(tray);
    dropShadow(tray.position.x, tray.position.z, 5);
    makeLabel('HIDDEN TRAY', new THREE.Vector3(tray.position.x, 2.1, tray.position.z), {
      frac: FRAC.gate,
    });
    // Container yard: noise already filed away.
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        riser(
          box(1.4, 0.85, 0.85, matGrey, GATE.x + 5.0 + i * 1.5, 0.42, GATE.z - 3.5 - j * 1.2),
          FRAC.gate,
          0.85,
        );
      }
    }
    makeLabel('NOISE', new THREE.Vector3(GATE.x + 6.4, 2.3, GATE.z - 4.1), {
      frac: FRAC.gate,
      maxOpacity: 0.6,
    });

    // 03 — the AI analysis core: the thinking station. A faceted core breathes
    // over a ring platform while thought-sheets orbit it; it emits colored
    // priority tokens that fly back onto the path (emails become scored items),
    // fills a 0–100 score pylon, and writes plain-word reason lines on a slab.
    const aiGroup = new THREE.Group();
    const aiPlatform = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.6, 0.4, 48),
      matBuildingSoft,
    );
    aiPlatform.position.y = 0.2;
    aiGroup.add(aiPlatform);
    const aiRing = new THREE.Mesh(new THREE.RingGeometry(2.5, 2.62, 64), matRing);
    aiRing.rotation.x = -Math.PI / 2;
    aiRing.position.y = 0.42;
    aiGroup.add(aiRing);
    const coreInner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), matAccent2);
    coreInner.position.y = 2.7;
    const coreWire = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 0), matCoreWire);
    coreWire.position.y = 2.7;
    aiGroup.add(coreInner, coreWire);
    aiGroup.position.copy(AICORE);
    scene.add(aiGroup);
    dropShadow(AICORE.x, AICORE.z, 11);
    dotField(AICORE, 8, FRAC.ai);
    makeLabel('03 · AI ANALYSIS', new THREE.Vector3(AICORE.x, 6.6, AICORE.z), {
      station: true,
      frac: FRAC.ai,
    });
    // Orbiting thought-sheets (the AI reading pages around the core).
    const aiSheets: { mesh: THREE.Mesh; phase: number; r: number; y: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.58), matPaper);
      scene.add(s);
      aiSheets.push({ mesh: s, phase: (i / 3) * Math.PI * 2, r: 2.1 + i * 0.25, y: 2.3 + i * 0.5 });
    }
    // Score pylon: a 0–100 bar that fills as the core analyzes.
    const scoreShellPos = new THREE.Vector3(AICORE.x + 4.6, 0, AICORE.z - 2.2);
    scene.add(box(0.9, 0.3, 0.9, matBuildingSoft, scoreShellPos.x, 0.15, scoreShellPos.z));
    const scoreFill = box(0.55, 3.0, 0.55, matAccent, scoreShellPos.x, 0.3 + 1.5, scoreShellPos.z);
    scene.add(scoreFill);
    dropShadow(scoreShellPos.x, scoreShellPos.z, 3.4);
    makeLabel('SCORE 0–100', new THREE.Vector3(scoreShellPos.x, 4.3, scoreShellPos.z), {
      frac: FRAC.ai,
    });
    // Reason slab: a paper card whose plain-word lines draw themselves in.
    const reasonGroup = new THREE.Group();
    reasonGroup.add(box(2.8, 1.9, 0.16, matPaper, 0, 1.35, 0));
    const reasonLines: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const line = box(2.0 - i * 0.35, 0.14, 0.04, i === 0 ? matAccent : matAccent2, -0.1 - (i * 0.35) / 2, 1.85 - i * 0.42, 0.11);
      reasonGroup.add(line);
      reasonLines.push(line);
    }
    reasonGroup.rotation.y = Math.PI / 4; // face the camera
    reasonGroup.position.set(AICORE.x - 4.4, 0, AICORE.z + 2.8);
    scene.add(reasonGroup);
    dropShadow(reasonGroup.position.x, reasonGroup.position.z, 6);
    makeLabel(
      'REASONS YOU CAN READ',
      new THREE.Vector3(reasonGroup.position.x, 3.4, reasonGroup.position.z),
      { frac: FRAC.ai },
    );
    // Priority tokens: red/amber/green octahedra rise out of the core and fly
    // back down to the path — analyzed emails leaving as scored work items.
    const aiExit = curve.getPointAt(Math.min(1, FRAC.ai + 0.055));
    const tokenFlight = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(AICORE.x, 2.7, AICORE.z),
      new THREE.Vector3((AICORE.x + aiExit.x) / 2, 4.6, (AICORE.z + aiExit.z) / 2),
      new THREE.Vector3(aiExit.x, PATH_Y + 0.3, aiExit.z),
    );
    const aiTokens: { mesh: THREE.Mesh; offset: number }[] = [];
    [matRed, matAmber, matGreen].forEach((mat, i) => {
      const t = new THREE.Mesh(new THREE.OctahedronGeometry(0.26), mat);
      t.visible = false;
      scene.add(t);
      aiTokens.push({ mesh: t, offset: i / 3 });
    });
    // A small analysis district.
    const aiBlocks: [number, number, number, number, number][] = [
      [-3.8, -2.6, 1.5, 2.4, 1.5],
      [3.4, 2.8, 1.3, 1.9, 1.3],
      [-1.0, -4.6, 1.4, 1.6, 1.4],
    ];
    aiBlocks.forEach(([dx, dz, w, h, d], i) => {
      riser(
        box(w, h, d, i % 2 ? matBuilding : matBuildingSoft, AICORE.x + dx, h / 2, AICORE.z + dz),
        FRAC.ai,
        h,
      );
      dropShadow(AICORE.x + dx, AICORE.z + dz, Math.max(w, d) * 2.6);
    });

    // 04 — the radar dial: the dashboard itself. Concentric rings, a live
    // sweep, colored priority blips, and a ranked score bar-chart beside it.
    const radarGroup = new THREE.Group();
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(5.0, 5.2, 0.4, 56), matBuildingSoft);
    platform.position.y = 0.2;
    radarGroup.add(platform);
    for (const r of [1.8, 3.0, 4.2]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.05, r, 72), matRing);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.42;
      radarGroup.add(ring);
    }
    const sweep = new THREE.Mesh(new THREE.CircleGeometry(4.6, 30, 0, Math.PI / 3.1), matSweep);
    sweep.rotation.x = -Math.PI / 2;
    sweep.position.y = 0.43;
    radarGroup.add(sweep);
    // Work-item blips at priority colors (red = overdue, amber = due, …).
    const blips: { mesh: THREE.Mesh; phase: number }[] = [];
    const blipSpecs: [number, number, THREE.Material, number][] = [
      [1.5, 0.5, matRed, 0.34],
      [2.7, 1.7, matAmber, 0.3],
      [3.5, 3.5, matGreen, 0.26],
      [2.3, 4.4, matAccent, 0.28],
      [4.0, 5.6, matAmber, 0.24],
      [1.1, 2.8, matAccent2, 0.24],
      [4.4, 1.0, matRed, 0.28],
    ];
    blipSpecs.forEach(([r, a, mat, size], i) => {
      const b = new THREE.Mesh(new THREE.OctahedronGeometry(size), mat);
      b.position.set(Math.cos(a) * r, 0.7, Math.sin(a) * r);
      radarGroup.add(b);
      blips.push({ mesh: b, phase: i * 1.3 });
    });
    radarGroup.position.copy(RADAR);
    scene.add(radarGroup);
    dropShadow(RADAR.x, RADAR.z, 13);
    dotField(RADAR, 8.5, FRAC.radar);
    makeLabel("04 · TODAY'S RADAR", new THREE.Vector3(RADAR.x, 6.4, RADAR.z), {
      station: true,
      frac: FRAC.radar,
    });
    makeLabel('OVERDUE', new THREE.Vector3(RADAR.x + 1.6, 2.3, RADAR.z + 0.7), {
      frac: FRAC.radar,
      maxOpacity: 0.7,
    });
    // Ranked score bars (the 0–100 priority scores, highest first).
    const barBase = box(3.4, 0.3, 1.4, matBuildingSoft, RADAR.x + 5.6, 0.15, RADAR.z - 2.6);
    scene.add(barBase);
    const barSpecs: [THREE.Material, number][] = [
      [matRed, 2.7],
      [matAmber, 1.9],
      [matGreen, 1.2],
    ];
    barSpecs.forEach(([mat, h], i) => {
      riser(
        box(0.7, h, 0.7, mat, RADAR.x + 4.6 + i * 1.05, 0.3 + h / 2, RADAR.z - 2.6),
        FRAC.radar,
        h,
      );
    });
    dropShadow(RADAR.x + 5.6, RADAR.z - 2.6, 6);
    makeLabel('RANKED', new THREE.Vector3(RADAR.x + 5.6, 4.0, RADAR.z - 2.6), {
      frac: FRAC.radar,
      maxOpacity: 0.7,
    });
    // Vesta HQ slab with a glowing accent band (the command center).
    const hq = new THREE.Group();
    hq.add(box(3.4, 2.4, 2.2, matBuilding, 0, 1.2, 0));
    hq.add(box(1.6, 1.0, 1.6, matBuildingSoft, 0, 2.9, 0));
    hq.add(box(3.5, 0.16, 2.3, matAccent, 0, 1.9, 0));
    hq.position.set(RADAR.x - 5.4, 0, RADAR.z + 3.6);
    scene.add(hq);
    dropShadow(hq.position.x, hq.position.z, 8);

    // 05 — the send antenna: the approved reply goes out. A paper plane
    // launches along an arc while broadcast rings expand.
    const antennaGroup = new THREE.Group();
    antennaGroup.add(box(1.8, 0.8, 1.8, matBuilding, 0, 0.4, 0));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 4.4, 10), matBuilding);
    mast.position.y = 3.0;
    antennaGroup.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), matAccent2);
    beacon.position.y = 5.4;
    antennaGroup.add(beacon);
    const stationRipples: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 56), matRippleStation);
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.46;
      antennaGroup.add(r);
      stationRipples.push(r);
    }
    antennaGroup.position.copy(ANTENNA);
    scene.add(antennaGroup);
    dropShadow(ANTENNA.x, ANTENNA.z, 6);
    dotField(ANTENNA, 7.5, FRAC.antenna);
    makeLabel('05 · APPROVE & SEND', new THREE.Vector3(ANTENNA.x, 7.4, ANTENNA.z), {
      station: true,
      frac: FRAC.antenna,
    });
    makeLabel('APPROVED', new THREE.Vector3(ANTENNA.x + 3.4, 8.4, ANTENNA.z + 2.5), {
      frac: FRAC.antenna,
      maxOpacity: 0.7,
    });
    // The paper plane (cone nose-forward) + its flight arc.
    const plane = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.0, 4), matPlane);
    plane.visible = false;
    scene.add(plane);
    const flight = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(ANTENNA.x, 5.4, ANTENNA.z),
      new THREE.Vector3(ANTENNA.x + 5, 8.2, ANTENNA.z + 3.6),
      new THREE.Vector3(ANTENNA.x + 12, 10.5, ANTENNA.z + 8.5),
    );
    const mastSpots: [number, number, number][] = [
      [-4.2, 3.0, 2.6],
      [-2.0, 5.0, 3.2],
      [4.6, -2.4, 2.2],
      [6.0, 1.8, 2.9],
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

    /* 06 — the fan-out finale: streams to shipped islands + a SOON horizon. ---- */
    makeLabel('06 · IT KEEPS WORKING', new THREE.Vector3(FAN_CENTER.x, 9.0, FAN_CENTER.z), {
      station: true,
      driver: 'fan',
      height: 2.4,
    });

    // Streams: the single path splits into colored flows (a new visual
    // language for "after the send"). Vivid streams reach shipped islands;
    // thinner violet streams reach the wireframe SOON monuments.
    type Stream = {
      tube: THREE.Mesh;
      mat: THREE.MeshBasicMaterial;
      indexCount: number;
      curve: THREE.CatmullRomCurve3;
      particles: { mesh: THREE.Mesh; offset: number }[];
      head: THREE.Sprite | null;
      vivid: boolean;
      order: number;
    };
    const streams: Stream[] = [];
    const particleGeo = new THREE.SphereGeometry(0.13, 10, 10);
    function addStream(
      target: THREE.Vector3,
      side: number,
      color: number,
      vivid: boolean,
      order: number,
      particleMat: THREE.MeshBasicMaterial,
    ) {
      const mid = fanPoint(vivid ? 6.5 : 9, side * 0.5);
      const dirT = target.clone().sub(FAN_ORIGIN).normalize();
      const end = target.clone().addScaledVector(dirT, -1.8);
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(FAN_ORIGIN.x, PATH_Y, FAN_ORIGIN.z),
        new THREE.Vector3(mid.x, PATH_Y + 0.12, mid.z),
        new THREE.Vector3(end.x, PATH_Y, end.z),
      ]);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: vivid ? 0.95 : 0.5,
      });
      const tube = new THREE.Mesh(new THREE.TubeGeometry(c, 120, vivid ? 0.07 : 0.045, 8, false), mat);
      const indexCount = tube.geometry.index!.count;
      tube.geometry.setDrawRange(0, 0);
      scene.add(tube);
      const particles: { mesh: THREE.Mesh; offset: number }[] = [];
      const count = vivid ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(particleGeo, particleMat);
        m.visible = false;
        scene.add(m);
        particles.push({ mesh: m, offset: i / count });
      }
      let head: THREE.Sprite | null = null;
      if (vivid) {
        head = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: headTex, color, transparent: true, depthWrite: false }),
        );
        head.scale.setScalar(2.2);
        head.visible = false;
        scene.add(head);
      }
      streams.push({ tube, mat, indexCount, curve: c, particles, head, vivid, order });
    }
    const matAmberP = new THREE.MeshBasicMaterial({ color: STATUS.amber });
    const matGreenP = new THREE.MeshBasicMaterial({ color: STATUS.green });
    const matCyanP = new THREE.MeshBasicMaterial(); // accent2, theme-tinted
    addStream(ISLAND_WAIT, -9.5, STATUS.amber, true, 0, matAmberP);
    addStream(ISLAND_TASKS, 0, STATUS.green, true, 1, matGreenP);
    addStream(ISLAND_BRIEF, 9.5, PALETTES.dark.accent2, true, 2, matCyanP);
    const cyanStream = streams[2]; // re-tinted on theme change
    addStream(SOON_MEMORY, -12, VIOLET, false, 3, matViolet);
    addStream(SOON_DESK, 0, VIOLET, false, 4, matViolet);
    addStream(SOON_TEAMS, 12, VIOLET, false, 5, matViolet);

    // Island: WAITING ON THEM — a standing clock with turning hands and an
    // amber pressure bar that climbs (the longer the silence, the higher).
    const waitGroup = new THREE.Group();
    waitGroup.add(box(2.6, 0.4, 2.6, matBuildingSoft, 0, 0.2, 0));
    const clockPylon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.2, 10), matBuilding);
    clockPylon.position.y = 1.5;
    waitGroup.add(clockPylon);
    // The clock face: ring + two hands on pivots, turned to face the iso camera.
    const clockFace = new THREE.Group();
    clockFace.position.y = 3.4;
    clockFace.rotation.y = Math.PI / 4;
    clockFace.add(new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.09, 10, 48), matBuilding));
    const handLongPivot = new THREE.Group();
    handLongPivot.add(box(0.1, 0.85, 0.1, matAmber, 0, 0.42, 0.06));
    const handShortPivot = new THREE.Group();
    handShortPivot.add(box(0.1, 0.6, 0.1, matAmber, 0, 0.3, 0.06));
    clockFace.add(handLongPivot, handShortPivot);
    waitGroup.add(clockFace);
    const pressure = box(0.5, 1.8, 0.5, matAmber, 1.7, 0.4 + 0.9, 1.0);
    waitGroup.add(pressure);
    waitGroup.scale.setScalar(1.25);
    waitGroup.position.copy(ISLAND_WAIT);
    scene.add(waitGroup);
    dropShadow(ISLAND_WAIT.x, ISLAND_WAIT.z, 7);
    dotField(ISLAND_WAIT, 5, 0, 0.8, 'fan');
    makeLabel('WAITING ON THEM', new THREE.Vector3(ISLAND_WAIT.x, 6.4, ISLAND_WAIT.z), {
      driver: 'fan',
      height: 1.0,
    });

    // Island: TASKS — a checklist slab where green tick-cubes pop in.
    const tasksGroup = new THREE.Group();
    tasksGroup.add(box(2.8, 0.4, 2.8, matBuildingSoft, 0, 0.2, 0));
    tasksGroup.add(box(2.0, 2.2, 0.18, matPaper, 0, 1.6, 0));
    const taskCubes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const c = box(0.34, 0.34, 0.34, matGreen, -0.55, 2.3 - i * 0.62, 0.2);
      tasksGroup.add(c);
      taskCubes.push(c);
      tasksGroup.add(box(1.0, 0.12, 0.06, matGrey, 0.25, 2.3 - i * 0.62, 0.14));
    }
    tasksGroup.rotation.y = Math.PI / 4;
    tasksGroup.scale.setScalar(1.25);
    tasksGroup.position.copy(ISLAND_TASKS);
    scene.add(tasksGroup);
    dropShadow(ISLAND_TASKS.x, ISLAND_TASKS.z, 7);
    dotField(ISLAND_TASKS, 5, 0, 0.8, 'fan');
    makeLabel('TASKS', new THREE.Vector3(ISLAND_TASKS.x, 5.6, ISLAND_TASKS.z), {
      driver: 'fan',
      height: 1.0,
    });

    // Island: MORNING BRIEF — a sun rising over a horizon slab with rays.
    const briefGroup = new THREE.Group();
    briefGroup.add(box(3.0, 0.4, 2.6, matBuildingSoft, 0, 0.2, 0));
    briefGroup.add(box(2.6, 0.5, 0.3, matBuilding, 0, 0.65, 0));
    const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32, 0, Math.PI), matAmber);
    sunDisc.position.y = 0.9;
    briefGroup.add(sunDisc);
    const rays: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const a = Math.PI * (0.25 + i * 0.25);
      const ray = box(0.08, 0.6, 0.04, matAmber, Math.cos(a) * 1.5, 0.9 + Math.sin(a) * 1.5, 0);
      ray.rotation.z = a - Math.PI / 2;
      briefGroup.add(ray);
      rays.push(ray);
    }
    briefGroup.rotation.y = Math.PI / 4;
    briefGroup.scale.setScalar(1.25);
    briefGroup.position.copy(ISLAND_BRIEF);
    scene.add(briefGroup);
    dropShadow(ISLAND_BRIEF.x, ISLAND_BRIEF.z, 7);
    dotField(ISLAND_BRIEF, 5, 0, 0.8, 'fan');
    makeLabel('MORNING BRIEF', new THREE.Vector3(ISLAND_BRIEF.x, 5.6, ISLAND_BRIEF.z), {
      driver: 'fan',
      height: 1.0,
    });

    // The SOON horizon: violet wireframe monuments — designed but not built,
    // which is exactly what they are.
    const soonMonuments: THREE.Group[] = [];
    function soonMonument(pos: THREE.Vector3, build: (g: THREE.Group) => void, label: string) {
      const g = new THREE.Group();
      build(g);
      g.position.copy(pos);
      scene.add(g);
      soonMonuments.push(g);
      makeLabel(label, new THREE.Vector3(pos.x, 4.6, pos.z), {
        driver: 'soon',
        height: 0.9,
        soon: true,
        maxOpacity: 0.8,
      });
    }
    soonMonument(
      SOON_MEMORY,
      (g) => {
        // Memory & rules: a vault of stacked slabs.
        g.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 1.9), matSoonWire).translateY(0.35));
        g.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 1.6), matSoonWire).translateY(1.1));
        g.add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 1.3), matSoonWire).translateY(1.85));
      },
      'MEMORY & RULES',
    );
    soonMonument(
      SOON_DESK,
      (g) => {
        // Decision desk: a balance — beam over a column, a pan on each side.
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.4, 0.4), matSoonWire).translateY(1.2));
        g.add(new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.22, 0.4), matSoonWire).translateY(2.5));
        const panL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), matSoonWire);
        panL.position.set(-1.35, 1.7, 0);
        const panR = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), matSoonWire);
        panR.position.set(1.35, 2.1, 0);
        g.add(panL, panR);
      },
      'DECISION DESK',
    );
    soonMonument(
      SOON_TEAMS,
      (g) => {
        // Teams: a chat-bubble tower.
        g.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 0.5), matSoonWire).translateY(1.9));
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.5), matSoonWire);
        tail.position.set(-0.6, 0.9, 0);
        g.add(tail);
        g.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.52), matSoonWire).translateY(2.1));
      },
      'TEAMS',
    );
    for (const g of soonMonuments) g.rotation.y = Math.PI / 4;

    // Corridor city: blocks hug the whole route (deterministic placement), so
    // the camera always travels over content — never an empty void.
    {
      const pt = new THREE.Vector3();
      const tangent = new THREE.Vector3();
      const normal = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      const stationFracs = Object.values(FRAC);
      for (let i = 0; i < 26; i++) {
        const t = 0.03 + (i / 25) * 0.94;
        if (stationFracs.some((f) => Math.abs(t - f) < 0.055)) continue; // keep arrivals clear
        curve.getPointAt(t, pt);
        curve.getTangentAt(t, tangent);
        normal.crossVectors(up, tangent).normalize();
        const side = i % 2 ? 1 : -1;
        const lateral = 4.5 + (((i * 37) % 23) / 23) * 3.5;
        const h = 0.9 + (((i * 53) % 17) / 17) * 2.0;
        const w = 1.2 + (((i * 29) % 11) / 11) * 0.8;
        const x = pt.x + normal.x * side * lateral;
        const z = pt.z + normal.z * side * lateral;
        scene.add(box(w, h, w, i % 3 ? matBuildingSoft : matBuilding, x, h / 2, z));
        dropShadow(x, z, w * 2.5);
      }
      // Dotted ground patches along the route — they light up as the path
      // passes (frac = their position), so the land wakes under the journey.
      for (const t of [0.13, 0.37, 0.61, 0.85]) {
        curve.getPointAt(t, pt);
        dotField(new THREE.Vector3(pt.x, 0, pt.z), 4.5, t, 0.55);
      }
      // A few far landmarks for depth (some past the fan zone).
      const far: [number, number, number, number][] = [
        [-36, -32, 2.0, 3.2],
        [-20, 0, 1.6, 2.2],
        [-2, -18, 1.7, 2.6],
        [22, 2, 1.6, 2.4],
        [14, 26, 1.5, 2.0],
        [50, 36, 1.8, 2.8],
        [46, 14, 1.6, 2.3],
        [24, 40, 1.5, 2.1],
      ];
      for (const [x, z, w, h] of far) {
        scene.add(box(w, h, w, matBuildingSoft, x, h / 2, z));
        dropShadow(x, z, w * 2.5);
      }
    }

    /* the glowing path ------------------------------------------------------------ */
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
    headGlow.scale.setScalar(3.8);
    scene.add(headGlow);

    const spur = spurCurve();
    const spurTube = new THREE.Mesh(new THREE.TubeGeometry(spur, 60, 0.055, RADIAL, false), matSpur);
    const spurIndexCount = spurTube.geometry.index!.count;
    spurTube.geometry.setDrawRange(0, 0);
    scene.add(spurTube);

    /* packets ----------------------------------------------------------------------- */
    const packetGeo = new THREE.BoxGeometry(0.38, 0.24, 0.52);
    const packets: { mesh: THREE.Mesh; offset: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(packetGeo, i % 2 ? matAccent2 : matAccent);
      mesh.visible = false;
      scene.add(mesh);
      packets.push({ mesh, offset: i / 10 });
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
      // Clamp: when the host is scrolled far off-screen the raw mapping
      // explodes (rect.top is thousands of px away) and would shove the
      // parallax camera target way off the world.
      pointerNdc.set(
        Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1)),
        Math.max(-1, Math.min(1, -(((e.clientY - rect.top) / rect.height) * 2 - 1))),
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
    const hexOf = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
    function applyTheme(t: Theme) {
      const p = PALETTES[t];
      scene.background = new THREE.Color(p.bg);
      scene.fog = new THREE.Fog(p.bg, p.fogNear, p.fogFar);
      matGround.color.set(p.ground);
      matBuilding.color.set(p.building);
      matBuildingSoft.color.set(p.buildingSoft);
      matPaper.color.set(p.paper);
      matPlane.color.set(p.paper);
      matAccent.color.set(p.accent);
      matAccent2.color.set(p.accent2);
      matCyanP.color.set(p.accent2);
      matCoreWire.color.set(p.accent);
      cyanStream.mat.color.set(p.accent2);
      if (cyanStream.head) (cyanStream.head.material as THREE.SpriteMaterial).color.set(p.accent2);
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
      // Crisp text labels are canvas-drawn — redraw them in the new palette.
      for (const l of labels) drawLabel(l, hexOf(p.ink), hexOf(p.accent), hexOf(VIOLET));
    }
    applyTheme(themeRef.current);
    let appliedTheme: Theme = themeRef.current;
    // The mono font may load after the first draw — redraw once it's ready.
    let fontsRedrawn = false;
    document.fonts?.ready.then(() => {
      if (!fontsRedrawn) {
        fontsRedrawn = true;
        applyTheme(appliedTheme);
      }
    });

    /* animation loop --------------------------------------------------------------------- */
    let raf = 0;
    let running = true;
    let shown = 0;
    const clock = new THREE.Clock();
    const camPos = new THREE.Vector3();
    const camTarget = new THREE.Vector3(0, 0, 0);
    const followPt = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const OVERVIEW_TARGET = new THREE.Vector3(-2, 0, -2);
    const REDUCED_TARGET = new THREE.Vector3(8, 0, 6);

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

      // Travel: the camera RIDES the path (linear, so captions stay in sync)
      // until ~p=.78, then the finale window pulls up and back over the fan.
      const pathT = Math.min(1, Math.max(0, (p - 0.05) / 0.73));
      const fin = reducedMotion ? 1 : windowT(p, 0.8, 0.97);
      const soonAct = reducedMotion ? 1 : windowT(p, 0.87, 1.0);
      const reveal = reducedMotion ? 1 : Math.min(1, pathT + 0.05);
      curve.getPointAt(Math.min(0.999, Math.max(0.001, pathT)), followPt);

      // Zoom breathes IN at each arrival, OUT while traveling between.
      const arrival = Math.max(
        stationActivation(pathT, FRAC.tower),
        stationActivation(pathT, FRAC.gate),
        stationActivation(pathT, FRAC.ai),
        stationActivation(pathT, FRAC.radar),
        stationActivation(pathT, FRAC.antenna),
      );

      const intro = windowT(p, 0.0, 0.09); // overview → follow blend
      if (reducedMotion) {
        camTarget.copy(REDUCED_TARGET);
        camZoom = 0.42;
      } else {
        camTarget.copy(OVERVIEW_TARGET).lerp(followPt, intro);
        // The finale: target drifts to the fan center while the zoom widens.
        camTarget.lerp(FAN_CENTER, fin);
        const followZoom = 1.32 + 0.22 * arrival;
        let zoom = 0.55 + (followZoom - 0.55) * intro;
        const finaleZoom = vw / vh < 0.9 ? 0.46 : 0.56;
        zoom += (finaleZoom - zoom) * fin;
        camZoom = zoom;
        // Pointer parallax — the world leans gently toward the cursor.
        parallax.x += (pointerNdc.x - parallax.x) * Math.min(1, dt * 3);
        parallax.y += (pointerNdc.y - parallax.y) * Math.min(1, dt * 3);
        camTarget.x += parallax.x * 1.1;
        camTarget.z -= parallax.y * 1.1;
      }
      applyProjection();
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
        headGlow.scale.setScalar(3.8 * pulse);
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
        const act = reducedMotion
          ? 0.7
          : f.driver === 'fan'
            ? fin
            : stationActivation(pathT, f.frac);
        f.mat.opacity = dotBase * f.weight * (0.18 + 0.82 * act);
      }
      for (const r of risers) {
        const act = reducedMotion ? 1 : 0.8 + 0.2 * stationActivation(pathT, r.frac);
        r.mesh.scale.y = act;
        r.mesh.position.y = (r.h * act) / 2;
      }

      // Labels fade in with their drivers (station pass / fan reveal / soon).
      // Path labels also fade OUT as the finale takes over, and all labels
      // shrink a touch on narrow screens so long tags never crop.
      const labelScale = vw / vh < 0.9 ? 0.62 : 1;
      for (const l of labels) {
        const act = reducedMotion
          ? 1
          : l.driver === 'fan'
            ? fin
            : l.driver === 'soon'
              ? soonAct
              : labelActivation(pathT, l.frac) * (1 - 0.9 * fin);
        l.mat.opacity = l.maxOpacity * act;
        l.sprite.scale.set(l.baseW * labelScale, l.height * labelScale, 1);
      }

      // 01 — the envelope floats; sheets drift around it.
      const towerAct = reducedMotion ? 1 : stationActivation(pathT, FRAC.tower);
      envBody.position.y = Math.sin(elapsed * 1.2) * 0.1 * (0.4 + 0.6 * towerAct);
      envBody.rotation.y = Math.PI / 4 + Math.sin(elapsed * 0.5) * 0.06;
      for (const s of sheets) {
        s.mesh.position.y = (s.phase % 2 ? 2.4 : 2.9) + Math.sin(elapsed * 1.6 + s.phase) * 0.18;
        s.mesh.rotation.y += dt * 0.4;
      }

      // 02 — the gate scans; grey noise rides the spur and sinks into the tray.
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
          if (t > 0.82) gp.mesh.position.y -= (t - 0.82) * 3.2; // sink into the tray
          gp.mesh.rotation.y = elapsed * 0.7 + gp.offset * 5;
        } else {
          gp.mesh.visible = false;
        }
      }

      // 03 — the AI core thinks: breathes, spins, orbits its reading sheets,
      // fills the score pylon, writes reason lines, emits priority tokens.
      const aiAct = reducedMotion ? 1 : stationActivation(pathT, FRAC.ai);
      coreInner.rotation.y += dt * 0.6;
      coreInner.scale.setScalar(1 + Math.sin(elapsed * 2.2) * 0.08 * (0.3 + 0.7 * aiAct));
      coreWire.rotation.y -= dt * 0.35;
      coreWire.rotation.x = Math.sin(elapsed * 0.4) * 0.25;
      matCoreWire.opacity = 0.35 + 0.4 * aiAct;
      for (const s of aiSheets) {
        const a = s.phase + elapsed * (0.5 + aiAct * 0.5);
        s.mesh.position.set(
          AICORE.x + Math.cos(a) * s.r,
          s.y + Math.sin(elapsed * 1.4 + s.phase) * 0.15,
          AICORE.z + Math.sin(a) * s.r,
        );
        s.mesh.rotation.y = -a;
      }
      const scoreT = reducedMotion ? 1 : 0.12 + 0.88 * smooth(aiAct);
      scoreFill.scale.y = scoreT;
      scoreFill.position.y = 0.3 + (3.0 * scoreT) / 2;
      reasonLines.forEach((line, i) => {
        const lt = reducedMotion ? 1 : windowT(aiAct, 0.25 + i * 0.18, 0.7 + i * 0.12);
        line.scale.x = Math.max(0.001, lt);
      });
      for (const tk of aiTokens) {
        if (aiAct > 0.3 && !reducedMotion) {
          const t = (tk.offset + elapsed * 0.22) % 1;
          tk.mesh.visible = true;
          tokenFlight.getPointAt(t, tmp);
          tk.mesh.position.copy(tmp);
          tk.mesh.rotation.y = elapsed * 2 + tk.offset * 7;
          const pop = Math.min(1, t * 4) * Math.min(1, (1 - t) * 4 + 0.4);
          tk.mesh.scale.setScalar(Math.max(0.001, pop * aiAct));
        } else {
          tk.mesh.visible = false;
        }
      }

      // 04 — radar: sweep turns, blips pulse like live work items.
      const radarAct = reducedMotion ? 1 : stationActivation(pathT, FRAC.radar);
      sweep.rotation.z = -elapsed * (0.5 + radarAct * 1.1);
      for (const b of blips) {
        const s = Math.max(0.001, radarAct * (1 + Math.sin(elapsed * 2.4 + b.phase) * 0.18));
        b.mesh.scale.setScalar(s);
        b.mesh.rotation.y = elapsed * 0.8 + b.phase;
      }

      // 05 — the antenna fires: rings expand and the paper plane launches.
      const sendAct = reducedMotion ? 1 : stationActivation(pathT, FRAC.antenna);
      beacon.scale.setScalar(1 + sendAct * (0.3 + Math.sin(elapsed * 4) * 0.2));
      stationRipples.forEach((r, i) => {
        if (sendAct <= 0.05) {
          r.visible = false;
          return;
        }
        r.visible = true;
        const phase = (elapsed * 0.55 + i * 0.5) % 1;
        r.scale.setScalar(1 + phase * 10);
        // Damped during the finale so the rings don't clutter the fan reveal.
        matRippleStation.opacity = 0.5 * (1 - phase) * sendAct * (1 - 0.85 * fin);
      });
      if (sendAct > 0.25 && !reducedMotion) {
        const cycle = (elapsed % 3) / 2.1; // fly ~2.1s, rest ~0.9s
        if (cycle <= 1) {
          plane.visible = true;
          flight.getPointAt(cycle, tmp);
          plane.position.copy(tmp);
          flight.getTangentAt(Math.min(cycle, 0.99), tmp);
          // Cone points +y by default — aim its nose along the flight tangent.
          plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp.normalize());
          matPlane.opacity = cycle < 0.7 ? 1 : 1 - (cycle - 0.7) / 0.3;
        } else {
          plane.visible = false;
        }
      } else {
        plane.visible = false;
      }

      // 06 — the fan-out: streams draw outward in sequence, particles flow,
      // islands animate, and the SOON wireframes materialize on the horizon.
      for (const st of streams) {
        const sReveal = reducedMotion
          ? 1
          : windowT(p, 0.8 + st.order * 0.018, 0.9 + st.order * 0.018);
        st.tube.geometry.setDrawRange(0, Math.floor(st.indexCount * sReveal));
        if (st.head) {
          if (sReveal > 0.02 && sReveal < 0.98 && !reducedMotion) {
            st.head.visible = true;
            st.curve.getPointAt(Math.min(0.999, sReveal), tmp);
            st.head.position.set(tmp.x, PATH_Y + 0.3, tmp.z);
            (st.head.material as THREE.SpriteMaterial).opacity = 0.8;
          } else {
            st.head.visible = false;
          }
        }
        for (const pt of st.particles) {
          if (sReveal > 0.5) {
            const t = (pt.offset + elapsed * (st.vivid ? 0.06 : 0.04)) % 1;
            if (t < sReveal) {
              pt.mesh.visible = true;
              st.curve.getPointAt(t, tmp);
              pt.mesh.position.copy(tmp);
              pt.mesh.position.y += 0.1;
              pt.mesh.scale.setScalar(1 + Math.sin(elapsed * 4 + pt.offset * 8) * 0.25);
            } else {
              pt.mesh.visible = false;
            }
          } else {
            pt.mesh.visible = false;
          }
        }
      }
      // Waiting island: hands turn; the amber pressure bar climbs and resets.
      handLongPivot.rotation.z = -elapsed * 0.9;
      handShortPivot.rotation.z = -elapsed * 0.32;
      const climb = reducedMotion ? 0.8 : 0.25 + 0.75 * ((elapsed * 0.18) % 1);
      pressure.scale.y = climb * fin + 0.001;
      pressure.position.y = 0.4 + (1.8 * pressure.scale.y) / 2;
      // Tasks island: tick cubes pop one after another, then reset.
      taskCubes.forEach((c, i) => {
        const cycle = reducedMotion ? 1 : Math.min(1, Math.max(0, ((elapsed * 0.5) % 2.4) - i * 0.5));
        const pop = smooth(Math.min(1, cycle * 2));
        c.scale.setScalar(Math.max(0.001, pop * (0.2 + 0.8 * fin)));
      });
      // Brief island: the sun rises with the reveal and gently pulses.
      sunDisc.position.y = 0.65 + 0.45 * fin + Math.sin(elapsed * 1.1) * 0.05 * fin;
      rays.forEach((ray, i) => {
        ray.scale.y = Math.max(0.001, fin * (1 + Math.sin(elapsed * 2 + i) * 0.15));
      });
      // SOON monuments: wireframes fade in and rise as the horizon wakes.
      matSoonWire.opacity = 0.55 * soonAct;
      for (const g of soonMonuments) {
        g.scale.y = 0.65 + 0.35 * soonAct;
      }

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

    resize();
    raf = requestAnimationFrame(render);

    /* lifecycle -------------------------------------------------------------------------- */
    const onResize = () => resize();
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
      fontsRedrawn = true; // a late font-ready must not redraw a disposed scene
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
        matGround, matBuilding, matBuildingSoft, matPaper, matAccent, matAccent2, matGrey,
        matRed, matAmber, matGreen, matViolet, matPlane, matCoreWire, matSoonWire,
        matAmberP, matGreenP, matCyanP,
        matPathBase, matPathGlow, matSpur, matRing, matSweep, matRippleStation, matShadow,
      ].forEach((m) => m.dispose());
      for (const f of dotFields) f.mat.dispose();
      for (const r of ripplePool) r.mat.dispose();
      for (const st of streams) {
        st.mat.dispose();
        if (st.head) (st.head.material as THREE.SpriteMaterial).dispose();
      }
      for (const l of labels) {
        l.mat.dispose();
        l.tex.dispose();
      }
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
}
