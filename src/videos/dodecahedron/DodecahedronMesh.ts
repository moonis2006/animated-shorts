import * as THREE from 'three';

/**
 * Historically authentic 3D model of the Gallo-Roman Dodecahedron.
 * Features:
 * - Exactly 12 pentagonal faces.
 * - Circular holes of varying diameters on each face (from small 12mm to large 32mm relative).
 * - Concentric engraved decorative rings around each circular hole.
 * - 20 spherical knobs at every vertex/corner.
 * - Hollow bronze interior.
 * - Aged cast bronze patina material with subtle verdigris oxidation.
 */

const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio ~1.618034
const INV_PHI = 1 / PHI;            // ~0.618034

// 20 mathematical vertices of a regular dodecahedron
function getDodecahedronVertices(scale = 1.0) {
  const raw = [
    // 8 cube corners (±1, ±1, ±1)
    [ 1,  1,  1], [ 1,  1, -1], [ 1, -1,  1], [ 1, -1, -1],
    [-1,  1,  1], [-1,  1, -1], [-1, -1,  1], [-1, -1, -1],
    // 4 rectangle 1 (0, ±phi, ±1/phi)
    [0,  PHI,  INV_PHI], [0,  PHI, -INV_PHI],
    [0, -PHI,  INV_PHI], [0, -PHI, -INV_PHI],
    // 4 rectangle 2 (±1/phi, 0, ±phi)
    [ INV_PHI, 0,  PHI], [ INV_PHI, 0, -PHI],
    [-INV_PHI, 0,  PHI], [-INV_PHI, 0, -PHI],
    // 4 rectangle 3 (±phi, ±1/phi, 0)
    [ PHI,  INV_PHI, 0], [ PHI, -INV_PHI, 0],
    [-PHI,  INV_PHI, 0], [-PHI, -INV_PHI, 0]
  ];

  const norm = Math.sqrt(3);
  return raw.map(v => new THREE.Vector3(v[0] / norm * scale, v[1] / norm * scale, v[2] / norm * scale));
}

// 12 face normal directions (vertices of the dual icosahedron)
function getFaceNormals() {
  const raw = [
    [0,  1,  PHI], [0,  1, -PHI], [0, -1,  PHI], [0, -1, -PHI],
    [ 1,  PHI, 0], [ 1, -PHI, 0], [-1,  PHI, 0], [-1, -PHI, 0],
    [ PHI, 0,  1], [ PHI, 0, -1], [-PHI, 0,  1], [-PHI, 0, -1]
  ];
  return raw.map(v => new THREE.Vector3(...v).normalize());
}

// Procedural Bronze Texture Generator
function createBronzeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base aged cast bronze tone
  ctx.fillStyle = '#6e4f2b';
  ctx.fillRect(0, 0, 512, 512);

  // Cast bronze mottled grain
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = 1 + Math.random() * 3;
    const dark = Math.random() > 0.5;
    ctx.fillStyle = dark ? 'rgba(35, 22, 10, 0.25)' : 'rgba(165, 120, 65, 0.2)';
    ctx.fillRect(x, y, s, s);
  }

  // Subtle greenish copper verdigris oxidation specks
  for (let j = 0; j < 300; j++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = 'rgba(72, 120, 95, 0.18)';
    ctx.beginPath();
    ctx.arc(x, y, 2 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createRomanDodecahedron(radius = 1.0) {
  const group = new THREE.Group();
  group.name = 'RomanDodecahedron';

  const bronzeTex = createBronzeTexture();
  const bronzeMat = new THREE.MeshStandardMaterial({
    map: bronzeTex,
    color: 0x9e7240, // rich antique bronze
    metalness: 0.82,
    roughness: 0.36
  });

  const interiorMat = new THREE.MeshStandardMaterial({
    color: 0x24180c, // dark shadowed interior
    roughness: 0.9,
    metalness: 0.5,
    side: THREE.BackSide
  });

  const verts = getDodecahedronVertices(radius);
  const faceNormals = getFaceNormals();

  // 1. Spherical knobs at all 20 vertices
  const knobGeo = new THREE.SphereGeometry(radius * 0.11, 16, 16);
  verts.forEach(v => {
    const knob = new THREE.Mesh(knobGeo, bronzeMat);
    knob.position.copy(v);
    knob.castShadow = true;
    group.add(knob);
  });

  // Differing hole radii for each of the 12 pentagonal faces
  // (historically, holes range from ~10mm to ~30mm diameter)
  const holeRatios = [
    0.20, 0.24, 0.28, 0.32,
    0.35, 0.38, 0.40, 0.43,
    0.46, 0.48, 0.50, 0.53
  ];

  const pentagonRadius = radius * 0.72;
  const faceDistance = radius * 0.85;

  // 2. Build each of the 12 hollow pentagonal faces
  faceNormals.forEach((normal, fIdx) => {
    const faceGroup = new THREE.Group();
    faceGroup.position.copy(normal).multiplyScalar(faceDistance);
    faceGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

    const holeR = pentagonRadius * holeRatios[fIdx % holeRatios.length];

    // Build pentagon with circular hole cutout
    const shape = new THREE.Shape();
    const pentagonPoints = [];
    for (let p = 0; p < 5; p++) {
      const angle = (p / 5) * Math.PI * 2 + Math.PI / 10;
      const px = Math.cos(angle) * pentagonRadius;
      const py = Math.sin(angle) * pentagonRadius;
      pentagonPoints.push(new THREE.Vector2(px, py));
      if (p === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();

    // Circular hole cutout in center
    const holePath = new THREE.Path();
    const segments = 32;
    for (let c = 0; c <= segments; c++) {
      const a = (c / segments) * Math.PI * 2;
      const hx = Math.cos(a) * holeR;
      const hy = Math.sin(a) * holeR;
      if (c === 0) holePath.moveTo(hx, hy);
      else holePath.lineTo(hx, hy);
    }
    shape.holes.push(holePath);

    // Extrude thin bronze plate thickness
    const extrudeSettings = {
      depth: radius * 0.045,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: radius * 0.012,
      bevelThickness: radius * 0.012
    };

    const faceGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    faceGeo.translate(0, 0, -extrudeSettings.depth);
    const faceMesh = new THREE.Mesh(faceGeo, bronzeMat);
    faceMesh.castShadow = true;
    faceMesh.receiveShadow = true;
    faceGroup.add(faceMesh);

    // Decorative concentric engraved bronze rings around the hole
    [holeR + radius * 0.04, holeR + radius * 0.08].forEach(ringR => {
      if (ringR < pentagonRadius * 0.88) {
        const ringGeo = new THREE.RingGeometry(ringR - radius * 0.008, ringR + radius * 0.008, 32);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x6e4a22,
          roughness: 0.5,
          metalness: 0.9
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.z = radius * 0.005;
        faceGroup.add(ring);
      }
    });

    group.add(faceGroup);
  });

  return group;
}
