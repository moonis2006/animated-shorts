import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const CHEESE_FRAMES = 1960;

interface BeatScene {
  id: number;
  name: string;
  start: number;
  end: number;
  img: string;
  hudTag: string;
  hudStatus: string;
  hudColor: string;
  zoomFrom: number;
  zoomTo: number;
  panXFrom: number;
  panXTo: number;
  panYFrom: number;
  panYTo: number;
  rotFrom: number;
  rotTo: number;
  particleMode: "embers" | "shrapnel" | "science" | "gold";
  shakes?: Array<{ frame: number; amp: number; flash?: string }>;
  scanline?: boolean;
}

const SCENES: BeatScene[] = [
  {
    id: 1,
    name: "hook",
    start: 0,
    end: 124,
    img: "cheese/scenes/scene_01.jpg",
    hudTag: "CASE FILE #1841-UY // NAVAL ARCHIVE",
    hudStatus: "WEAPON SYSTEM: 18-POUNDER NAVAL CANNON // PAYLOAD: STALE EDAM CHEESE",
    hudColor: "#f5b942",
    zoomFrom: 1.05,
    zoomTo: 1.2,
    panXFrom: 0,
    panXTo: -1.5,
    panYFrom: 2,
    panYTo: -2,
    rotFrom: -0.8,
    rotTo: 0.4,
    particleMode: "embers",
    shakes: [
      { frame: 16, amp: 18, flash: "rgba(255, 190, 70, 0.45)" },
      { frame: 78, amp: 12, flash: "rgba(255, 160, 50, 0.30)" },
    ],
  },
  {
    id: 2,
    name: "setting",
    start: 124,
    end: 300,
    img: "cheese/scenes/scene_02.jpg",
    hudTag: "SECTOR: MONTEVIDEO BAY, URUGUAY // MAY 1841",
    hudStatus: "COMMODORE JOHN COE VS. ADMIRAL BROWN'S FLAGSHIP // STATUS: OUTGUNNED",
    hudColor: "#56c7ff",
    zoomFrom: 1.08,
    zoomTo: 1.16,
    panXFrom: -1,
    panXTo: 1,
    panYFrom: 5,
    panYTo: -5,
    rotFrom: 0,
    rotTo: 0,
    particleMode: "embers",
    scanline: true,
    shakes: [{ frame: 210, amp: 14, flash: "rgba(255, 175, 60, 0.35)" }],
  },
  {
    id: 3,
    name: "bad_news",
    start: 300,
    end: 484,
    img: "cheese/scenes/scene_03.jpg",
    hudTag: "TACTICAL ALERT // AMMUNITION REPORT",
    hudStatus: "GUNPOWDER BARRELS: 100% FULL // IRON CANNONBALLS: 0 REMAINING",
    hudColor: "#ff4d4d",
    zoomFrom: 1.04,
    zoomTo: 1.22,
    panXFrom: 1.5,
    panXTo: -1.5,
    panYFrom: 4,
    panYTo: -5,
    rotFrom: 0.8,
    rotTo: -1.2,
    particleMode: "embers",
    shakes: [{ frame: 415, amp: 10, flash: "rgba(255, 60, 60, 0.28)" }],
  },
  {
    id: 4,
    name: "white_flag",
    start: 484,
    end: 608,
    img: "cheese/scenes/scene_04.jpg",
    hudTag: "THREAT LEVEL: CRITICAL // ENEMY CLOSING IN",
    hudStatus: "ENEMY FLAGSHIP TURNING FOR POINT-BLANK BROADSIDE // SURRENDER IMMINENT",
    hudColor: "#ff5e5e",
    zoomFrom: 1.18,
    zoomTo: 1.05,
    panXFrom: -1.5,
    panXTo: 1.5,
    panYFrom: -3,
    panYTo: 3,
    rotFrom: -0.6,
    rotTo: 0.6,
    particleMode: "embers",
  },
  {
    id: 5,
    name: "idea",
    start: 608,
    end: 758,
    img: "cheese/scenes/scene_05.jpg",
    hudTag: "DECK: BELOW-DECK SHIP'S GALLEY STORAGE",
    hudStatus: "DISCOVERY: 36 WHEELS OF STALE DUTCH EDAM CHEESE // CURED 14+ MONTHS",
    hudColor: "#f5c242",
    zoomFrom: 1.04,
    zoomTo: 1.2,
    panXFrom: -2,
    panXTo: 2,
    panYFrom: 1,
    panYTo: -2,
    rotFrom: -0.5,
    rotTo: 0.8,
    particleMode: "gold",
    shakes: [{ frame: 695, amp: 8, flash: "rgba(255, 215, 90, 0.30)" }],
  },
  {
    id: 6,
    name: "load",
    start: 758,
    end: 895,
    img: "cheese/scenes/scene_06.jpg",
    hudTag: "ORDNANCE OVERRIDE // LOADING IMPROVISED SHOT",
    hudStatus: "CALIBER MATCH: 18-LB DUTCH EDAM WHEEL -> 18-POUNDER IRON CANNON BORE",
    hudColor: "#ff9d3b",
    zoomFrom: 1.06,
    zoomTo: 1.24,
    panXFrom: 2,
    panXTo: -2,
    panYFrom: 3,
    panYTo: -4,
    rotFrom: -2.0,
    rotTo: 0.5,
    particleMode: "embers",
    shakes: [
      { frame: 810, amp: 14, flash: "rgba(255, 180, 70, 0.25)" },
      { frame: 855, amp: 16, flash: "rgba(255, 180, 70, 0.30)" },
    ],
  },
  {
    id: 7,
    name: "fire",
    start: 895,
    end: 1065,
    img: "cheese/scenes/scene_07.jpg",
    hudTag: "FULL BROADSIDE // DIRECT MAST IMPACT",
    hudStatus: "12 EDAM WHEELS FIRED // ENEMY FLAGSHIP MAINMAST SNAPPED IN HALF",
    hudColor: "#ffbe3b",
    zoomFrom: 1.06,
    zoomTo: 1.22,
    panXFrom: 0,
    panXTo: -1.5,
    panYFrom: 4,
    panYTo: -6,
    rotFrom: 0,
    rotTo: -1.0,
    particleMode: "shrapnel",
    shakes: [
      { frame: 902, amp: 28, flash: "rgba(255, 200, 60, 0.65)" },
      { frame: 968, amp: 26, flash: "rgba(255, 220, 80, 0.55)" },
    ],
  },
  {
    id: 8,
    name: "luckily",
    start: 1065,
    end: 1153,
    img: "cheese/scenes/scene_08.jpg",
    hudTag: "TARGET DECK // ENEMY FLAGSHIP BELGRANO",
    hudStatus: "INITIAL ENEMY ASSESSMENT: HARMLESS DAIRY PROJECTILE",
    hudColor: "#8ce99a",
    zoomFrom: 1.04,
    zoomTo: 1.16,
    panXFrom: -1,
    panXTo: 1,
    panYFrom: 2,
    panYTo: -4,
    rotFrom: 0.4,
    rotTo: -0.4,
    particleMode: "embers",
  },
  {
    id: 9,
    name: "unluckily",
    start: 1153,
    end: 1272,
    img: "cheese/scenes/scene_09.jpg",
    hudTag: "BALLISTIC TELEMETRY // SUPERSONIC DAIRY",
    hudStatus: "MUZZLE VELOCITY: 900 MPH (1,320 FT/S) // KINETIC ENERGY: LETHAL",
    hudColor: "#ff4d4d",
    zoomFrom: 1.06,
    zoomTo: 1.25,
    panXFrom: 2,
    panXTo: -2,
    panYFrom: 2,
    panYTo: -3,
    rotFrom: 1.5,
    rotTo: -1.5,
    particleMode: "shrapnel",
    shakes: [
      { frame: 1162, amp: 20, flash: "rgba(255, 190, 60, 0.45)" },
      { frame: 1205, amp: 26, flash: "rgba(255, 90, 50, 0.50)" },
    ],
  },
  {
    id: 10,
    name: "yousee",
    start: 1272,
    end: 1441,
    img: "cheese/scenes/scene_10.jpg",
    hudTag: "MATERIALS LAB // DEHYDRATED CASEIN LATTICE",
    hudStatus: "H2O EVAPORATED AT SEA // CASEIN PROTEINS CROSS-LINKED = SOLID OAK",
    hudColor: "#4dabf7",
    zoomFrom: 1.05,
    zoomTo: 1.16,
    panXFrom: 0,
    panXTo: 0,
    panYFrom: 5,
    panYTo: -5,
    rotFrom: 0,
    rotTo: 0,
    particleMode: "science",
    scanline: true,
  },
  {
    id: 11,
    name: "fridge",
    start: 1441,
    end: 1675,
    img: "cheese/scenes/scene_11.jpg",
    hudTag: "HARDNESS TEST // STEEL KNIFE VS. CANNON IMPACT",
    hudStatus: "IMMUNE TO BLADE // SHATTERS ON CANNON IMPACT INTO HIGH-VELOCITY SHRAPNEL",
    hudColor: "#ffd43b",
    zoomFrom: 1.06,
    zoomTo: 1.18,
    panXFrom: -1,
    panXTo: 1,
    panYFrom: 6,
    panYTo: -6,
    rotFrom: -0.5,
    rotTo: 0.5,
    particleMode: "shrapnel",
    shakes: [
      { frame: 1525, amp: 14, flash: "rgba(255, 240, 150, 0.35)" },
      { frame: 1605, amp: 24, flash: "rgba(255, 200, 60, 0.50)" },
    ],
  },
  {
    id: 12,
    name: "retreat",
    start: 1675,
    end: 1816,
    img: "cheese/scenes/scene_12.jpg",
    hudTag: "PSYCHOLOGICAL WARFARE // ENEMY COMMAND PANIC",
    hudStatus: "ADMIRAL BROWN SUSPECTS SECRET EXPLOSIVE SHELL // FULL FLEET RETREAT",
    hudColor: "#ff922b",
    zoomFrom: 1.05,
    zoomTo: 1.2,
    panXFrom: 1.5,
    panXTo: -1.5,
    panYFrom: -2,
    panYTo: 3,
    rotFrom: 0.6,
    rotTo: -0.6,
    particleMode: "embers",
    shakes: [{ frame: 1685, amp: 14, flash: "rgba(255, 180, 60, 0.30)" }],
  },
  {
    id: 13,
    name: "ending",
    start: 1816,
    end: 1960,
    img: "cheese/scenes/scene_13.jpg",
    hudTag: "TACTICAL VERDICT // BATTLE OF MONTEVIDEO (1841)",
    hudStatus: "COMBAT RECORD: DUTCH EDAM CHEESE IS OFFICIALLY UNDEFEATED AT SEA",
    hudColor: "#ffd43b",
    zoomFrom: 1.18,
    zoomTo: 1.04,
    panXFrom: 0,
    panXTo: 0,
    panYFrom: -3,
    panYTo: 3,
    rotFrom: 0,
    rotTo: 0,
    particleMode: "gold",
    shakes: [{ frame: 1822, amp: 12, flash: "rgba(255, 215, 80, 0.35)" }],
  },
];

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const CheeseShort: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scene =
    SCENES.find((s) => frame >= s.start && frame < s.end) ||
    SCENES[SCENES.length - 1];

  const duration = Math.max(1, scene.end - scene.start);
  const localFrame = frame - scene.start;
  const progress = Math.min(1, Math.max(0, localFrame / duration));
  const smoothP = easeInOutCubic(progress);

  // Camera motion (Ken Burns + tilt)
  let scale = interpolate(smoothP, [0, 1], [scene.zoomFrom, scene.zoomTo]);
  let panX = interpolate(smoothP, [0, 1], [scene.panXFrom, scene.panXTo]);
  let panY = interpolate(smoothP, [0, 1], [scene.panYFrom, scene.panYTo]);
  let rot = interpolate(smoothP, [0, 1], [scene.rotFrom, scene.rotTo]);

  // Subtle handheld breathing so frame never feels static
  panX += Math.sin(frame * 0.08) * 0.35;
  panY += Math.cos(frame * 0.065) * 0.35;
  rot += Math.sin(frame * 0.05) * 0.15;

  // Whip-pan / punch-in on cut entry (first 7 frames) and exit (last 5 frames)
  let cutFlash = 0;
  if (localFrame < 7 && scene.id > 1) {
    const cutT = 1 - localFrame / 7;
    scale += cutT * 0.08;
    panX += (scene.id % 2 === 0 ? 1 : -1) * cutT * 4.5;
    cutFlash = cutT * 0.45;
  }

  // Impact camera shakes & muzzle/impact flashes
  let shakeX = 0;
  let shakeY = 0;
  let shakeRot = 0;
  let activeFlashColor = "rgba(255, 200, 80, 0)";
  let activeFlashAlpha = 0;

  if (scene.shakes) {
    for (const sh of scene.shakes) {
      const df = frame - sh.frame;
      if (df >= 0 && df < 18) {
        const decay = Math.exp(-df * 0.24);
        shakeX += Math.sin(df * 2.7) * sh.amp * decay;
        shakeY += Math.cos(df * 3.4) * sh.amp * 0.85 * decay;
        shakeRot += Math.sin(df * 2.1) * (sh.amp * 0.12) * decay;
        if (sh.flash && df < 8) {
          activeFlashColor = sh.flash;
          activeFlashAlpha = Math.max(activeFlashAlpha, (1 - df / 8) * 0.85);
        }
      }
    }
  }

  // Deterministic atmospheric particles (embers, shrapnel, cyan moisture, gold dust)
  const particles = Array.from({ length: 28 }, (_, i) => {
    const seed = i * 97.31 + scene.id * 13.7;
    const speedY =
      scene.particleMode === "shrapnel"
        ? 2.8 + (i % 5) * 0.9
        : 0.7 + (i % 4) * 0.35;
    const speedX =
      scene.particleMode === "shrapnel"
        ? ((i % 7) - 3) * 1.4
        : Math.sin(seed + frame * 0.03) * 0.4;

    const rawX = ((seed * 37) % 100) + localFrame * speedX;
    const rawY = 105 - (((seed * 53) % 100) + localFrame * speedY) % 110;
    const x = ((rawX % 100) + 100) % 100;
    const y = ((rawY % 105) + 105) % 105;
    const size =
      scene.particleMode === "shrapnel" ? 5 + (i % 4) * 3 : 3 + (i % 3) * 2.5;
    const alpha = 0.35 + 0.45 * Math.abs(Math.sin(frame * 0.12 + i));

    let color = "#ff922b";
    if (scene.particleMode === "shrapnel") color = i % 2 === 0 ? "#ffd43b" : "#ff6b35";
    if (scene.particleMode === "science") color = i % 2 === 0 ? "#4dabf7" : "#ffd43b";
    if (scene.particleMode === "gold") color = "#ffe066";

    return { x, y, size, alpha, color, isWedge: scene.particleMode === "shrapnel" && i % 2 === 0 };
  });

  // Typewriter progress for bottom tactical telemetry
  const typedChars = Math.min(
    scene.hudStatus.length,
    Math.floor(localFrame * 2.4)
  );
  const visibleStatus = scene.hudStatus.slice(0, typedChars);

  // Format timecode MM:SS:FF
  const totalSec = Math.floor(frame / fps);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const ff = String(frame % fps).padStart(2, "0");

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0d14", overflow: "hidden" }}>
      {/* Main Art-Directed Scene Layer with 2.5D Camera Transform */}
      <AbsoluteFill
        style={{
          transform: `translate(${panX}%, ${panY}%) translate(${shakeX}px, ${shakeY}px) scale(${scale}) rotate(${rot + shakeRot}deg)`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={staticFile(scene.img)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>

      {/* Optional Tactical Laser Scanline on Map / Blueprint Beats */}
      {scene.scanline && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${(localFrame * 1.4) % 100}%`,
            height: 4,
            background: `linear-gradient(90deg, transparent 0%, ${scene.hudColor} 50%, transparent 100%)`,
            boxShadow: `0 0 18px ${scene.hudColor}`,
            opacity: 0.65,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Atmospheric Particle Layer (Embers / Cheese Shrapnel / Science Ions) */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {particles.map((p, idx) => (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.isWedge ? "2px" : "50%",
              transform: p.isWedge ? `rotate(${frame * 6 + idx * 40}deg)` : undefined,
              opacity: p.alpha,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
          />
        ))}
      </AbsoluteFill>

      {/* Cinematic Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0) 55%, rgba(4,6,12,0.72) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Cannon Blast / Impact Flash Overlay */}
      {(activeFlashAlpha > 0 || cutFlash > 0) && (
        <AbsoluteFill
          style={{
            backgroundColor:
              activeFlashAlpha > 0 ? activeFlashColor : "rgba(255,245,220,0.5)",
            opacity: Math.max(activeFlashAlpha, cutFlash),
            pointerEvents: "none",
          }}
        />
      )}

      {/* Top Tactical Fiction Telemetry Header */}
      <div
        style={{
          position: "absolute",
          top: 38,
          left: 36,
          right: 36,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 18px",
          backgroundColor: "rgba(10, 14, 22, 0.82)",
          border: `1.5px solid ${scene.hudColor}`,
          borderRadius: 6,
          boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
          fontFamily: "monospace",
          letterSpacing: 1.5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: scene.hudColor,
              boxShadow: `0 0 10px ${scene.hudColor}`,
              opacity: frame % 20 < 12 ? 1 : 0.35,
            }}
          />
          <span
            style={{
              color: "#f1f5f9",
              fontSize: 19,
              fontWeight: 700,
            }}
          >
            {scene.hudTag}
          </span>
        </div>
        <span
          style={{
            color: scene.hudColor,
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {mm}:{ss}:{ff}
        </span>
      </div>

      {/* Bottom Tactical Status Readout Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 44,
          left: 36,
          right: 36,
          padding: "14px 20px",
          backgroundColor: "rgba(10, 14, 22, 0.88)",
          borderLeft: `6px solid ${scene.hudColor}`,
          borderTop: "1px solid rgba(255,255,255,0.14)",
          borderRight: "1px solid rgba(255,255,255,0.14)",
          borderBottom: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 6,
          boxShadow: "0 10px 28px rgba(0,0,0,0.75)",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            color: scene.hudColor,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 4,
          }}
        >
          TACTICAL FICTION // SCENE {String(scene.id).padStart(2, "0")}/13
        </div>
        <div
          style={{
            color: "#ffffff",
            fontSize: 21,
            fontWeight: 700,
            letterSpacing: 0.8,
            lineHeight: 1.3,
          }}
        >
          {visibleStatus}
          {localFrame % 16 < 8 ? "_" : " "}
        </div>
      </div>

      {/* Master Voiceover + Naval Drums + Cannon & Cheese SFX Mix */}
      <Audio src={staticFile("cheese/mix.mp3")} />
    </AbsoluteFill>
  );
};
