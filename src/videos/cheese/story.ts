// Timeline of "The Captain Who Fired Cheese" (1841 Battle of Montevideo):
// 13 distinct scenes timed 1-to-1 to out/cheese/words.json (1960 frames = 65.33s at 30 fps).
export const FPS = 30;
export const TOTAL = 1960;
export const D0 = 2.2; // main gun deck height above water (m)
export const HALF = 27;
export const FILES = [-1.65, -0.55, 0.55, 1.65];
export const ROW_GAP = 1.3;
export const COUNT = 24;
export const PARK: V3 = [0, D0, 0];
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};
export const smoother = (x: number) => {
  const u = clamp01(x);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

export type Light = "day" | "golden";
export type Crowd =
  | "hook"
  | "duel"
  | "bad_news"
  | "white_flag"
  | "galley"
  | "load"
  | "broadside"
  | "luckily"
  | "unluckily"
  | "oak_table"
  | "fridge"
  | "retreat"
  | "victory";

export type ShotDef = {
  id: number;
  a: number;
  b: number;
  light: Light;
  crowd: Crowd;
  tau: (t: number) => number;
};

// Exact frame boundaries from out/cheese/words.json:
export const SHOTS: ShotDef[] = [
  // 1. Hook (0 - 123): "A navy captain once won a warship battle by firing stale cheese out of his cannons."
  { id: 1, a: 0, b: 124, light: "day", crowd: "hook", tau: (t) => t },
  // 2. Setting (124 - 300): "It's 1841 off the coast of Uruguay, and Commodore John Coe is locked in a gun duel with a bigger enemy flagship."
  { id: 2, a: 124, b: 300, light: "day", crowd: "duel", tau: (t) => t },
  // 3. Bad news (300 - 484): "Ten minutes in, the gunner runs up with terrible news: the powder barrels are full, but they're completely out of iron cannonballs."
  { id: 3, a: 300, b: 484, light: "day", crowd: "bad_news", tau: (t) => t },
  // 4. White flag (484 - 608): "The enemy ship is turning in to finish them off, and the crew is ready to wave the white flag."
  { id: 4, a: 484, b: 608, light: "day", crowd: "white_flag", tau: (t) => t },
  // 5. Idea / Galley below deck (608 - 758): "Then the captain remembers the kitchen below deck is stacked with round wheels of Dutch cheese that went stale months ago."
  { id: 5, a: 608, b: 758, light: "golden", crowd: "galley", tau: (t) => t },
  // 6. Load cannons (758 - 896): "He orders the crew to roll the cheeses up the stairs and ram them straight down the eighteen-pounder cannons."
  { id: 6, a: 758, b: 896, light: "day", crowd: "load", tau: (t) => t },
  // 7. Broadside & Mast Shatter (896 - 1065): "The whole broadside fires at once, and a dozen yellow wheels scream across the water and smash right through the enemy mast."
  { id: 7, a: 896, b: 1065, light: "day", crowd: "broadside", tau: (t) => t },
  // 8. Luckily (1065 - 1154): "Luckily for the enemy crew, they were only getting hit with dairy."
  { id: 8, a: 1065, b: 1154, light: "day", crowd: "luckily", tau: (t) => t },
  // 9. Unluckily 900 mph (1154 - 1272): "Unluckily for the enemy crew, that dairy was moving at nine hundred miles an hour."
  { id: 9, a: 1154, b: 1272, light: "day", crowd: "unluckily", tau: (t) => t },
  // 10. You see / Drying cheese & oak table (1272 - 1441): "You see, when round Dutch cheese dries out at sea, the moisture leaves and the proteins lock together like solid oak."
  { id: 10, a: 1272, b: 1441, light: "golden", crowd: "oak_table", tau: (t) => t },
  // 11. Fridge + Knife Bounce + Cannon Shrapnel (1441 - 1676): "Ever left a block of cheese uncovered in the back of the fridge? You can barely dent it with a knife—and fired from a cannon, it shatters on impact like shrapnel."
  { id: 11, a: 1441, b: 1676, light: "day", crowd: "fridge", tau: (t) => t },
  // 12. Enemy Fleet Retreats (1676 - 1817): "The enemy admiral thought they were using a secret new exploding weapon and ordered his entire fleet to retreat."
  { id: 12, a: 1676, b: 1817, light: "day", crowd: "retreat", tau: (t) => t },
  // 13. Ending / Undefeated at sea (1817 - 1960): "So the next time someone says cheese isn't tactical, remind them it's undefeated at sea."
  { id: 13, a: 1817, b: TOTAL, light: "golden", crowd: "victory", tau: (t) => t },
];

export const XFADE: Record<number, number> = { 5: 6, 6: 6, 10: 8, 11: 8, 12: 8, 13: 8 };
export const FLASH_AT = 122;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];

