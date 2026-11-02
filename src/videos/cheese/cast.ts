// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import {
  Pen, bodyFront, bodySide, swingKid, soldier, townsfolk, OFFICER, KID, PARENT, fxNote, fxBurst, fxSplash, fxStars, fxCreak, fxRing, fxBlob, fxShadow, fxContact, fxPlank, fxDrum,
  Outfit, Expr, FrontOpts, SideOpts,
} from "./toon";
import {
  FPS, D0, SHOTS, SNAP, V3, smooth, clamp01, BridgeState,
} from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const SOLDIER = [0, 1, 2, 3].map((v) => soldier(v));
const BARE = [0, 1, 2, 3].map((v) => soldier(v, { hat: null }));
const FOLK = [0, 1, 2, 3, 4, 5].map((v) => townsfolk(v));
const vOf = (i: number) => (i * 7 + (i >> 2)) % 4;
/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = { 4: [16.17, 17.3], 5: [19.48, 20.6], 6: [21.9, 23.7], 7: [29.4, 30.6], 8: [SNAP] };
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- crowd by shot (13 scenes of "The Captain Who Fired Cheese") ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
export const SIGN_AT: V3 = [0, D0, 0];

const ENEMY_SOLDIER: Outfit = { jacket: "#8c2d2d", pants: "#2b2d38", boots: "#16171b", hat: "shako", belt: "#e8c45a", buttons: "#e8c45a", rifle: false };
const ENEMY_ADMIRAL: Outfit = { ...ENEMY_SOLDIER, jacket: "#6e1d1d", hat: "shako_tall", sash: "#f7b801", moustache: "#2a201a", sword: true, build: "stout" };

