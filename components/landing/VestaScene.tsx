'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import type { Theme } from '@/lib/theme';

/**
 * Landing-page 3D world (Three.js) — "the journey of one email through Vesta".
 *
 * An isometric, low-poly scene in the Arctic Frost palette. A glowing path
 * carries mail packets through Vesta's real pipeline:
 *
 *   Outlook tower ──▶ noise gate (grey packets divert to the Hidden vault)
 *                ──▶ radar platform (rotating sweep + score pylons)
 *                ──▶ send antenna (fires only on approval).
 *
 * Scroll drives everything via `setProgress(0..1)` (camera dolly, path reveal,
 * per-station animations). Theme-aware (both palettes), DPR-capped, pauses when
 * offscreen, and honors prefers-reduced-motion (static fully-revealed scene).
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
  red: number;
  grey: number;
  ringOpacity: number;
  shadowOpacity: number;
  ambient: number;
  directional: number;
};

const PALETTES: Record<Theme, Palette> = {
  dark: {
    bg: 0x0a0f17,
    ground: 0x0e1622,
    building: 0x182334,
    buildingSoft: 0x131c2b,
    accent: 0x5ba8f5,
    accent2: 0x67e8d8,
    red: 0xff7a6e,
    grey: 0x47536a,
    ringOpacity: 0.14,
    shadowOpacity: 0.32,
    ambient: 0.85,
    directional: 0.9,
  },
  light: {
    bg: 0xeef5ff,
    ground: 0xf6faff,
    building: 0xffffff,
    buildingSoft: 0xeaf2fd,
    accent: 0x2f7deb,
    accent2: 0x43c7ff,
    red: 0xef5b5b,
    grey: 0xb9c6d8,
    ringOpacity: 0.5,
    shadowOpacity: 0.16,
    ambient: 1.05,
    directional: 0.75,
  },
};

/* ------------------------------ scene maths ------------------------------ */

/** Stations of the email's journey (world coordinates, ground plane y=0). */
const TOWER = new THREE.Vector3(-15, 0, -11);
const GATE = new THREE.Vector3(-5.5, 0, -3.5);
const RADAR = new THREE.Vector3(4.5, 0, 3.5);
const ANTENNA = new THREE.Vector3(14.5, 0, 10.5);

const PATH_Y = 0.18;

function mainCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(TOWER.x + 0.8, PATH_Y, TOWER.z + 1.2),
      new THREE.Vector3(-10.5, PATH_Y, -8.5),
      new THREE.Vector3(GATE.x - 1.2, PATH_Y, GATE.z - 1.4),
      new THREE.Vector3(GATE.x + 1.4, PATH_Y, GATE.z + 1.2),
      new THREE.Vector3(-0.5, PATH_Y, 0.6),
      new THREE.Vector3(RADAR.x - 1.2, PATH_Y, RADAR.z - 0.6),
      new THREE.Vector3(RADAR.x + 1.6, PATH_Y, RADAR.z + 1.4),
      new THREE.Vector3(9.5, PATH_Y, 7),
      new THREE.Vector3(ANTENNA.x - 0.6, PATH_Y, ANTENNA.z - 0.8),
    ],
    false,
    'catmullrom',
    0.12,
  );
}

/** Grey spur: noise diverted off the gate into the Hidden vault. */
function spurCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(GATE.x + 0.2, PATH_Y, GATE.z - 0.2),
    new THREE.Vector3(GATE.x + 1.6, PATH_Y, GATE.z - 2.6),
    new THREE.Vector3(GATE.x + 2.6, PATH_Y - 0.05, GATE.z - 4.6),
  ]);
}

/** Camera focus target + zoom per story beat (0..1 each). */
const BEATS = [
  { t: 0.0, target: new THREE.Vector3(0, 0, 0), zoom: 1.0 }, // overview
  { t: 0.16, target: TOWER.clone(), zoom: 1.45 }, // 01 connect
  { t: 0.42, target: GATE.clone(), zoom: 1.55 }, // 02 filter
  { t: 0.68, target: RADAR.clone(), zoom: 1.5 }, // 03 radar
  { t: 0.95, target: ANTENNA.clone(), zoom: 1.4 }, // 04 approve & send
];

