// 100% custom 3D world for "The Captain Who Fired Cheese" (1841 Battle of Montevideo):
// - Open ocean & distant Montevideo coastline (no bridge, no river banks, no park swing!)
// - Commodore Coe's warship (Santa Maria) + Enemy Flagship (Belgrano) & escort ships
// - Shot 3: Full gunpowder barrels + empty cannonball crate
// - Shot 4: White surrender flag on pole
// - Shot 5 (z=52): Below-deck ship's galley kitchen stacked with round wheels of Dutch Edam cheese
// - Shot 6: Rolling cheese wheels & ramrods loading the 18-pounder cannons
// - Shot 7-9: Flying yellow cheese broadsides, snapping enemy mainmast, and exploding cheese shrapnel
// - Shot 10 (z=80): Tabletop comparison of drying Dutch cheese (rising moisture droplets) vs solid oak block
// - Shot 11 (z=110): Open kitchen fridge + steel knife bouncing off rock-hard cheese + cannon shrapnel test
// - Shot 12: Enemy fleet turning and retreating across the ocean
// - Shot 13: Golden Cheese Trophy pedestal on Coe's victory deck
import * as THREE from "three";
import { Batch, boxGeo, V, lam, flagTex, Kit } from "./build";
import { beam, ctex, planksHD, beamHD, stoneHD, waterNear, waterFar, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, LFB, twoTone, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, D0, SHOTS, camAt, bridgeState, V3, smooth, clamp01, ShotDef } from "./story";

let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) kitP = Promise.resolve({});
  return kitP;
};

const discTex = () =>
  ctex("sunDisc", 128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
  });