export const stage = (id: number, t: number, _b: BridgeState, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1] ?? SHOTS[0];
  LNAME = s.light;
  findSun(cam, SUN);

  const captainWho: Who = { i: 99, o: OFFICER, okey: "coe" };
  const admiralWho: Who = { i: 88, o: ENEMY_ADMIRAL, okey: "adm" };
  const sailor = (i: number): Who => ({ i, o: SOLDIER[vOf(i)], okey: `nav${vOf(i)}` });
  const enemy = (i: number): Who => ({ i: i + 50, o: { ...ENEMY_SOLDIER, skin: SOLDIER[vOf(i)].skin }, okey: `enm${vOf(i)}` });

  const placeStand = (who: Who, x: number, y: number, z: number, expr: Expr, wave?: number, scale = 1) => {
    const fo: FrontOpts = { mode: "stand", expr, wave, blink: lidAt(t, who.i) };
    out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, fo, {}, scale));
    blob(out, x, y, z, scale);
  };

  switch (id) {
    case 1: {
      // Hook: Captain Coe and 3 gunners on deck firing golden Dutch cheese out of the 18-pounder cannon
      placeStand(captainWho, 0.2, D0, 0.8, "grin", q(Math.sin(t * 6), 20), 1.08);
      placeStand(sailor(1), -1.1, D0, -0.8, "laugh");
      placeStand(sailor(2), 0.8, D0, -1.6, "grin");
      placeStand(sailor(3), -0.9, D0, 2.2, "smile");
      if (t >= 1.7 && t <= 2.4) {
        const u = clamp01((t - 1.7) / 0.5);
        out.fx.push({ key: `burst${q(u, 20)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 20)), x: -2.4, y: D0 + 0.8, z: 0.0, w: 1.6, h: 1.6 });
      }
      break;
    }
    case 2: {
      // Setting (1841 gun duel): Crew lined up along Coe's deck + enemy crew on enemy flagship (-18)
      placeStand(captainWho, 0.5, D0, 2.0, "stern", undefined, 1.08);
      for (let i = 0; i < 6; i++) {
        const z = -10 + i * 4;
        placeStand(sailor(i), -1.2, D0, z, i % 2 ? "stern" : "neutral");
        placeStand(enemy(i), -16.8, D0 + 1.4, z - 2, "stern");
      }
      break;
    }
    case 3: {
      // Bad news: Panicked gunner runs up to Captain Coe pointing at the empty cannonball rack
      placeStand(captainWho, 0.9, D0, -5.2, t < 13.0 ? "stern" : "shock", undefined, 1.08);
      const runZ = -1.5 - smooth((t - 10.0) / 2.2) * 3.0;
      const running = t < 12.2;
      const gWho = sailor(1);
      if (running) {
        const ph = (t * 2.5) % 1;
        out.places.push(person(cam, gWho, -0.4, D0, runZ, { side: false, mirror: false }, { mode: "march", phase: ph, expr: "nervous", lift: 65, blink: 0 }, {}));
        blob(out, -0.4, D0, runZ);
      } else {
        placeStand(gWho, -0.4, D0, -4.5, "shock", q(Math.sin(t * 10), 20));
      }
      placeStand(sailor(2), 1.4, D0, -6.8, "nervous");
      break;
    }
    case 4: {
      // White flag: Nervous sailors ready to wave the white surrender flag while the enemy ship closes in
      placeStand(sailor(1), -0.6, D0, 1.8, "nervous", q(Math.sin(t * 8), 20));
      placeStand(sailor(2), 0.5, D0, 1.2, "shock");
      placeStand(sailor(3), -1.1, D0, -0.5, "nervous");
      placeStand(captainWho, 1.2, D0, 2.8, "stern", undefined, 1.08);
      break;
    }
    case 5: {
      // Idea (Below-deck Galley kitchen at z=52): Captain Coe beams with an idea in front of the cheese shelves!
      placeStand(captainWho, -0.6, D0, 52.2, t < 21.5 ? "shock" : "laugh", t > 21.5 ? q(Math.sin(t * 7), 20) : undefined, 1.08);
      placeStand(sailor(1), 0.85, D0, 52.4, t < 22.0 ? "neutral" : "grin");
      if (t >= 21.2 && t <= 22.2) {
        const u = clamp01((t - 21.2) / 0.6);
        out.fx.push({ key: `idea${q(u, 20)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 20)), x: -0.6, y: D0 + 2.25, z: 52.2, w: 1.1, h: 1.1 });
      }
      break;
    }
    case 6: {
      // Load: Sailors rolling cheese wheels up and ramming them into the 18-pounder cannons
      placeStand(captainWho, 0.8, D0, 1.2, "grin", q(Math.sin(t * 6), 20), 1.08);
      for (let i = 0; i < 4; i++) {
        const z = -2.5 + i * 1.8;
        const ph = (t * 2.2 + i * 0.25) % 1;
        out.places.push(person(cam, sailor(i + 1), -0.8, D0, z, { side: true, mirror: true }, {}, { mode: "march", phase: ph, expr: "grin", stomp: 1.1, stride: 0.8 }));
        blob(out, -0.8, D0, z);
      }
      break;
    }
    case 7: {
      // Broadside & Mast Shatter: Gunners cheering on Coe's ship + enemy sailors flying on the enemy ship (-18)
      for (let i = 0; i < 5; i++) {
        placeStand(sailor(i), -1.1, D0, -4 + i * 2.5, "laugh", q(Math.sin(t * 9 + i), 20));
      }
      for (let i = 0; i < 5; i++) {
        const hit = t >= 31.4;
        const yOff = hit ? Math.max(0, Math.sin((t - 31.4) * 5 + i) * 1.2) : 0;
        const ex: Expr = hit ? "shock" : "stern";
        out.places.push(person(cam, enemy(i), -17.5 + (i % 2) * 1.2, D0 + 1.4 + yOff, -5 + i * 2.2, { side: false, mirror: false }, { mode: hit ? "fall" : "stand", expr: ex, tilt: hit ? (i % 2 ? 28 : -28) : 0, blink: 0 }, {}));
      }
      if (t >= 31.3 && t <= 32.5) {
        const u = clamp01((t - 31.3) / 0.8);
        out.fx.push({ key: `mastburst${q(u, 20)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 20)), x: -17.5, y: D0 + 6.5, z: -2.0, w: 3.2, h: 3.2 });
      }
      break;
    }
    case 8: {
      // Luckily: Enemy sailors on enemy deck staring in confusion at the yellow cheese wheel
      placeStand(admiralWho, -17.8, D0 + 1.4, -2.2, "neutral", undefined, 1.08);
      placeStand(enemy(1), -17.2, D0 + 1.4, -0.8, "smile_closed");
      placeStand(enemy(2), -18.5, D0 + 1.4, -3.2, "neutral");
      break;
    }
    case 9: {
      // Unluckily (900 mph!): High-speed cheese wheels blast the enemy deck and knock the enemy crew over with stars!
      const hit = t >= 39.4;
      const positions: [number, number][] = [[-17.8, -2.2], [-17.1, -0.8], [-18.5, -3.2], [-17.4, 0.6]];
      positions.forEach(([x, z], i) => {
        const who = i === 0 ? admiralWho : enemy(i);
        const air = hit ? Math.max(0, Math.sin(Math.min(Math.PI, (t - 39.4) * 3.5)) * 1.4) : 0;
        out.places.push(person(cam, who, x, D0 + 1.4 + air, z, { side: false, mirror: false }, {
          mode: hit && air > 0.1 ? "fall" : hit ? "sit" : "stand",
          expr: hit ? (i % 2 ? "dazed" : "pained") : "shock",
          tilt: hit && air > 0.1 ? (i % 2 ? 35 : -35) : 0,
          blink: 0,
        }, {}));
        if (hit) {
          const u = (t * 1.1 + i * 0.25) % 1;
          out.fx.push({ key: `stars${q(u, 20)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(u, 20)), x, y: D0 + 2.7 + air, z, w: 0.85, h: 0.42 });
        }
      });
      if (t >= 39.4 && t <= 40.2) {
        const u = clamp01((t - 39.4) / 0.6);
        out.fx.push({ key: `hitburst${q(u, 20)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 20)), x: -17.5, y: D0 + 2.2, z: -1.8, w: 2.4, h: 2.4 });
      }
      break;
    }
    case 10: {
      // You see (z=80 Oak & Cheese tabletop): Captain Coe explaining how dried Dutch cheese locks together like solid oak
      placeStand(captainWho, -1.35, D0, 79.2, "smile", q(Math.sin(t * 4), 20), 1.05);
      break;
    }
    case 11: {
      // Fridge & Knife bounce + Cannon shrapnel (z=110)
      const knifeHit = t >= 50.4 && t <= 51.2;
      placeStand(sailor(1), -1.45, D0, 109.2, knifeHit ? "shock" : "grin", knifeHit ? q(Math.sin(t * 12), 20) : undefined);
      if (knifeHit) {
        const u = clamp01((t - 50.4) / 0.5);
        out.fx.push({ key: `knifeburst${q(u, 20)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 20)), x: 0.0, y: D0 + 1.18, z: 109.5, w: 1.1, h: 1.1 });
      }
      if (t >= 52.8 && t <= 53.6) {
        const u = clamp01((t - 52.8) / 0.6);
        out.fx.push({ key: `shrapburst${q(u, 20)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, q(u, 20)), x: -0.9, y: D0 + 1.25, z: 109.2, w: 1.8, h: 1.8 });
      }
      break;
    }
    case 12: {
      // Retreat: Panicked Enemy Admiral waving retreat on his fleeing ship while Coe's crew cheers on the foreground deck
      const retreatU = clamp01((t - 55.8) / 4.7);
      const shipX = -18.0 - retreatU * 14.0;
      const shipZ = -2.0 - retreatU * 6.0;
      placeStand(admiralWho, shipX + 0.5, D0 + 1.4, shipZ, "shock", q(Math.sin(t * 11), 20), 1.1);
      placeStand(enemy(1), shipX - 0.8, D0 + 1.4, shipZ + 1.8, "nervous", q(Math.cos(t * 10), 20));
      placeStand(captainWho, 0.5, D0, 4.5, "laugh", q(Math.sin(t * 7), 20), 1.08);
      placeStand(sailor(1), -1.0, D0, 5.2, "grin", q(Math.cos(t * 8), 20));
      break;
    }
    case 13:
    default: {
      // Ending: Captain Coe & cheering crew around the Golden Dutch Cheese Trophy Pedestal on deck!
      placeStand(captainWho, -0.95, D0, 0.2, "laugh", q(Math.sin(t * 7), 20), 1.1);
      placeStand(sailor(1), 0.95, D0, 0.3, "grin", q(Math.cos(t * 8), 20));
      placeStand(sailor(2), -1.55, D0, -1.2, "laugh", q(Math.sin(t * 6 + 1), 20));
      placeStand(sailor(3), 1.50, D0, -1.1, "smile", q(Math.cos(t * 7 + 2), 20));
      break;
    }
  }
  return out;
};

// ---------------- one-off effects ----------------
export const snapFx = (_tau: number, _at: V3, _out: Stage) => {};
export const splashFx = (_tau: number, _out: Stage) => {};
export const creakFx = (_t: number, _pts: V3[], _out: Stage, _size = 0.8) => {};
export { FPS };
