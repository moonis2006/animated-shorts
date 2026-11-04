import * as THREE from 'three';
import { createRomanDodecahedron } from './DodecahedronMesh';
import { createRomanCraftsmanCard, createArchaeologistCard } from './cast';

/**
 * 3D World Manager for "The 1,700-Year-Old Roman Object Nobody Can Explain".
 * Manages geometry, lighting, and camera positions across all 7 cinematic scenes.
 */

export class DodecahedronWorld {
  root: THREE.Group;
  dodecahedronHero: THREE.Group;
  
  // Scene sub-groups
  scene1Group: THREE.Group;
  scene2Group: THREE.Group;
  scene3Group: THREE.Group;
  scene4Group: THREE.Group;
  scene5Group: THREE.Group;
  scene6Group: THREE.Group;
  scene7Group: THREE.Group;

  // Scene elements
  craftsman!: THREE.Mesh;
  benchDodecahedron!: THREE.Group;
  candleGroup!: THREE.Group;
  flameMesh!: THREE.Mesh;
  trenchGroup!: THREE.Group;
  labGroup!: THREE.Group;
  fieldArchaeologist!: THREE.Mesh;

  // Key animated lights
  spotLightHero!: THREE.SpotLight;
  forgeLight!: THREE.PointLight;
  candleLight!: THREE.PointLight;
  labLight!: THREE.DirectionalLight;

  constructor() {
    this.root = new THREE.Group();

    // 1. Hero Dodecahedron (used in Scene 1, 3, 5, 7)
    this.dodecahedronHero = createRomanDodecahedron(1.2);
    this.root.add(this.dodecahedronHero);

    // Build scene environments
    this.scene1Group = new THREE.Group();
    this.scene2Group = new THREE.Group();
    this.scene3Group = new THREE.Group();
    this.scene4Group = new THREE.Group();
    this.scene5Group = new THREE.Group();
    this.scene6Group = new THREE.Group();
    this.scene7Group = new THREE.Group();

    this.root.add(this.scene1Group);
    this.root.add(this.scene2Group);
    this.root.add(this.scene3Group);
    this.root.add(this.scene4Group);
    this.root.add(this.scene5Group);
    this.root.add(this.scene6Group);
    this.root.add(this.scene7Group);

    this.setupLighting();
    this.buildScene1Hook();
    this.buildScene2AncientRome();
    this.buildScene3Workshop();
    this.buildScene4MapTable();
    this.buildScene5Theories();
    this.buildScene6ExcavationAndLab();
  }

  setupLighting() {
    // Hero Spotlight for void shots
    this.spotLightHero = new THREE.SpotLight(0xffecd0, 3.5);
    this.spotLightHero.position.set(4, 6, 5);
    this.spotLightHero.angle = Math.PI / 6;
    this.spotLightHero.penumbra = 0.5;
    this.spotLightHero.castShadow = true;
    this.root.add(this.spotLightHero);
    this.root.add(this.spotLightHero.target);

    // Forge Firelight (Scene 3)
    this.forgeLight = new THREE.PointLight(0xff6a1a, 2.8, 16);
    this.forgeLight.position.set(-3, 2, -2);
    this.scene3Group.add(this.forgeLight);

    // Candle Light (Scene 5A)
    this.candleLight = new THREE.PointLight(0xffaa33, 2.2, 8);
    this.candleLight.position.set(0, 1.8, 0);
    this.scene5Group.add(this.candleLight);

    // Museum Lab Light (Scene 6B)
    this.labLight = new THREE.DirectionalLight(0xeef6ff, 2.5);
    this.labLight.position.set(0, 8, 2);
    this.scene6Group.add(this.labLight);

    // Base ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.25);
    this.root.add(ambient);
  }