const haloTex = () =>
  ctex("sunHalo", 256, 256, (g) => {
    const im = g.createImageData(256, 256);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const u = Math.hypot(x - 127.5, y - 127.5) / 128;
        const a =
          (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) *
          (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
        const i = (y * 256 + x) * 4;
        im.data[i] = im.data[i + 1] = im.data[i + 2] = 255;
        im.data[i + 3] = Math.round(255 * Math.min(1, a));
      }
    g.putImageData(im, 0, 0);
  });

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private fill: THREE.DirectionalLight;
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private WU: Record<string, THREE.IUniform>;
  private sunDisc: THREE.Sprite;
  private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private flags: THREE.Mesh[] = [];

  // Custom naval & scene objects
  private enemyShip = new THREE.Group();
  private enemyEscort1 = new THREE.Group();
  private enemyEscort2 = new THREE.Group();
  private enemyMastTop = new THREE.Group();
  private flyingCheeses: THREE.Mesh[] = [];
  private rollingCheeses: THREE.Mesh[] = [];
  private shrapnel: THREE.Mesh[] = [];
  private muzzleFlashes: THREE.Mesh[] = [];
  private whiteFlagGroup = new THREE.Group();
  private trophyGroup = new THREE.Group();
  private droplets: THREE.Mesh[] = [];
  private knifeGroup = new THREE.Group();
  private fridgeShrapnel: THREE.Mesh[] = [];
  private deckCheeseOnEnemy!: THREE.Mesh;

  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4();
  private v = new THREE.Vector3();
  private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;

    // ---- Sky + Lights ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        c0: { value: new THREE.Color() },
        c1: { value: new THREE.Color() },
        c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() },
        c4: { value: new THREE.Color() },
        e: { value: new THREE.Vector4() },
      },
      vertexShader:
        "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    this.sky.layers.set(NOINK);
    R.add(this.sky);

    this.sunDisc = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false })
    );
    this.sunHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTex(),
        color: new THREE.Color(1, 1, 1),
        fog: false,
        depthWrite: false,
        depthTest: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
      })
    );
    this.sunDisc.renderOrder = -0.5;
    this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) {
      m.frustumCulled = false;
      m.layers.set(NOINK);
      R.add(m);
    }

    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);

    this.cloudMaps = {
      day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)),
      golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)),
    };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3,
        d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: this.cloudMaps.day[i % 4],
          color: new THREE.Color(1.1, 1.1, 1.1),
          transparent: true,
          depthWrite: false,
          fog: false,
        })
      );
      const w = 130 + (i % 4) * 30;
      m.position.set(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d);
      m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK);
      this.clouds.push(m);
      R.add(m);
    }

    // ---- Shared Materials ----
    const deckPlanks = lam("planksHD", () => ({ map: planksHD() }));
    const hullBeam = lam("deckSide", () => ({ map: beamHD() }));
    const woodMat = lam("wood", () => ({ map: beam() }));
    const darkWood = twoTone(new THREE.MeshLambertMaterial({ color: "#4d321d" }));
    const oakBlockMat = twoTone(new THREE.MeshLambertMaterial({ color: "#8c5c32" }));
    const ironMat = twoTone(new THREE.MeshPhongMaterial({ color: "#323640", specular: "#8a8a8a", shininess: 60 }), 0.15);
    const steelMat = twoTone(new THREE.MeshPhongMaterial({ color: "#c4cbd4", specular: "#ffffff", shininess: 80 }), 0.15);
    const cheeseYellow = twoTone(new THREE.MeshLambertMaterial({ color: "#f7b801" }));
    const cheeseOrange = twoTone(new THREE.MeshLambertMaterial({ color: "#e89900" }));
    const cheeseWax = twoTone(new THREE.MeshLambertMaterial({ color: "#c9302c" }));
    const sailMat = twoTone(new THREE.MeshLambertMaterial({ color: "#f6f1e6", side: THREE.DoubleSide }));
    const redCarriage = twoTone(new THREE.MeshLambertMaterial({ color: "#9e2b25" }));
    const whiteMat = twoTone(new THREE.MeshLambertMaterial({ color: "#f2f4f8" }));
    const fridgeInsideMat = twoTone(new THREE.MeshLambertMaterial({ color: "#d8eefc" }));
    const dropletMat = twoTone(new THREE.MeshLambertMaterial({ color: "#4ea8de" }));
    const goldMat = twoTone(new THREE.MeshPhongMaterial({ color: "#ffd13b", specular: "#fff3b0", shininess: 70 }), 0.15);
    const flashMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.8, 2.4, 0.6) });
    const stoneMat = lam("wallHD", () => ({ map: stoneHD("wallHD", ["#c9bcaa", "#bfb19f", "#d1c5b4", "#b8aa97"], "#958776") }));
    const hillMat = twoTone(new THREE.MeshLambertMaterial({ color: "#568c44" }));

    // ---- Open Ocean Water ----
    const wNear = waterNear(),
      wFar = waterFar();
    for (const t of [wNear, wFar]) {
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 16;
      t.needsUpdate = true;
    }
    this.WU = {
      wNearC: { value: new THREE.Color() },
      wMidC: { value: new THREE.Color() },
      wFarC: { value: new THREE.Color() },
      wCrest: { value: new THREE.Color() },
      wTrough: { value: new THREE.Color() },
      wGlint: { value: new THREE.Color() },
      wShade: { value: new THREE.Vector3(0.5, 0.56, 0.72) },
      wNearTex: { value: wNear },
      wFarTex: { value: wFar },
      wTime: { value: 0 },
    };
    const waterM = new THREE.MeshLambertMaterial({ color: 0xffffff });
    waterM.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.WU);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", WATER_DECL)
        .replace("#include <map_fragment>", WATER_COL)
        .replace("#include <lights_fragment_begin>", "float sunVis = 1.0;\n" + LFB)
        .replace(
          "#include <lights_fragment_end>",
          "#include <lights_fragment_end>\n  reflectedLight.directDiffuse = diffuseColor.rgb * mix(wShade, vec3(1.0), sunVis);\n  reflectedLight.indirectDiffuse = vec3(0.0);"
        );
    };
    waterM.customProgramCacheKey = () => "ocean1";
    const wm = new THREE.Mesh(quadUp(-900, 900, -900, 900, 1, 1, -D0), waterM);
    wm.receiveShadow = true;
    R.add(wm);

    // Distant Montevideo coastal hills on the far horizon
    for (const [hx, hz, hr, hh] of [
      [-120, -220, 95, 28],
      [-20, -250, 120, 38],
      [90, -230, 85, 22],
    ] as const) {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(hr, hh, 12), hillMat);
      hill.position.set(hx, hh * 0.4, hz);
      R.add(hill);
    }

    // ========================================================================
    // 1. COMMODORE COE'S WARSHIP ("Santa Maria", centered at x=0, z=-16..16)
    // ========================================================================
    const b = new Batch();
    // Main gun deck planks (width 6.4m, length 32m at y = D0)
    b.add(boxGeo(V(-3.2, 0.0, -16.0), V(3.2, D0, 16.0), 3), hullBeam);
    b.add(boxGeo(V(-3.1, D0 - 0.08, -15.8), V(3.1, D0 + 0.01, 15.8), 2.5), deckPlanks);
    // Raised quarterdeck at stern (z = 9..16) and bow forecastle (z = -16..-11)
    b.add(boxGeo(V(-3.1, D0, 9.5), V(3.1, D0 + 1.3, 16.0), 2.5), deckPlanks);
    b.add(boxGeo(V(-3.1, D0, -16.0), V(3.1, D0 + 1.1, -11.5), 2.5), deckPlanks);
    // Port & Starboard wooden bulwarks (gunwale walls with cannon openings)
    b.add(boxGeo(V(-3.25, D0, -15.8), V(-2.92, D0 + 1.05, 15.8), 2), hullBeam);
    b.add(boxGeo(V(2.92, D0, -15.8), V(3.25, D0 + 1.05, 15.8), 2), hullBeam);
    // Top wooden cap rails
    b.add(boxGeo(V(-3.32, D0 + 1.05, -15.9), V(-2.86, D0 + 1.18, 15.9), 2), darkWood);
    b.add(boxGeo(V(2.86, D0 + 1.05, -15.9), V(3.32, D0 + 1.18, 15.9), 2), darkWood);

    // 3 Tall Wooden Masts + Yards + Billowing Sails on Coe's ship
    for (const [mz, mh, sw] of [
      [-8.5, 14.5, 5.2],
      [0.5, 17.5, 6.4],
      [8.5, 13.5, 4.8],
    ] as const) {
      const mast = new THREE.CylinderGeometry(0.24, 0.34, mh, 12);
      b.add(mast, woodMat, new THREE.Matrix4().makeTranslation(0, D0 + mh * 0.5, mz));
      const yard = new THREE.CylinderGeometry(0.12, 0.12, sw, 10);
      yard.rotateZ(Math.PI / 2);
      b.add(yard, darkWood, new THREE.Matrix4().makeTranslation(0, D0 + mh * 0.72, mz));
      b.add(boxGeo(V(-sw * 0.5, D0 + mh * 0.42, mz - 0.35), V(sw * 0.5, D0 + mh * 0.71, mz - 0.18), 0), sailMat);
    }

    // Shot 3 Props (at z = -5.5): Full Gunpowder Barrels + EMPTY Cannonball Crate
    for (const [bx, bz] of [
      [-1.4, -6.2],
      [-0.85, -6.4],
      [-1.15, -5.6],
    ] as const) {
      const barrel = new THREE.CylinderGeometry(0.32, 0.35, 0.82, 14);
      b.add(barrel, darkWood, new THREE.Matrix4().makeTranslation(bx, D0 + 0.41, bz));
      const band = new THREE.CylinderGeometry(0.355, 0.355, 0.08, 14);
      b.add(band, ironMat, new THREE.Matrix4().makeTranslation(bx, D0 + 0.62, bz));
    }
    // Empty open wooden cannonball rack/crate on the right (at x = 0.25, z = -5.6)
    b.add(boxGeo(V(-0.35, D0, -6.1), V(0.65, D0 + 0.12, -5.1), 1), woodMat);
    b.add(boxGeo(V(-0.35, D0 + 0.12, -6.1), V(0.65, D0 + 0.48, -6.0), 1), darkWood);
    b.add(boxGeo(V(-0.35, D0 + 0.12, -5.2), V(0.65, D0 + 0.48, -5.1), 1), darkWood);
    b.add(boxGeo(V(-0.35, D0 + 0.12, -6.1), V(-0.25, D0 + 0.48, -5.1), 1), darkWood);
    b.add(boxGeo(V(0.55, D0 + 0.12, -6.1), V(0.65, D0 + 0.48, -5.1), 1), darkWood);

    // ========================================================================
    // 2. BELOW-DECK SHIP'S GALLEY / KITCHEN ROOM (Shot 5, centered at z = 52)
    // ========================================================================
    b.add(boxGeo(V(-4.5, D0 - 0.1, 48.0), V(4.5, D0, 57.5), 2), deckPlanks); // cabin floor
    b.add(boxGeo(V(-4.5, D0, 48.0), V(4.5, D0 + 3.8, 48.4), 2), hullBeam); // back bulkhead wall
    b.add(boxGeo(V(-4.5, D0, 48.0), V(-4.1, D0 + 3.8, 57.5), 2), hullBeam); // left cabin wall
    b.add(boxGeo(V(4.1, D0, 48.0), V(4.5, D0 + 3.8, 57.5), 2), hullBeam); // right cabin wall
    // Galley wooden shelves along the back wall + kitchen table in center
    for (const sy of [D0 + 0.85, D0 + 1.65, D0 + 2.45]) {
      b.add(boxGeo(V(-3.8, sy, 48.4), V(3.8, sy + 0.12, 49.5), 1.5), woodMat);
      // Fill every shelf with round golden-yellow & red-wax Dutch Edam cheese wheels!
      for (let cx = -3.3; cx <= 3.3; cx += 0.66) {
        const cw = new THREE.CylinderGeometry(0.27, 0.27, 0.28, 16);
        b.add(cw, Math.round(cx * 2) % 2 === 0 ? cheeseYellow : cheeseWax, new THREE.Matrix4().makeTranslation(cx, sy + 0.26, 48.95));
        const cw2 = new THREE.CylinderGeometry(0.25, 0.25, 0.26, 16);
        b.add(cw2, cheeseYellow, new THREE.Matrix4().makeTranslation(cx, sy + 0.53, 48.95));
      }
    }
    // Galley kitchen table stacked with a pyramid of golden Dutch cheese wheels
    b.add(boxGeo(V(-1.4, D0, 50.4), V(1.4, D0 + 0.82, 51.5), 1.5), darkWood);
    for (let row = 0; row < 3; row++) {
      for (let k = 0; k < 4 - row; k++) {
        const cw = new THREE.CylinderGeometry(0.28, 0.28, 0.28, 16);
        const cx = -0.75 + row * 0.28 + k * 0.52;
        b.add(cw, (row + k) % 3 === 0 ? cheeseWax : cheeseYellow, new THREE.Matrix4().makeTranslation(cx, D0 + 0.96 + row * 0.28, 50.95));
      }
    }

    // ========================================================================
    // 3. DRYING CHEESE VS SOLID OAK TABLETOP SCENE (Shot 10, centered at z = 80)
    // ========================================================================
    b.add(boxGeo(V(-5.0, D0 - 0.1, 76.0), V(5.0, D0, 84.5), 2), deckPlanks);
    b.add(boxGeo(V(-5.0, D0, 76.0), V(5.0, D0 + 4.2, 76.4), 2), hullBeam);
    // Heavy demonstration table at z = 79.5
    b.add(boxGeo(V(-1.8, D0, 78.7), V(1.8, D0 + 0.92, 80.3), 1.5), darkWood);
    // Left side of table: Giant aged golden wheel of Dutch Edam cheese (x = -0.65, z = 79.5)
    const bigCheese = new THREE.CylinderGeometry(0.48, 0.48, 0.42, 20);
    b.add(bigCheese, cheeseOrange, new THREE.Matrix4().makeTranslation(-0.62, D0 + 1.13, 79.5));
    // Right side of table: Heavy solid oak timber block (x = 0.65, z = 79.5)
    b.add(boxGeo(V(0.18, D0 + 0.92, 79.05), V(1.15, D0 + 1.48, 79.95), 1), oakBlockMat);

    // ========================================================================
    // 4. MODERN FRIDGE + KNIFE BOUNCE + CANNON SHRAPNEL SCENE (Shot 11, z = 110)
    // ========================================================================
    b.add(boxGeo(V(-5.5, D0 - 0.1, 106.0), V(5.5, D0, 115.0), 2), stoneMat);
    b.add(boxGeo(V(-5.5, D0, 106.0), V(5.5, D0 + 4.5, 106.4), 2), stoneMat);
    // Open White Kitchen Refrigerator on the right (x = 1.05, z = 108.6)
    b.add(boxGeo(V(0.45, D0, 107.8), V(1.75, D0 + 2.35, 108.9), 0), whiteMat);
    b.add(boxGeo(V(0.55, D0 + 0.2, 107.95), V(1.65, D0 + 2.2, 108.92), 0), fridgeInsideMat);
    // Fridge shelves + aged cheese wheels inside the fridge
    for (const fy of [D0 + 0.75, D0 + 1.35, D0 + 1.85]) {
      b.add(boxGeo(V(0.56, fy, 107.96), V(1.64, fy + 0.05, 108.9), 0), steelMat);
      const fc = new THREE.CylinderGeometry(0.22, 0.22, 0.2, 14);
      b.add(fc, cheeseYellow, new THREE.Matrix4().makeTranslation(1.1, fy + 0.15, 108.45));
    }
    // Open fridge door swung out to the right
    b.add(boxGeo(V(1.75, D0 + 0.05, 108.85), V(2.65, D0 + 2.32, 108.98), 0), whiteMat);
    // Kitchen counter & cutting board in center (x = -0.15, z = 109.5) with rock-hard cheese block
    b.add(boxGeo(V(-1.1, D0, 108.9), V(0.35, D0 + 0.92, 110.1), 1.5), darkWood);
    b.add(boxGeo(V(-0.45, D0 + 0.92, 109.15), V(0.25, D0 + 0.98, 109.85), 1), woodMat);
    const hardBlock = new THREE.CylinderGeometry(0.32, 0.32, 0.28, 16);
    b.add(hardBlock, cheeseOrange, new THREE.Matrix4().makeTranslation(-0.1, D0 + 1.12, 109.5));

    b.build(R);

    // ---- 6 Naval 18-Pounder Cannons on Coe's Warship + Muzzle Flashes ----
    const cannonZs = [-9.0, -5.0, -1.0, 2.5, 6.0, 9.0];
    for (const cz of cannonZs) {
      const cg = new THREE.Group();
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.45, 0.62), redCarriage);
      carriage.position.y = 0.28;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 1.45, 14), ironMat);
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(-0.32, 0.58, 0);
      cg.add(carriage, barrel);
      // Stack of 3 golden Dutch cheese wheels next to each cannon
      for (let k = 0; k < 3; k++) {
        const cw = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.22, 14), k === 1 ? cheeseWax : cheeseYellow);
        cw.position.set(0.55, 0.11 + k * 0.22, 0.52);
        cg.add(cw);
      }
      cg.position.set(-2.25, D0, cz);
      cg.traverse((o) => {
        o.castShadow = true;
        o.receiveShadow = true;
      });
      R.add(cg);

      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 10), flashMat);
      fl.position.set(-3.15, D0 + 0.58, cz);
      fl.visible = false;
      R.add(fl);
      this.muzzleFlashes.push(fl);
    }

    // ---- Shot 4: White Surrender Flag on Pole ----
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8), woodMat);
    pole.position.y = 1.25;
    const whiteCloth = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), whiteMat);
    whiteCloth.position.set(-0.55, 2.1, 0);
    this.whiteFlagGroup.add(pole, whiteCloth);
    this.whiteFlagGroup.position.set(-0.2, D0, 1.5);
    R.add(this.whiteFlagGroup);

    // ---- Shot 6: Rolling Cheese Wheels across the deck ----
    const rollGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.24, 16);
    rollGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 4; i++) {
      const rc = new THREE.Mesh(rollGeo, i % 2 === 0 ? cheeseYellow : cheeseWax);
      rc.castShadow = true;
      rc.visible = false;
      R.add(rc);
      this.rollingCheeses.push(rc);
    }

    // ---- Shot 10: Evaporating Moisture Droplets rising from the drying cheese ----
    const dropGeo = new THREE.SphereGeometry(0.07, 8, 8);
    for (let i = 0; i < 10; i++) {
      const d = new THREE.Mesh(dropGeo, dropletMat);
      d.visible = false;
      R.add(d);
      this.droplets.push(d);
    }

    // ---- Shot 11: Animated Steel Chef's Knife + Fridge Shrapnel ----
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.65), steelMat);
    blade.position.set(0, 0, -0.2);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.32), darkWood);
    handle.position.set(0, 0.02, 0.28);
    this.knifeGroup.add(blade, handle);
    this.knifeGroup.position.set(-0.1, D0 + 1.55, 109.5);
    R.add(this.knifeGroup);

    const shrapGeo = new THREE.ConeGeometry(0.22, 0.45, 5);
    for (let i = 0; i < 16; i++) {
      const fs = new THREE.Mesh(shrapGeo, cheeseYellow);
      fs.visible = false;
      R.add(fs);
      this.fridgeShrapnel.push(fs);
    }

    // ---- Shot 13: Golden Dutch Cheese Trophy Pedestal on Coe's Deck ----
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85, 0.9), darkWood);
    ped.position.y = 0.425;
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.28, 0.94), goldMat);
    plaque.position.y = 0.78;
    const trophyCheese = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.36, 20), goldMat);
    trophyCheese.rotation.z = Math.PI / 2;
    trophyCheese.position.y = 1.25;
    this.trophyGroup.add(ped, plaque, trophyCheese);
    this.trophyGroup.position.set(0.0, D0, -0.4);
    this.trophyGroup.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    R.add(this.trophyGroup);

    // ---- Flying Cheese Projectiles (12) + Mast Shrapnel (18) ----
    const flyGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 16);
    flyGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(flyGeo, cheeseYellow);
      m.castShadow = true;
      m.visible = false;
      R.add(m);
      this.flyingCheeses.push(m);
    }
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Mesh(shrapGeo, cheeseYellow);
      s.visible = false;
      R.add(s);
      this.shrapnel.push(s);
    }

    // ========================================================================
    // 5. ENEMY FLAGSHIP ("Belgrano") at x = -18, z = -2 + 2 Escort Ships
    // ========================================================================
    const hull = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.6, 28), darkWood);
    hull.position.y = 1.8;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.35, 28.5), deckPlanks);
    deck.position.y = D0 + 1.25;
    const bulwarkL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 28.5), darkWood);
    bulwarkL.position.set(3.6, D0 + 1.8, 0);
    const mastBase = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, 6.5, 12), woodMat);
    mastBase.position.set(0, D0 + 4.2, 0);
    const foreMast = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 13.5, 12), woodMat);
    foreMast.position.set(0, D0 + 7.8, -8.5);
    const foreSail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 6.2, 5.6), sailMat);
    foreSail.position.set(0.3, D0 + 8.5, -8.5);
    const aftMast = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 12.0, 12), woodMat);
    aftMast.position.set(0, D0 + 7.0, 8.5);
    const aftSail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.4, 4.8), sailMat);
    aftSail.position.set(0.3, D0 + 7.8, 8.5);
    this.enemyShip.add(hull, deck, bulwarkL, mastBase, foreMast, foreSail, aftMast, aftSail);

    // Cheese wheel sitting on enemy deck for Shot 8 ("Luckily, they were only getting hit with dairy")
    this.deckCheeseOnEnemy = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16), cheeseYellow);
    this.deckCheeseOnEnemy.position.set(0.8, D0 + 1.55, 0.5);
    this.enemyShip.add(this.deckCheeseOnEnemy);

    // Upper half of enemy mainmast (snaps when hit by the Dutch cheese broadside!)
    const upperMast = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 9.5, 12), woodMat);
    upperMast.position.set(0, 4.7, 0);
    const mainSail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 7.2, 6.8), sailMat);
    mainSail.position.set(0.3, 4.8, 0);
    const impactCheese = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.35, 14), cheeseYellow);
    impactCheese.rotation.z = Math.PI / 2;
    impactCheese.position.set(0.32, 4.4, 0);
    this.enemyMastTop.add(upperMast, mainSail, impactCheese);
    this.enemyMastTop.position.set(0, D0 + 7.2, 0);
    this.enemyShip.add(this.enemyMastTop);

    this.enemyShip.position.set(-18.0, 0, -2.0);
    this.enemyShip.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    R.add(this.enemyShip);

    // Two smaller enemy escort warships in the background for fleet shots (Shots 2 & 12)
    const makeEscort = () => {
      const g = new THREE.Group();
      const eh = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.8, 19), darkWood);
      eh.position.y = 1.4;
      const em = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 12, 10), woodMat);
      em.position.y = 7.0;
      const es = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.5, 4.8), sailMat);
      es.position.set(0.25, 7.5, 0);
      g.add(eh, em, es);
      return g;
    };
    this.enemyEscort1 = makeEscort();
    this.enemyEscort2 = makeEscort();
    R.add(this.enemyEscort1, this.enemyEscort2);

    // Waving battle flags on Coe's mainmast
    const flagM = lam("flagM", () => ({ map: flagTex(), side: THREE.DoubleSide }));
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.05, 12, 1), flagM);
    fl.position.set(0, D0 + 17.2, 0.5);
    fl.frustumCulled = false;
    this.flags.push(fl);
    R.add(fl);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0,
      fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f),
        x = c.look[0] - c.pos[0],
        z = c.look[2] - c.pos[2],
        n = Math.hypot(x, z) || 1;
      fx += x / n;
      fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1;
    fx /= n;
    fz /= n;
    const az = THREE.MathUtils.degToRad(L.az),
      el = THREE.MathUtils.degToRad(L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az),
      hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private actor(i: number) {
    while (this.actors.length <= i) this.actors.push(new Actor(this.root));
    return this.actors[i];
  }
  private fx(i: number) {
    while (this.fxs.length <= i) this.fxs.push(new Fx(this.root));
    return this.fxs[i];
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS,
      s = SHOTS[id - 1] ?? SHOTS[0],
      b = bridgeState(id, t),
      L = LIGHTS[s.light];

    // ---- Camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(...c.look);
    cam.rotateZ(c.roll);
    cam.fov = c.fov;
    cam.near = 0.2;
    cam.far = 1500;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const focus = V(...c.look),
      dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);

    // ---- Light Rig ----
    const K = LOOK[s.light],
      sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky);
    this.hemi.groundColor.set(L.ground);
    this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol);
    this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 14, 85);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220);
    this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr;
    sc.right = Rr;
    sc.top = Rr;
    sc.bottom = -Rr;
    sc.near = 20;
    sc.far = 480;
    sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias;
    this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0;

    TONE.uLitCol.value.set(...L.lit);
    TONE.uShadeCol.value.set(...L.shade);
    TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert;
    TONE.uSideK.value = L.sideK;
    TONE.uTerm.value = L.term;
    TONE.uBounce.value.set(...LOOK[s.light].bounce);
    TONE.uSat.value = LOOK[s.light].sat;
    CHAR.uCharTint.value.set(...L.charTint);
    CHAR.uCharShade.value = L.charShade;
    CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad;
    CHAR.uSideTint.value.set(...L.sideTint);

    // ---- Sky & Water ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color);
    this.fog.near = L.fogNear;
    this.fog.far = L.fogFar;
    scene.fog = this.fog;
    scene.background = null;

    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position);
      this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i],
        mat = m.material as THREE.MeshBasicMaterial;
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      mat.map = this.cloudMaps[s.light][i % 4];
    }

    const W = this.WU,
      wc = K.water;
    untone(wc.near, W.wNearC.value);
    untone(wc.mid, W.wMidC.value);
    untone(wc.far, W.wFarC.value);
    untone(wc.crest, W.wCrest.value);
    untone(wc.trough, W.wTrough.value);
    untone(wc.glint, W.wGlint.value);
    W.wShade.value.set(...wc.shade);
    W.wTime.value = t;

    // ---- Pose Custom Props Per Shot ----
    this.poseNavalBattle(id, t, f);

    // ---- Cast + 2D Effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, b, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 4.0))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;

    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h) + 1))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else {
        e.mesh.quaternion.copy(cam.quaternion);
        e.mesh.rotateZ(p.rot ?? 0);
      }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }

  private poseNavalBattle(id: number, t: number, f: number) {
    // Shot-specific prop visibility
    this.whiteFlagGroup.visible = id === 4;
    this.trophyGroup.visible = id === 13;
    this.deckCheeseOnEnemy.visible = id === 8 || id === 9;

    // Enemy Flagship & Escorts: close in during Shot 4, retreat during Shot 12
    const closeIn = id === 4 ? smooth((t - 16.1) / 4.0) * 3.5 : 0;
    const retreatU = id === 12 ? smooth((t - 55.8) / 4.7) : 0;
    const shipX = -18.0 + closeIn - retreatU * 14.0;
    const shipZ = -2.0 - retreatU * 6.0;
    this.enemyShip.position.set(shipX, 0.15 * Math.sin(t * 2.1), shipZ);
    this.enemyShip.rotation.y = retreatU * 0.65;
    this.enemyShip.rotation.z = 0.035 * Math.sin(t * 1.8);

    this.enemyEscort1.position.set(shipX - 10 - retreatU * 8, 0, shipZ - 26 - retreatU * 10);
    this.enemyEscort2.position.set(shipX - 12 - retreatU * 8, 0, shipZ + 24 - retreatU * 8);
    this.enemyEscort1.rotation.y = retreatU * 0.7;
    this.enemyEscort2.rotation.y = retreatU * 0.7;

    // Shot 6: Rolling cheese wheels across deck into cannons
    this.rollingCheeses.forEach((rc, i) => {
      rc.visible = id === 6;
      if (id !== 6) return;
      const u = ((t * 0.85 + i * 0.25) % 1);
      rc.position.set(1.2 - u * 3.1, D0 + 0.28, -2.5 + i * 1.8);
      rc.rotation.z = -u * Math.PI * 4;
    });

    // Flying cheese broadsides in Shots 1 (hook), 7 (broadside), and 9 (unluckily 900mph)
    const activeVolley = id === 1 || id === 7 || id === 9;
    const cannonZs = [-9.0, -5.0, -1.0, 2.5, 6.0, 9.0];
    this.muzzleFlashes.forEach((fl, i) => {
      const trigger = activeVolley && ((f + i * 4) % 18 < 3);
      fl.visible = trigger;
      if (trigger) fl.scale.setScalar(0.9 + 0.4 * ((f + i) % 3));
    });

    this.flyingCheeses.forEach((m, i) => {
      m.visible = activeVolley;
      if (!activeVolley) return;
      const u = ((t * 1.7 + i * 0.11) % 1);
      const z0 = cannonZs[i % cannonZs.length];
      m.position.set(
        -2.8 - u * 15.2,
        D0 + 0.65 + 4.2 * u * (1 - u) + (i % 3) * 0.8 * u,
        z0 + (-2.0 - z0) * u * 0.75
      );
      m.rotation.set(t * 10 + i, t * 7, t * 12);
    });

    // Enemy mainmast snaps in Shot 7 (t >= 31.3s) and stays broken in Shots 8, 9, 12
    const mastBroken = id === 7 ? clamp01((t - 31.3) / 1.1) : id === 8 || id === 9 || id === 12 ? 1 : 0;
    this.enemyMastTop.rotation.z = mastBroken * 1.22;
    this.enemyMastTop.position.y = D0 + 7.2 - mastBroken * 1.6;

    // Exploding yellow cheese shrapnel wedges in Shot 7 (t >= 31.2s) and Shot 9 (t >= 39.2s)
    const showShrapnel = (id === 7 && t >= 31.2) || (id === 9 && t >= 39.2);
    this.shrapnel.forEach((s, i) => {
      s.visible = showShrapnel;
      if (!showShrapnel) return;
      const u = ((t * 2.1 + i * 0.08) % 1);
      const ang = (i / 18) * Math.PI * 2;
      const baseY = id === 7 ? D0 + 6.8 : D0 + 2.2;
      s.position.set(
        shipX + Math.cos(ang) * u * 5.8,
        baseY + Math.sin(ang) * u * 3.8 - 4.5 * u * u,
        shipZ + Math.sin(ang * 2) * u * 4.8
      );
      s.rotation.set(t * 14 + i, t * 11, i);
    });

    // Shot 10: Evaporating blue moisture droplets rising out of the drying Dutch cheese wheel (x=-0.62, z=79.5)
    this.droplets.forEach((d, i) => {
      d.visible = id === 10;
      if (id !== 10) return;
      const u = ((t * 0.65 + i * 0.1) % 1);
      const a = i * 1.3;
      d.position.set(-0.62 + Math.cos(a) * 0.28, D0 + 1.35 + u * 1.1, 79.5 + Math.sin(a) * 0.28);
      d.scale.setScalar(1 - u * 0.7);
    });

    // Shot 11: Steel chef's knife chops down onto the fridge cheese (f < 1560) and bounces off; then shrapnel test (f >= 1560)
    this.knifeGroup.visible = id === 11 && f < 1560;
    if (this.knifeGroup.visible) {
      const cycle = ((t - 48.0) * 1.8) % 1;
      const chop = cycle < 0.35 ? cycle / 0.35 : 1 - (cycle - 0.35) / 0.65;
      this.knifeGroup.position.set(-0.1, D0 + 1.65 - chop * 0.36, 109.5);
      this.knifeGroup.rotation.x = -0.35 + chop * 0.55;
      this.knifeGroup.rotation.z = chop > 0.85 ? 0.25 * Math.sin(t * 40) : 0;
    }

    const showFridgeShrap = id === 11 && f >= 1565;
    this.fridgeShrapnel.forEach((fs, i) => {
      fs.visible = showFridgeShrap;
      if (!showFridgeShrap) return;
      const u = ((t * 2.4 + i * 0.09) % 1);
      const ang = (i / 16) * Math.PI * 2;
      fs.position.set(
        -0.1 + Math.cos(ang) * u * 2.4,
        D0 + 1.25 + Math.sin(ang) * u * 1.8 - 2.5 * u * u,
        109.5 + Math.sin(ang * 2) * u * 1.8
      );
      fs.rotation.set(t * 15 + i, t * 12, i);
    });

    // Waving flag
    for (const fl of this.flags) {
      const p = fl.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const u = (i % 13) / 12,
          y = i < 13 ? 0.5 : -0.5;
        p.setXYZ(i, -u * 1.8, y + 0.05 * u * Math.sin(t * 4 - u * 3), 0.24 * u * Math.sin(t * 5.5 - u * 5));
      }
      p.needsUpdate = true;
    }
  }
}

