import * as THREE from 'three';

/**
 * Character billboards for the Roman Dodecahedron documentary:
 * 1. Roman Craftsman (Middle-aged Roman man, short dark hair, rough brown tunic, leather apron)
 * 2. Modern Archaeologists (Field researchers in neutral excavation gear and lab coats)
 */

function makeCanvas(w = 512, h = 640) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

// 1. Roman Bronze Craftsman Card
export function createRomanCraftsmanCard() {
  const canvas = makeCanvas(512, 640);
  const ctx = canvas.getContext('2d')!;
  const ink = '#1c131d'; // plum dark ink outline

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = 256;
  const cy = 320;

  // Legs / Calves with Roman leather sandals (caligae)
  ctx.fillStyle = '#c9966b';
  [-30, 30].forEach(lx => {
    ctx.fillRect(cx + lx - 10, cy + 140, 20, 90);
    // Sandal straps
    ctx.strokeStyle = '#3a2518';
    ctx.lineWidth = 4;
    for (let s = 0; s < 4; s++) {
      ctx.beginPath();
      ctx.moveTo(cx + lx - 11, cy + 155 + s * 16);
      ctx.lineTo(cx + lx + 11, cy + 150 + s * 16);
      ctx.stroke();
    }
  });

  // Rough Earthy Brown Tunic
  ctx.fillStyle = '#6e4f35';
  ctx.beginPath();
  ctx.moveTo(cx - 70, cy - 20);
  ctx.lineTo(cx + 70, cy - 20);
  ctx.lineTo(cx + 80, cy + 150);
  ctx.lineTo(cx - 80, cy + 150);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Heavy Leather Workshop Apron
  ctx.fillStyle = '#422818';
  ctx.beginPath();
  ctx.moveTo(cx - 45, cy + 10);
  ctx.lineTo(cx + 45, cy + 10);
  ctx.lineTo(cx + 52, cy + 140);
  ctx.lineTo(cx - 52, cy + 140);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Leather apron shoulder straps
  ctx.strokeStyle = '#2d1a0e';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx - 45, cy + 10);
  ctx.lineTo(cx - 35, cy - 30);
  ctx.moveTo(cx + 45, cy + 10);
  ctx.lineTo(cx + 35, cy - 30);
  ctx.stroke();

  // Arms holding / examining the dodecahedron
  ctx.strokeStyle = '#c9966b'; // tanned skin
  ctx.lineWidth = 24;
  // Left arm bending forward
  ctx.beginPath();
  ctx.moveTo(cx - 65, cy - 10);
  ctx.lineTo(cx - 35, cy + 65);
  ctx.lineTo(cx - 10, cy + 50);
  ctx.stroke();
  // Right arm holding bronze tool / tongs
  ctx.beginPath();
  ctx.moveTo(cx + 65, cy - 10);
  ctx.lineTo(cx + 40, cy + 60);
  ctx.lineTo(cx + 10, cy + 50);
  ctx.stroke();

  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Head (Middle-aged Roman features)
  const headY = cy - 80;
  ctx.fillStyle = '#c9966b';
  ctx.beginPath();
  ctx.ellipse(cx, headY, 52, 60, 0, 0, Math.PI * 2);
  ctx.fill();

  // Short dark Roman cropped hair
  ctx.fillStyle = '#261b17';
  ctx.beginPath();
  ctx.arc(cx, headY - 14, 55, Math.PI * 0.9, Math.PI * 2.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Hair curls on forehead (classical Roman style)
  for (let c = -30; c <= 30; c += 15) {
    ctx.beginPath();
    ctx.arc(cx + c, headY - 38, 8, 0, Math.PI);
    ctx.stroke();
  }

  // Head outline
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(cx, headY, 52, 60, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Expressive focused eyes
  ctx.fillStyle = ink;
  [-16, 16].forEach(ex => {
    ctx.beginPath();
    ctx.ellipse(cx + ex, headY - 6, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Nose and furrowed brow
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, headY - 18);
  ctx.lineTo(cx - 4, headY + 8);
  ctx.lineTo(cx + 3, headY + 8);
  ctx.stroke();

  // Focused mouth
  ctx.beginPath();
  ctx.arc(cx, headY + 24, 10, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.05,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.0), mat);
  mesh.position.y = 1.0;
  return mesh;
}

// 2. Modern Archaeologist Card (Norton Disney Excavation & Lab)
export function createArchaeologistCard(isLab = false) {
  const canvas = makeCanvas(512, 640);
  const ctx = canvas.getContext('2d')!;
  const ink = '#151b22';

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = 256;
  const cy = 320;

  // Legs / Cargo pants
  ctx.fillStyle = isLab ? '#2c3e50' : '#4b553d'; // olive field pants
  [-25, 25].forEach(lx => {
    ctx.fillRect(cx + lx - 12, cy + 120, 24, 110);
  });
  // Boots
  ctx.fillStyle = '#221914';
  [-25, 25].forEach(lx => {
    ctx.beginPath();
    ctx.ellipse(cx + lx, cy + 230, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Upper Body
  if (isLab) {
    // White museum laboratory coat
    ctx.fillStyle = '#f1f5f9';
  } else {
    // Neutral khaki field utility vest over long sleeves
    ctx.fillStyle = '#a89478';
  }
  ctx.beginPath();
  ctx.roundRect(cx - 60, cy - 20, 120, 150, [15, 15, 6, 6]);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Field vest pockets
  if (!isLab) {
    ctx.fillStyle = '#8f7b60';
    [[-40, 20], [20, 20], [-40, 75], [20, 75]].forEach(([px, py]) => {
      ctx.beginPath();
      ctx.roundRect(cx + px, cy + py, 32, 34, 4);
      ctx.fill();
      ctx.stroke();
    });
  }

  // Arms holding excavation brush or lab magnifying loupe
  ctx.strokeStyle = isLab ? '#e2e8f0' : '#8f7b60';
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(cx - 55, cy - 5);
  ctx.lineTo(cx - 30, cy + 60);
  ctx.lineTo(cx - 5, cy + 50);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 55, cy - 5);
  ctx.lineTo(cx + 35, cy + 65);
  ctx.lineTo(cx + 10, cy + 50);
  ctx.stroke();

  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Head
  const headY = cy - 80;
  ctx.fillStyle = '#fad5b0';
  ctx.beginPath();
  ctx.ellipse(cx, headY, 50, 58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Hair
  ctx.fillStyle = '#4a3424';
  ctx.beginPath();
  ctx.arc(cx, headY - 12, 54, Math.PI * 0.9, Math.PI * 2.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glasses (archaeologist loupe / glasses)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  [-16, 16].forEach(ex => {
    ctx.beginPath();
    ctx.arc(cx + ex, headY - 4, 11, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(cx - 5, headY - 4);
  ctx.lineTo(cx + 5, headY - 4);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.05,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.0), mat);
  mesh.position.y = 1.0;
  return mesh;
}