export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) {
      return [
        { id: s.id - 1, alpha: 1 },
        { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) },
      ];
    }
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// Compatibility exports for unused bridge helpers
export type BridgeState = { bounce: number; drop: number; snap: number; collapsed: boolean };
export const bridgeState = (_id: number, _t: number): BridgeState => ({ bounce: 0, drop: 0, snap: 0, collapsed: false });
export const deckY = (_z: number, _b: BridgeState) => D0;
export const dropW = (_z: number) => 0;
export const shapeZ = (_z: number) => 0;
export const snapEnd = (_u: number): V3 => [0, D0, 0];
export const front = (_tau: number) => 0;
export const ANCHOR: V3 = [0, D0, 0];
export const SNAP = 31.4;

type CamState = { pos: V3; look: V3; fov: number; roll: number };

const lerp3 = (a: V3, b: V3, u: number): V3 => [
  a[0] + (b[0] - a[0]) * u,
  a[1] + (b[1] - a[1]) * u,
  a[2] + (b[2] - a[2]) * u,
];

// Camera kicks on cannon blasts, mast shatter, 900mph impact, and knife bounce
const KICKS: { f: number; amp: number }[] = [
  { f: 55, amp: 0.22 },   // hook cannon blast
  { f: 905, amp: 0.28 },  // broadside fire
  { f: 948, amp: 0.35 },  // mast shatter impact
  { f: 1185, amp: 0.32 }, // 900mph dairy impact
  { f: 1515, amp: 0.24 }, // knife bounces off fridge cheese
  { f: 1585, amp: 0.30 }, // cannon shatters cheese into shrapnel
];