const WATER_DECL = `#include <common>
varying vec3 vWP;
uniform vec3 wNearC, wMidC, wFarC, wCrest, wTrough, wGlint, wShade;
uniform sampler2D wNearTex, wFarTex;
uniform float wTime;`;
const WATER_COL = `
  vec3 wV = vWP - cameraPosition;
  float wd = length(wV);
  float wDep = asin(clamp(-wV.y / wd, 0.0, 1.0));
  float wf = 1.0 - smoothstep(0.0, 0.42, wDep);
  vec3 wc = mix(mix(wNearC, wMidC, smoothstep(0.0, 0.55, wf)), wFarC, smoothstep(0.55, 1.0, wf));
  vec2 wp = vWP.xz + vec2(0.35 * wTime, 0.0);
  vec4 mk = mix(texture2D(wNearTex, wp / 8.0), texture2D(wFarTex, wp / 40.0 + 0.37), smoothstep(25.0, 90.0, wd));
  wc = mix(wc, wTrough, mk.g * 0.6);
  wc = mix(wc, wCrest, mk.r * 0.7);
  wc = mix(wc, wGlint, mk.b * (0.3 + 0.5 * wf));
  diffuseColor.rgb = wc;`;

function quadUp(x0: number, x1: number, z0: number, z1: number, u: number, v: number, dy = 0) {
  const y = D0 + dy,
    g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
}