function beatLerp(p: number): { target: THREE.Vector3; zoom: number } {
  const out = { target: BEATS[0].target.clone(), zoom: BEATS[0].zoom };
  for (let i = 0; i < BEATS.length - 1; i++) {
    const a = BEATS[i];
    const b = BEATS[i + 1];
    if (p >= a.t && p <= b.t) {
      const k = smooth((p - a.t) / (b.t - a.t));
      out.target = a.target.clone().lerp(b.target, k);
      out.zoom = a.zoom + (b.zoom - a.zoom) * k;
      return out;
    }
  }
  const last = BEATS[BEATS.length - 1];
  return { target: last.target.clone(), zoom: last.zoom };
}

function smooth(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Local progress of a story window, eased 0..1. */
function windowT(p: number, from: number, to: number): number {
  return smooth((p - from) / (to - from));
}

/* ------------------------------ build helpers ---------------------------- */

/** Soft round shadow blob (fake contact shadow — no shadow maps needed). */
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

/* --------------------------------- scene --------------------------------- */

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

    /* renderer / camera ---------------------------------------------------- */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 200);
    const ISO = new THREE.Vector3(1, 0.86, 1).normalize(); // isometric direction
    const camTarget = new THREE.Vector3(0, 0, 0);
    let camZoom = 1;

    const host = mount; // non-null within this effect (guarded above)
    function frustum() {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      // Fit the world on phones too: widen the view when the screen is narrow.
      const view = (aspect < 0.9 ? 17 : 13.5) / camZoom;
      camera.left = -view * aspect;
      camera.right = view * aspect;
      camera.top = view;
      camera.bottom = -view;
      camera.updateProjectionMatrix();
    }

    /* lights ---------------------------------------------------------------- */
    const ambient = new THREE.AmbientLight(0xffffff, 1);
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(6, 14, 4);
    const rim = new THREE.DirectionalLight(0xbfd9ff, 0.35);
    rim.position.set(-8, 6, -6);
    scene.add(ambient, sun, rim);

    /* materials (re-tinted on theme change) --------------------------------- */
    const matGround = new THREE.MeshLambertMaterial();
    const matBuilding = new THREE.MeshLambertMaterial();
    const matBuildingSoft = new THREE.MeshLambertMaterial();
    const matAccent = new THREE.MeshBasicMaterial();
    const matAccent2 = new THREE.MeshBasicMaterial();
    const matGrey = new THREE.MeshLambertMaterial();
    const matPathBase = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.16 });
    const matPathGlow = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 });
    const matSpur = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5 });
    const matRing = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
    const matSweep = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const matRipple = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const matShadow = new THREE.MeshBasicMaterial({
      map: shadowTexture(),
      transparent: true,
      depthWrite: false,
    });

    /* ground ----------------------------------------------------------------- */
    const ground = new THREE.Mesh(new THREE.CircleGeometry(48, 64), matGround);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    function dropShadow(x: number, z: number, s: number) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), matShadow);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.005, z);
      scene.add(m);
    }

    /* stations ---------------------------------------------------------------- */
    // 01 — Outlook tower (where mail enters the world).
    const towerGroup = new THREE.Group();
    towerGroup.add(box(2.6, 5.2, 2.6, matBuilding, 0, 2.6, 0));
    towerGroup.add(box(1.8, 1.1, 1.8, matBuildingSoft, 0, 5.75, 0));
    towerGroup.add(box(2.7, 0.16, 2.7, matAccent, 0, 0.95, 0)); // glowing mail slot band
    towerGroup.add(box(1.2, 2.2, 1.2, matBuildingSoft, -2.1, 1.1, 1.5));
    towerGroup.add(box(1.0, 1.4, 1.0, matBuilding, 1.9, 0.7, -1.8));
    towerGroup.position.copy(TOWER);
    scene.add(towerGroup);
    dropShadow(TOWER.x, TOWER.z, 8);

    // 02 — Noise gate (triage) + Hidden vault.
    const gateGroup = new THREE.Group();
    gateGroup.add(box(0.55, 3.1, 0.55, matBuilding, -1.25, 1.55, 0));
    gateGroup.add(box(0.55, 3.1, 0.55, matBuilding, 1.25, 1.55, 0));
    gateGroup.add(box(3.05, 0.5, 0.55, matBuilding, 0, 3.3, 0));
    gateGroup.add(box(2.4, 0.1, 0.4, matAccent2, 0, 3.0, 0)); // scanner bar
    gateGroup.rotation.y = Math.PI / 4;
    gateGroup.position.copy(GATE);
    scene.add(gateGroup);
    dropShadow(GATE.x, GATE.z, 6);

    const vault = new THREE.Group();
    vault.add(box(2.2, 0.9, 2.2, matGrey, 0, 0.45, 0));
    vault.add(box(1.7, 0.18, 1.7, matBuildingSoft, 0, 0.99, 0));
    vault.position.set(GATE.x + 2.6, 0, GATE.z - 4.7);
    scene.add(vault);
    dropShadow(vault.position.x, vault.position.z, 4);

    // 03 — Radar platform: rings + rotating sweep + score pylons.
    const radarGroup = new THREE.Group();
    const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.35, 48), matBuildingSoft);
    platform.position.y = 0.175;
    radarGroup.add(platform);
    const rings: THREE.Mesh[] = [];
    for (const r of [1.4, 2.2, 3.0]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.03, r, 64), matRing);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.36;
      radarGroup.add(ring);
      rings.push(ring);
    }
    const sweep = new THREE.Mesh(new THREE.CircleGeometry(3.1, 24, 0, Math.PI / 3.2), matSweep);
    sweep.rotation.x = -Math.PI / 2;
    sweep.position.y = 0.37;
    radarGroup.add(sweep);
    // Score pylons — the ranked items standing on the radar.
    const pylons: THREE.Mesh[] = [];
    const pylonSpecs: { x: number; z: number; h: number; mat: THREE.Material }[] = [
      { x: -1.1, z: 0.4, h: 2.4, mat: matAccent }, // 92 — top priority
      { x: 0.5, z: -1.2, h: 1.6, mat: matAccent2 }, // 78
      { x: 1.4, z: 0.9, h: 1.0, mat: matBuilding }, // 66
    ];
    for (const s of pylonSpecs) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.55, s.h, 0.55), s.mat);
      p.position.set(s.x, 0.35, s.z); // grows upward via scale.y
      p.scale.y = 0.001;
      p.userData.h = s.h;
      radarGroup.add(p);
      pylons.push(p);
    }
    radarGroup.position.copy(RADAR);
    scene.add(radarGroup);
    dropShadow(RADAR.x, RADAR.z, 9.5);

    // 04 — Send antenna (approval-gated outbox).
    const antennaGroup = new THREE.Group();
    antennaGroup.add(box(1.6, 0.7, 1.6, matBuilding, 0, 0.35, 0));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 3.6, 10), matBuilding);
    mast.position.y = 2.5;
    antennaGroup.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 16), matAccent2);
    beacon.position.y = 4.45;
    antennaGroup.add(beacon);
    const ripples: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 48), matRipple);
      r.rotation.x = -Math.PI / 2;
      r.position.y = 0.42;
      antennaGroup.add(r);
      ripples.push(r);
    }
    antennaGroup.position.copy(ANTENNA);
    scene.add(antennaGroup);
    dropShadow(ANTENNA.x, ANTENNA.z, 5);

    /* scatter — calm filler city, kept away from the path ------------------- */
    const scatter: [number, number, number, number, number][] = [
      // [x, z, w, h, d]
      [-9, 4, 1.6, 2.6, 1.6],
      [-12, 0.5, 1.2, 1.4, 1.2],
      [-2, -9, 1.8, 3.4, 1.8],
      [1.5, -5.5, 1.2, 1.8, 1.2],
      [9, -2, 1.6, 2.2, 1.6],
      [12, 2.5, 1.2, 1.5, 1.2],
      [6.5, 11, 1.7, 2.8, 1.7],
      [-6, 9, 1.4, 2.0, 1.4],
      [17, 6, 1.5, 2.4, 1.5],
      [-17, -4, 1.5, 2.0, 1.5],
    ];
    for (const [x, z, w, h, d] of scatter) {
      scene.add(box(w, h, d, Math.random() > 0.5 ? matBuilding : matBuildingSoft, x, h / 2, z));
      dropShadow(x, z, Math.max(w, d) * 2.4);
    }

    /* the glowing path -------------------------------------------------------- */
    const curve = mainCurve();
    const TUBULAR = 220;
    const RADIAL = 8;
    const baseTube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, TUBULAR, 0.055, RADIAL, false),
      matPathBase,
    );
    const glowTube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, TUBULAR, 0.075, RADIAL, false),
      matPathGlow,
    );
    const glowIndexCount = glowTube.geometry.index!.count;
    glowTube.geometry.setDrawRange(0, 0);
    scene.add(baseTube, glowTube);

    const spur = spurCurve();
    const spurTube = new THREE.Mesh(new THREE.TubeGeometry(spur, 40, 0.05, RADIAL, false), matSpur);
    const spurIndexCount = spurTube.geometry.index!.count;
    spurTube.geometry.setDrawRange(0, 0);
    scene.add(spurTube);

    /* packets ------------------------------------------------------------------ */
    const packetGeo = new THREE.BoxGeometry(0.34, 0.22, 0.46);
    const packets: { mesh: THREE.Mesh; offset: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const mesh = new THREE.Mesh(packetGeo, i % 2 ? matAccent2 : matAccent);
      mesh.visible = false;
      scene.add(mesh);
      packets.push({ mesh, offset: i / 7 });
    }
    const greyPackets: { mesh: THREE.Mesh; offset: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(packetGeo, matGrey);
      mesh.visible = false;
      scene.add(mesh);
      greyPackets.push({ mesh, offset: i / 3 });
    }

    /* theme ---------------------------------------------------------------------- */
    function applyTheme(t: Theme) {
      const p = PALETTES[t];
      scene.background = new THREE.Color(p.bg);
      scene.fog = new THREE.Fog(p.bg, 40, 95);
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
      matRipple.color.set(p.accent2);
      matShadow.opacity = p.shadowOpacity;
      ambient.intensity = p.ambient;
      sun.intensity = p.directional;
    }
    applyTheme(themeRef.current);
    let appliedTheme: Theme = themeRef.current;

    /* animation loop --------------------------------------------------------------- */
    let raf = 0;
    let running = true;
    let shown = 0; // eased progress actually rendered
    const clock = new THREE.Clock();
    const camPos = new THREE.Vector3();
    const tmp = new THREE.Vector3();

    function render() {
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      if (appliedTheme !== themeRef.current) {
        appliedTheme = themeRef.current;
        applyTheme(appliedTheme);
      }

      // Ease the displayed progress toward the scroll target — buttery motion.
      const target = reducedMotion ? 1 : progressRef.current;
      shown += (target - shown) * Math.min(1, dt * 7);
      const p = reducedMotion ? 1 : shown;

      // Camera dolly along the story beats.
      const beat = beatLerp(reducedMotion ? 0 : p);
      camTarget.lerp(beat.target, 1); // beatLerp already smooth
      camZoom = reducedMotion ? 0.92 : beat.zoom;
      frustum();
      camPos.copy(camTarget).addScaledVector(ISO, 40);
      camera.position.copy(camPos);
      camera.lookAt(camTarget);

      // Path reveal: tower→gate→radar→antenna across the whole story.
      const reveal = reducedMotion ? 1 : windowT(p, 0.06, 0.92);
      glowTube.geometry.setDrawRange(0, Math.floor(glowIndexCount * reveal));

      // Packets ride only the revealed portion.
      const speed = 0.045;
      for (const pk of packets) {
        const t = (pk.offset + elapsed * speed) % 1;
        if (reveal > 0.04 && t < reveal) {
          pk.mesh.visible = true;
          curve.getPointAt(t, tmp);
          pk.mesh.position.copy(tmp);
          pk.mesh.position.y += 0.06 + Math.sin(elapsed * 3 + pk.offset * 9) * 0.025;
          curve.getTangentAt(t, tmp);
          pk.mesh.rotation.y = Math.atan2(tmp.x, tmp.z);
        } else {
          pk.mesh.visible = false;
        }
      }

      // 02 — the gate diverts grey noise into the Hidden vault.
      const spurT = reducedMotion ? 1 : windowT(p, 0.3, 0.5);
      spurTube.geometry.setDrawRange(0, Math.floor(spurIndexCount * spurT));
      for (const gp of greyPackets) {
        if (spurT > 0.35) {
          const t = (gp.offset + elapsed * 0.07) % 1;
          gp.mesh.visible = true;
          spur.getPointAt(Math.min(t, 0.999), tmp);
          gp.mesh.position.copy(tmp);
          // sink into the vault at the end of the spur
          if (t > 0.85) gp.mesh.position.y -= (t - 0.85) * 2.2;
          gp.mesh.rotation.y = elapsed * 0.7 + gp.offset * 5;
        } else {
          gp.mesh.visible = false;
        }
      }

      // 03 — radar: pylons rise with the step; the sweep always breathes.
      const radarT = reducedMotion ? 1 : windowT(p, 0.52, 0.72);
      for (const py of pylons) {
        const h = py.userData.h as number;
        py.scale.y = Math.max(0.001, radarT);
        py.position.y = 0.35 + (h * py.scale.y) / 2;
      }
      sweep.rotation.z = -elapsed * (0.5 + radarT * 0.9);
      const ringPulse = 0.5 + Math.sin(elapsed * 2) * 0.2;
      matRing.opacity = PALETTES[appliedTheme].ringOpacity * (0.7 + radarT * ringPulse);

      // 04 — antenna ripples once the reply is approved.
      const sendT = reducedMotion ? 1 : windowT(p, 0.78, 0.97);
      beacon.scale.setScalar(1 + sendT * (0.25 + Math.sin(elapsed * 4) * 0.18));
      ripples.forEach((r, i) => {
        if (sendT <= 0.05) {
          r.visible = false;
          return;
        }
        r.visible = true;
        const phase = (elapsed * 0.55 + i * 0.5) % 1;
        const s = 1 + phase * 9;
        r.scale.setScalar(s);
        matRipple.opacity = 0.5 * (1 - phase) * sendT;
      });

      // Idle drift so the world feels alive before scrolling.
      towerGroup.rotation.y = Math.sin(elapsed * 0.12) * 0.01;

      renderer.render(scene, camera);
      if (running) raf = requestAnimationFrame(render);
    }

    frustum();
    raf = requestAnimationFrame(render);

    /* lifecycle ------------------------------------------------------------------- */
    const onResize = () => frustum();
    window.addEventListener('resize', onResize);

    // Pause rendering when the canvas is offscreen or the tab is hidden.
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
    io.observe(mount);
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
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      [
        matGround, matBuilding, matBuildingSoft, matAccent, matAccent2, matGrey,
        matPathBase, matPathGlow, matSpur, matRing, matSweep, matRipple, matShadow,
      ].forEach((m) => m.dispose());
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
    // The scene is built once; theme changes flow through themeRef (no rebuild).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
});