  // SCENE 1: The Hook (0 - 7s) - Dark void, slow rotation, golden spotlight
  buildScene1Hook() {
    const count = 120;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffd188,
      size: 0.04,
      transparent: true,
      opacity: 0.6
    });
    const dust = new THREE.Points(geo, mat);
    this.scene1Group.add(dust);
  }

  // SCENE 2: Ancient Rome (7 - 15s) - Colonnades, terracotta roofs, cobblestone street
  buildScene2AncientRome() {
    const streetGeo = new THREE.PlaneGeometry(16, 60);
    streetGeo.rotateX(-Math.PI / 2);
    const streetMat = new THREE.MeshStandardMaterial({ color: 0x6e685f, roughness: 0.9 });
    const street = new THREE.Mesh(streetGeo, streetMat);
    street.position.set(0, 0, -20);
    this.scene2Group.add(street);

    const colGeo = new THREE.CylinderGeometry(0.35, 0.42, 6.0, 16);
    const capGeo = new THREE.BoxGeometry(1.0, 0.35, 1.0);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xd9ceb8, roughness: 0.85 });

    [-4.5, 4.5].forEach(sideX => {
      for (let z = 5; z > -45; z -= 4.5) {
        const col = new THREE.Mesh(colGeo, stoneMat);
        col.position.set(sideX, 3.0, z);
        col.castShadow = true;
        this.scene2Group.add(col);

        const cap = new THREE.Mesh(capGeo, stoneMat);
        cap.position.set(sideX, 6.15, z);
        this.scene2Group.add(cap);
      }

      const beamGeo = new THREE.BoxGeometry(1.1, 0.5, 55);
      const beam = new THREE.Mesh(beamGeo, stoneMat);
      beam.position.set(sideX, 6.5, -20);
      this.scene2Group.add(beam);

      const roofGeo = new THREE.BoxGeometry(3.5, 0.3, 55);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xa84c2a, roughness: 0.7 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(sideX + (sideX > 0 ? 1.5 : -1.5), 7.2, -20);
      roof.rotation.z = sideX > 0 ? -0.35 : 0.35;
      this.scene2Group.add(roof);
    });
  }

  // SCENE 3: Bronze Workshop (15 - 24s) - Forge, anvil, workbench, craftsman
  buildScene3Workshop() {
    const benchGeo = new THREE.BoxGeometry(4.5, 1.2, 2.2);
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a4339, roughness: 0.9 });
    const bench = new THREE.Mesh(benchGeo, benchMat);
    bench.position.set(0, 0.6, 0);
    this.scene3Group.add(bench);

    const forgeGeo = new THREE.BoxGeometry(3.2, 3.5, 2.2);
    const forgeMat = new THREE.MeshStandardMaterial({ color: 0x332c25, roughness: 0.95 });
    const forge = new THREE.Mesh(forgeGeo, forgeMat);
    forge.position.set(-3.2, 1.75, -2.5);
    this.scene3Group.add(forge);

    const fireGeo = new THREE.SphereGeometry(0.8, 12, 12);
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff4800 });
    const fire = new THREE.Mesh(fireGeo, fireMat);
    fire.position.set(-3.2, 1.2, -1.8);
    this.scene3Group.add(fire);

    this.craftsman = createRomanCraftsmanCard();
    this.craftsman.position.set(0.2, 0.3, -1.1);
    this.scene3Group.add(this.craftsman);

    this.benchDodecahedron = createRomanDodecahedron(0.38);
    this.benchDodecahedron.position.set(0.1, 1.45, 0.2);
    this.scene3Group.add(this.benchDodecahedron);
  }

  // SCENE 4: The Mystery Spreads (24 - 34s) - Table with multiple specimens & Empire Map
  buildScene4MapTable() {
    const tableGeo = new THREE.BoxGeometry(5.0, 0.2, 3.2);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x422d1d, roughness: 0.8 });
    const table = new THREE.Mesh(tableGeo, woodMat);
    table.position.set(0, 1.2, 0);
    this.scene4Group.add(table);

    [-1.2, 0, 1.2].forEach((tx, idx) => {
      const d = createRomanDodecahedron(0.35 + idx * 0.05);
      d.position.set(tx, 1.55 + idx * 0.04, (idx - 1) * 0.3);
      d.rotation.set(0.4 * idx, 0.6 * idx, 0.2);
      this.scene4Group.add(d);
    });

    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = 1024;
    mapCanvas.height = 768;
    const mctx = mapCanvas.getContext('2d')!;

    mctx.fillStyle = '#cfb489';
    mctx.fillRect(0, 0, 1024, 768);
    mctx.strokeStyle = '#5a3d1c';
    mctx.lineWidth = 14;
    mctx.strokeRect(20, 20, 984, 728);

    mctx.fillStyle = '#3a200e';
    mctx.font = 'bold 36px serif';
    mctx.fillText('IMPERIVM ROMANVM — GALLIA & BRITANNIA', 180, 80);

    mctx.fillStyle = '#bc9d6e';
    // Britannia
    mctx.beginPath();
    mctx.ellipse(320, 260, 120, 160, 0.4, 0, Math.PI * 2);
    mctx.fill();
    // Gaul
    mctx.beginPath();
    mctx.ellipse(480, 480, 190, 180, 0.1, 0, Math.PI * 2);
    mctx.fill();
    // Germania
    mctx.beginPath();
    mctx.ellipse(720, 420, 160, 190, -0.2, 0, Math.PI * 2);
    mctx.fill();

    const pins = [
      { name: 'Norton Disney (UK)', x: 340, y: 280 },
      { name: 'Autun (Gaul)', x: 510, y: 460 },
      { name: 'Bonn (Germania)', x: 620, y: 390 },
      { name: 'Tongeren (Belgica)', x: 560, y: 340 },
      { name: 'Aventicum (Helvetia)', x: 580, y: 520 }
    ];

    pins.forEach(pin => {
      mctx.fillStyle = '#ff3300';
      mctx.beginPath();
      mctx.arc(pin.x, pin.y, 9, 0, Math.PI * 2);
      mctx.fill();
      mctx.strokeStyle = '#ffffff';
      mctx.lineWidth = 3;
      mctx.stroke();

      mctx.fillStyle = '#221105';
      mctx.font = 'bold 18px sans-serif';
      mctx.fillText(pin.name, pin.x + 16, pin.y + 6);
    });

    const mapTex = new THREE.CanvasTexture(mapCanvas);
    const mapGeo = new THREE.PlaneGeometry(7.0, 5.2);
    const mapMat = new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.9 });
    const mapMesh = new THREE.Mesh(mapGeo, mapMat);
    mapMesh.position.set(0, 3.8, -1.8);
    this.scene4Group.add(mapMesh);
  }

  // SCENE 5: The 4 Theories (34 - 50s)
  buildScene5Theories() {
    this.candleGroup = new THREE.Group();
    const candleD = createRomanDodecahedron(0.5);
    candleD.position.set(0, 1.2, 0);
    this.candleGroup.add(candleD);

    const candleWaxGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 16);
    const candleWaxMat = new THREE.MeshStandardMaterial({ color: 0xfffae8, roughness: 0.3 });
    const candleWax = new THREE.Mesh(candleWaxGeo, candleWaxMat);
    candleWax.position.set(0, 1.85, 0);
    this.candleGroup.add(candleWax);

    const flameGeo = new THREE.ConeGeometry(0.04, 0.12, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
    this.flameMesh = new THREE.Mesh(flameGeo, flameMat);
    this.flameMesh.position.set(0, 2.34, 0);
    this.candleGroup.add(this.flameMesh);

    this.scene5Group.add(this.candleGroup);
  }

  // SCENE 6: Modern Discovery & Museum Lab (50 - 61s)
  buildScene6ExcavationAndLab() {
    this.trenchGroup = new THREE.Group();
    const dirtGeo = new THREE.PlaneGeometry(8, 8, 16, 16);
    dirtGeo.rotateX(-Math.PI / 2);
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x4a3625, roughness: 0.95 });
    const dirt = new THREE.Mesh(dirtGeo, dirtMat);
    this.trenchGroup.add(dirt);

    const buriedD = createRomanDodecahedron(0.45);
    buriedD.position.set(0, 0.12, 0);
    buriedD.rotation.set(0.4, 0.2, 0.3);
    this.trenchGroup.add(buriedD);

    this.fieldArchaeologist = createArchaeologistCard(false);
    this.fieldArchaeologist.position.set(1.2, 0, -0.6);
    this.fieldArchaeologist.scale.set(0.85, 0.85, 0.85);
    this.trenchGroup.add(this.fieldArchaeologist);

    this.scene6Group.add(this.trenchGroup);

    this.labGroup = new THREE.Group();
    this.labGroup.position.set(0, 0, 15);
    const labTableGeo = new THREE.BoxGeometry(4.5, 0.8, 2.2);
    const labTableMat = new THREE.MeshStandardMaterial({ color: 0xdde6ed, roughness: 0.2, metalness: 0.8 });
    const labTable = new THREE.Mesh(labTableGeo, labTableMat);
    labTable.position.set(0, 0.4, 0);
    this.labGroup.add(labTable);

    const pristineD = createRomanDodecahedron(0.45);
    pristineD.position.set(0, 1.1, 0);
    this.labGroup.add(pristineD);

    const labScientist = createArchaeologistCard(true);
    labScientist.position.set(0, 0.2, -0.9);
    this.labGroup.add(labScientist);

    this.scene6Group.add(this.labGroup);
  }

  update(frame: number, camera: THREE.PerspectiveCamera) {
    const t = frame / 30.0;

    this.scene1Group.visible = false;
    this.scene2Group.visible = false;
    this.scene3Group.visible = false;
    this.scene4Group.visible = false;
    this.scene5Group.visible = false;
    this.scene6Group.visible = false;
    this.scene7Group.visible = false;
    this.dodecahedronHero.visible = false;

    if (t < 7.0) {
      // SCENE 1: The Hook (0 - 7s)
      this.scene1Group.visible = true;
      this.dodecahedronHero.visible = true;
      this.dodecahedronHero.position.set(0, 0, 0);
      this.dodecahedronHero.rotation.y = t * 0.45;
      this.dodecahedronHero.rotation.x = Math.sin(t * 0.3) * 0.25;

      this.spotLightHero.position.set(3, 4, 4);
      this.spotLightHero.target.position.set(0, 0, 0);

      const zoom = 5.2 - (t / 7.0) * 1.8;
      camera.position.set(0, 0.4, zoom);
      camera.lookAt(0, 0, 0);

    } else if (t < 15.0) {
      // SCENE 2: Ancient Rome (7 - 15s)
      this.scene2Group.visible = true;
      const s2Progress = (t - 7.0) / 8.0;

      const camZ = 8.0 - s2Progress * 26.0;
      camera.position.set(0.5, 2.4, camZ);
      camera.lookAt(0, 2.2, camZ - 8.0);

    } else if (t < 24.0) {
      // SCENE 3: Bronze Workshop (15 - 24s)
      this.scene3Group.visible = true;
      const s3Progress = (t - 15.0) / 9.0;

      this.forgeLight.intensity = 2.4 + Math.sin(t * 14) * 0.4 + Math.cos(t * 22) * 0.25;

      if (this.benchDodecahedron) {
        this.benchDodecahedron.rotation.y = t * 0.8;
        this.benchDodecahedron.rotation.x = Math.sin(t * 0.5) * 0.3;
      }

      const camAngle = s3Progress * Math.PI * 0.6;
      camera.position.set(Math.sin(camAngle) * 2.2, 1.9, Math.cos(camAngle) * 2.2);
      camera.lookAt(0.1, 1.45, 0.2);

    } else if (t < 34.0) {
      // SCENE 4: The Mystery Spreads (24 - 34s)
      this.scene4Group.visible = true;
      const s4Progress = (t - 24.0) / 10.0;

      if (s4Progress < 0.4) {
        camera.position.set(0, 2.5, 3.2);
        camera.lookAt(0, 1.5, 0);
      } else {
        const mapBlend = (s4Progress - 0.4) / 0.6;
        camera.position.set(0, 2.5 + mapBlend * 1.3, 3.2 - mapBlend * 0.8);
        camera.lookAt(0, 3.8, -1.8);
      }

    } else if (t < 50.0) {
      // SCENE 5: The 4 Theories (34 - 50s)
      this.scene5Group.visible = true;

      if (this.flameMesh) {
        this.flameMesh.scale.set(
          1 + Math.sin(t * 24) * 0.15,
          1 + Math.cos(t * 18) * 0.2,
          1
        );
      }

      camera.position.set(Math.sin(t * 0.6) * 1.8, 1.8, Math.cos(t * 0.6) * 1.8);
      camera.lookAt(0, 1.4, 0);

    } else if (t < 61.0) {
      // SCENE 6: Modern Discovery (50 - 61s)
      this.scene6Group.visible = true;
      const s6Progress = (t - 50.0) / 11.0;

      if (s6Progress < 0.55) {
        this.trenchGroup.visible = true;
        this.labGroup.visible = false;
        camera.position.set(0.8, 1.6, 1.8);
        camera.lookAt(0, 0.12, 0);
      } else {
        this.trenchGroup.visible = false;
        this.labGroup.visible = true;
        camera.position.set(0, 1.8, 17.6);
        camera.lookAt(0, 1.1, 15);
      }

    } else {
      // SCENE 7: The Ending (61 - 71s)
      this.scene7Group.visible = true;
      this.dodecahedronHero.visible = true;
      const s7Progress = (t - 61.0) / 10.0;

      this.dodecahedronHero.position.set(0, 0, 0);
      this.dodecahedronHero.rotation.y = t * 0.35;
      this.dodecahedronHero.rotation.z = Math.sin(t * 0.4) * 0.2;

      this.spotLightHero.position.set(0, 0.2, -4);
      this.spotLightHero.target.position.set(0, 0, 0);
      this.spotLightHero.angle = Math.PI / 12;

      const orbitAngle = s7Progress * Math.PI * 1.5;
      camera.position.set(Math.sin(orbitAngle) * 3.6, 0.6, Math.cos(orbitAngle) * 3.6);
      camera.lookAt(0, 0, 0);
    }
  }
}