export const camAt = (id: number, f: number): CamState => {
  const s = SHOTS[id - 1] ?? SHOTS[0];
  const u = clamp01((f - s.a) / Math.max(1, s.b - s.a));
  const g = smoother(u);

  let c: CamState;
  switch (id) {
    case 1: // Hook: Close-up on Captain Coe & 18-pounder cannon firing a golden wheel of Dutch cheese
      c = {
        pos: lerp3([3.4, D0 + 1.55, 4.2], [2.6, D0 + 1.48, 2.5], g),
        look: lerp3([-1.2, D0 + 1.15, 0.0], [-4.5, D0 + 1.25, -0.5], g),
        fov: 38,
        roll: -0.04,
      };
      break;
    case 2: // Setting (1841 Uruguay): Wide dramatic naval view of both warships broadside-to-broadside on the ocean
      c = {
        pos: lerp3([12.0, D0 + 6.5, 24.0], [8.5, D0 + 4.8, 17.5], g),
        look: lerp3([-8.0, D0 + 2.5, -2.0], [-9.5, D0 + 2.8, -4.0], g),
        fov: 42,
        roll: 0.03,
      };
      break;
    case 3: // Bad news: Gunner runs up to Captain Coe between full POWDER barrels and an EMPTY cannonball crate
      c = {
        pos: lerp3([3.8, D0 + 1.65, -2.2], [2.9, D0 + 1.50, -3.1], g),
        look: lerp3([0.2, D0 + 1.15, -5.5], [0.0, D0 + 1.05, -5.8], g),
        fov: 36,
        roll: 0.0,
      };
      break;
    case 4: // White flag: Enemy warship looming close on the left while two nervous sailors hold a white flag
      c = {
        pos: lerp3([4.6, D0 + 1.8, 7.5], [3.8, D0 + 1.65, 5.2], g),
        look: lerp3([-6.0, D0 + 2.0, 2.0], [-8.0, D0 + 2.3, 1.0], g),
        fov: 40,
        roll: -0.05,
      };
      break;
    case 5: // Idea (Below-deck Galley kitchen): Shelves stacked high with golden-yellow & red-wax Dutch Edam cheese wheels
      c = {
        pos: lerp3([0.0, D0 + 1.65, 58.5], [0.2, D0 + 1.55, 56.2], g),
        look: lerp3([0.0, D0 + 1.25, 51.5], [0.0, D0 + 1.35, 51.0], g),
        fov: 36,
        roll: 0.02,
      };
      break;
    case 6: // Load: Sailors rolling yellow cheese wheels across the deck and ramming them into the 18-pounder cannon barrels
      c = {
        pos: lerp3([2.8, D0 + 1.45, 5.5], [2.1, D0 + 1.32, 2.4], g),
        look: lerp3([-1.5, D0 + 0.95, 0.2], [-2.1, D0 + 0.85, -1.5], g),
        fov: 38,
        roll: 0.04,
      };
      break;
    case 7: // Broadside & Mast Shatter: Camera tracks the 12 flying yellow cheese wheels smashing the enemy flagship's mainmast!
      if (f < 942) {
        const u1 = smooth((f - 896) / 46);
        c = {
          pos: lerp3([4.5, D0 + 2.4, 8.5], [-4.0, D0 + 4.2, 11.0], u1),
          look: lerp3([-2.5, D0 + 1.2, 0.0], [-14.0, D0 + 5.5, -2.0], u1),
          fov: 42,
          roll: -0.06,
        };
      } else {
        const u2 = smooth((f - 942) / 123);
        c = {
          pos: lerp3([-7.5, D0 + 4.8, 9.5], [-9.2, D0 + 5.2, 6.8], u2),
          look: lerp3([-18.0, D0 + 6.5, -2.0], [-18.0, D0 + 5.0, -2.0], u2),
          fov: 40,
          roll: 0.06,
        };
      }
      break;
    case 8: // Luckily: Enemy deck close-up — confused enemy sailors staring at a bright yellow cheese wheel on their deck
      c = {
        pos: lerp3([-12.5, D0 + 2.4, 4.5], [-13.5, D0 + 2.2, 3.0], g),
        look: lerp3([-18.0, D0 + 1.4, -1.5], [-18.2, D0 + 1.3, -2.0], g),
        fov: 36,
        roll: 0.02,
      };
      break;
    case 9: // Unluckily (900 mph!): High-speed yellow cheese balls slam onto the enemy deck and explode into shrapnel!
      c = {
        pos: lerp3([-11.0, D0 + 2.8, 6.0], [-12.8, D0 + 2.4, 4.2], g),
        look: lerp3([-18.0, D0 + 1.8, -1.5], [-18.5, D0 + 1.6, -2.5], g),
        fov: 42,
        roll: -0.07,
      };
      break;
    case 10: // You see: Tabletop close-up of a round Dutch cheese wheel drying out next to a solid oak timber block
      c = {
        pos: lerp3([0.0, D0 + 1.85, 84.5], [0.4, D0 + 1.72, 82.8], g),
        look: lerp3([0.0, D0 + 1.15, 79.5], [0.0, D0 + 1.15, 79.5], g),
        fov: 34,
        roll: 0.0,
      };
      break;
    case 11: // Fridge + Knife Bounce + Cannon Shrapnel
      if (f < 1560) {
        const u1 = smooth((f - 1441) / 119);
        c = {
          pos: lerp3([0.2, D0 + 1.85, 115.2], [0.0, D0 + 1.70, 113.5], u1),
          look: lerp3([0.0, D0 + 1.35, 109.5], [0.0, D0 + 1.25, 109.5], u1),
          fov: 35,
          roll: 0.02,
        };
      } else {
        const u2 = smooth((f - 1560) / 116);
        c = {
          pos: lerp3([2.2, D0 + 1.85, 114.2], [1.4, D0 + 1.65, 112.6], u2),
          look: lerp3([0.0, D0 + 1.30, 109.2], [0.0, D0 + 1.25, 109.2], u2),
          fov: 38,
          roll: -0.04,
        };
      }
      break;
    case 12: // Retreat: Enemy Admiral panicking as the damaged enemy fleet turns and sails away across the sea
      c = {
        pos: lerp3([4.0, D0 + 4.2, 14.0], [2.5, D0 + 3.8, 11.0], g),
        look: lerp3([-19.0, D0 + 3.0, -3.0], [-28.0, D0 + 2.8, -8.0], g),
        fov: 42,
        roll: 0.03,
      };
      break;
    case 13: // Ending: Heroic golden-hour shot on Coe's deck — Captain Coe, cheering sailors, and a giant golden Cheese Trophy!
    default:
      c = {
        pos: lerp3([3.6, D0 + 1.65, 4.8], [2.7, D0 + 1.48, 3.1], g),
        look: lerp3([0.0, D0 + 1.35, 0.0], [0.0, D0 + 1.42, 0.0], g),
        fov: 36,
        roll: 0.0,
      };
      break;
  }

  // Apply 7-frame decaying flip-shake on impact frames
  for (const k of KICKS) {
    const df = f - k.f;
    if (df >= 0 && df < 7) {
      const sign = df % 2 === 0 ? 1 : -1;
      const decay = (1 - df / 7) ** 2;
      c.roll += sign * k.amp * 0.18 * decay;
      c.pos[1] += sign * k.amp * 0.22 * decay;
    }
  }
  return c;
};

export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  const id = shotAt(f).id;
  if (id === 2 || id === 7 || id === 12) return { cInf: 4 }; // wide naval shots stay crisp
  return { cInf: 12 }; // close-ups & medium shots get rich background bokeh
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
