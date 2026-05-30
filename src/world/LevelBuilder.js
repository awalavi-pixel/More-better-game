class LevelBuilder {
  constructor(scene, assets) {
    this.scene = scene;
    this.assets = assets;
    this.colliders = [];
    this.interactables = [];
    this.lights = [];
  }

  _box(w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  _collidable(mesh) {
    this.colliders.push(mesh);
    return mesh;
  }

  _addLight(color, intensity, x, y, z, dist = 15) {
    const light = new THREE.PointLight(color, intensity, dist);
    light.position.set(x, y, z);
    this.scene.add(light);
    this.lights.push(light);
    return light;
  }

  _addSpotlight(color, intensity, x, y, z, tx, ty, tz) {
    const light = new THREE.SpotLight(color, intensity);
    light.position.set(x, y, z);
    light.target.position.set(tx, ty, tz);
    light.angle = 0.5;
    light.penumbra = 0.3;
    light.castShadow = true;
    this.scene.add(light);
    this.scene.add(light.target);
    this.lights.push(light);
    return light;
  }

  buildChapter1(assets) {
    this.colliders = [];
    this.interactables = [];
    const mat = {
      asphalt: assets.getMaterial('asphalt'),
      concrete: assets.getMaterial('concrete'),
      metal: assets.getMaterial('metal'),
      brick: assets.getMaterial('brick'),
    };

    const fog = new THREE.FogExp2(0x1a2030, 0.018);
    this.scene.fog = fog;
    this.scene.background = new THREE.Color(0x1a2030);

    const ambLight = new THREE.AmbientLight(0x334455, 0.4);
    this.scene.add(ambLight);
    const sunLight = new THREE.DirectionalLight(0xff9966, 0.8);
    sunLight.position.set(10, 20, 5);
    sunLight.castShadow = true;
    this.scene.add(sunLight);

    const ground = this._box(120, 0.2, 120, mat.asphalt, 0, -0.1, 0);
    this._collidable(ground);

    const sidewalk = this._box(120, 0.3, 10, mat.concrete, 0, 0.05, -25);
    this._collidable(sidewalk);

    for (let i = -5; i <= 5; i++) {
      const building = this._box(12, 20 + Math.random() * 15, 12, mat.concrete, i * 14, 10 + Math.random() * 7, -35);
      this._collidable(building);
      this._addNeonSign(i * 14, 15 + Math.random() * 5, -29, Math.random() > 0.5);

      const b2 = this._box(12, 15 + Math.random() * 10, 12, mat.concrete, i * 14, 7, 35);
      this._collidable(b2);

      if (Math.random() > 0.4) {
        const window1 = new THREE.Mesh(
          new THREE.BoxGeometry(2, 2, 0.1),
          new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xffcc88 : 0x334455 })
        );
        window1.position.set(i * 14 + 3, 8 + Math.random() * 8, -29);
        this.scene.add(window1);
      }
    }

    for (let i = -4; i <= 4; i++) {
      const x = i * 10;
      this._addBarricade(x, 0, -10, mat);
      if (Math.abs(i) > 1) this._addBarricade(x + 4, 0, -8, mat);
    }

    for (let i = -3; i <= 3; i++) {
      this._addBurningVehicle(i * 15, 0, 5 + (Math.random()-0.5)*4, mat);
    }

    for (let z = -20; z <= 20; z += 8) {
      for (let x = -50; x <= 50; x += 20) {
        if (Math.random() > 0.4) this._addDebrisPile(x + (Math.random()-0.5)*5, 0, z + (Math.random()-0.5)*3, mat);
      }
    }

    this._buildAlley(-35, 20, mat);
    this._buildAlley(35, 20, mat);

    const wallMat = assets.getMaterial('concrete');
    const wallN = this._box(100, 5, 1, wallMat, 0, 2.5, -50);
    this._collidable(wallN);
    const wallS = this._box(100, 5, 1, wallMat, 0, 2.5, 50);
    this._collidable(wallS);

    this._addCheckpoint(-30, 0, -15, mat);
    this._addCheckpoint(0, 0, -15, mat);
    this._addCheckpoint(30, 0, -15, mat);

    this._addExtractionVehicle(0, 0, 40);

    this._addDroneSwarm(-10, 12, 0);
    this._addDroneSwarm(15, 10, -8);

    this._addFloodlight(-20, 8, -20, 0, 0, -20);
    this._addFloodlight(20, 8, -20, 0, 0, -20);

    this._addLight(0xff4400, 2, -5, 3, 5, 8);
    this._addLight(0xff4400, 2, 15, 3, 3, 8);
    this._addLight(0xff6600, 1.5, 0, 4, -8, 10);
    this._addLight(0x0088ff, 1, -30, 8, -10, 12);

    const coverPoints = [];
    for (let i = -4; i <= 4; i++) {
      coverPoints.push(new THREE.Vector3(i * 10, 0, -10));
      coverPoints.push(new THREE.Vector3(i * 10 + 5, 0, -5));
    }

    return { colliders: this.colliders, coverPoints, interactables: this.interactables };
  }

  buildChapter2(assets) {
    this.colliders = [];
    this.interactables = [];

    const mat = {
      concrete: assets.getMaterial('concrete'),
      metal: assets.getMaterial('metal'),
      grass: assets.getMaterial('grass'),
      sand: assets.getMaterial('sand'),
    };

    this.scene.fog = new THREE.FogExp2(0x050810, 0.02);
    this.scene.background = new THREE.Color(0x050810);

    const ambLight = new THREE.AmbientLight(0x001122, 0.25);
    this.scene.add(ambLight);
    const moonLight = new THREE.DirectionalLight(0x3344aa, 0.3);
    moonLight.position.set(-5, 20, 10);
    this.scene.add(moonLight);

    const ground = this._box(100, 0.2, 100, mat.grass, 0, -0.1, 0);
    this._collidable(ground);

    for (let i = -4; i <= 4; i++) {
      const fence = this._box(0.1, 2.5, 100, mat.metal, i * 12.5, 1.25, 0);
      if (i === -4 || i === 4) this._collidable(fence);
    }

    this._buildFence(mat);

    const mainBuilding = this._box(30, 8, 20, mat.concrete, 0, 4, -20);
    this._collidable(mainBuilding);
    this._addSecurityCamera(5, 8, -10, 0, 1, 0);
    this._addSecurityCamera(-5, 8, -10, 0, -1, 0);

    const serverRoom = this._box(10, 6, 10, mat.metal, 8, 3, -20);
    this._collidable(serverRoom);
    const terminal = this._addHackTerminal(8, 0.5, -15);
    this.interactables.push({ type: 'hack_terminal', mesh: terminal, id: 'server_room', hacked: false, position: new THREE.Vector3(8, 0.5, -15) });

    const secondBuilding = this._box(20, 6, 15, mat.concrete, -15, 3, 5);
    this._collidable(secondBuilding);
    const terminal2 = this._addHackTerminal(-15, 0.5, 0);
    this.interactables.push({ type: 'hack_terminal', mesh: terminal2, id: 'comms_tower', hacked: false, position: new THREE.Vector3(-15, 0.5, 0) });

    for (let i = -2; i <= 2; i++) {
      const tower = this._buildGuardTower(i * 20, 0, -45, mat);
      this._collidable(tower);
    }

    const searchlights = [
      { pos: [-30, 12, -20], target: [0, 0, -10] },
      { pos: [30, 12, -20], target: [0, 0, -10] },
      { pos: [0, 12, 35], target: [0, 0, 0] },
    ];
    searchlights.forEach(sl => {
      this._addSearchlight(sl.pos[0], sl.pos[1], sl.pos[2], sl.target[0], sl.target[1], sl.target[2]);
    });

    this._addLight(0x0044ff, 0.5, -5, 3, -20, 10);
    this._addLight(0x0044ff, 0.5, 10, 3, -20, 10);
    this._addLight(0x002244, 0.3, 0, 2, 0, 15);

    for (let i = 0; i < 8; i++) {
      const x = (Math.random()-0.5)*60;
      const z = (Math.random()-0.5)*60;
      this._addCrate(x, 0, z, mat.metal);
    }

    const extractGate = this._buildExtractionGate(0, 0, 40, mat);

    const coverPoints = [];
    for (let x = -20; x <= 20; x += 8) {
      for (let z = -30; z <= 30; z += 8) {
        coverPoints.push(new THREE.Vector3(x, 0, z));
      }
    }

    return { colliders: this.colliders, coverPoints, interactables: this.interactables };
  }

  _addNeonSign(x, y, z, cyan) {
    const color = cyan ? 0x00f5ff : 0xff2244;
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.8, 0.1),
      new THREE.MeshBasicMaterial({ color })
    );
    sign.position.set(x, y, z);
    this.scene.add(sign);

    const light = new THREE.PointLight(color, 1.5, 6);
    light.position.set(x, y, z);
    this.scene.add(light);
  }

  _addBarricade(x, y, z, mat) {
    const con = this._box(2.5, 1.2, 0.6, mat.concrete, x, y + 0.6, z);
    this._collidable(con);
    const top = this._box(2.6, 0.3, 0.7, mat.metal, x, y + 1.35, z);
    this._collidable(top);

    for (let i = 0; i < 3; i++) {
      const bag = this._box(0.7, 0.4, 0.5, mat.concrete, x + (i-1)*0.75, y + 1.6, z);
      bag.material = new THREE.MeshLambertMaterial({ color: 0x556644 });
      this._collidable(bag);
    }
  }

  _addBurningVehicle(x, y, z, mat) {
    const body = this._box(4.5, 1.4, 2, mat.metal, x, y + 0.7, z);
    body.material = new THREE.MeshLambertMaterial({ color: 0x222222 });
    this._collidable(body);

    const cabin = this._box(2.5, 1.0, 1.9, mat.metal, x - 0.3, y + 1.8, z);
    cabin.material = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    this._collidable(cabin);

    body.rotation.y = (Math.random() - 0.5) * 0.5;

    const fireLight = new THREE.PointLight(0xff4400, 3, 8);
    fireLight.position.set(x, y + 2, z);
    this.scene.add(fireLight);

    const geo = new THREE.SphereGeometry(0.3 + Math.random()*0.3, 6, 6);
    const mat2 = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.7 });
    const flame = new THREE.Mesh(geo, mat2);
    flame.position.set(x, y + 2, z);
    this.scene.add(flame);

    let t = 0;
    const animate = () => {
      t += 0.05;
      flame.scale.setScalar(0.8 + Math.sin(t * 3) * 0.2);
      flame.position.y = y + 2 + Math.sin(t * 2) * 0.1;
      mat2.opacity = 0.5 + Math.random() * 0.3;
      fireLight.intensity = 2 + Math.random() * 2;
      requestAnimationFrame(animate);
    };
    animate();
  }

  _addDebrisPile(x, y, z, mat) {
    for (let i = 0; i < 4; i++) {
      const piece = this._box(
        0.3 + Math.random(),
        0.2 + Math.random() * 0.5,
        0.3 + Math.random(),
        mat.concrete,
        x + (Math.random()-0.5)*1.5,
        y + Math.random() * 0.3,
        z + (Math.random()-0.5)*1.5
      );
      piece.rotation.y = Math.random() * Math.PI;
      piece.rotation.z = (Math.random()-0.5) * 0.3;
    }
  }

  _buildAlley(x, len, mat) {
    const wall1 = this._box(1, 8, len, mat.brick, x - 3, 4, 0);
    const wall2 = this._box(1, 8, len, mat.brick, x + 3, 4, 0);
    this._collidable(wall1);
    this._collidable(wall2);
    const ground = this._box(6, 0.1, len, mat.asphalt, x, 0, 0);

    for (let z = -len/2; z < len/2; z += 4) {
      if (Math.random() > 0.4) {
        this._addLight(0xffaa00, 1, x, 6, z, 8);
      }
      if (Math.random() > 0.5) {
        this._addDebrisPile(x + (Math.random()-0.5)*4, 0, z, mat);
      }
    }
  }

  _addCheckpoint(x, y, z, mat) {
    const base = this._box(6, 0.2, 3, mat.metal, x, y + 0.1, z);
    const arch = this._box(0.2, 3, 3, mat.metal, x - 3, y + 1.5, z);
    const arch2 = this._box(0.2, 3, 3, mat.metal, x + 3, y + 1.5, z);
    const top = this._box(6.2, 0.2, 3, mat.metal, x, y + 3, z);
    this._collidable(arch);
    this._collidable(arch2);

    const light = new THREE.PointLight(0xff2244, 2, 6);
    light.position.set(x, y + 2.5, z);
    this.scene.add(light);

    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2244 })
    );
    gem.position.set(x, y + 3.2, z);
    this.scene.add(gem);
  }

  _addExtractionVehicle(x, y, z) {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(5, 2, 10),
      new THREE.MeshLambertMaterial({ color: 0x334433 })
    );
    body.position.set(x, y + 1, z);
    this.scene.add(body);
    this._collidable(body);

    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 1.5, 4),
      new THREE.MeshLambertMaterial({ color: 0x2a3a2a })
    );
    cab.position.set(x, y + 2.3, z + 2);
    this.scene.add(cab);

    const xLight = new THREE.PointLight(0x00ff88, 3, 10);
    xLight.position.set(x, y + 3, z);
    this.scene.add(xLight);
    this.lights.push(xLight);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    sign.position.set(x, y + 3.5, z + 5.1);
    this.scene.add(sign);
    this.interactables.push({ type: 'extraction', mesh: body, position: new THREE.Vector3(x, y, z) });
  }

  _addDroneSwarm(x, y, z) {
    for (let i = 0; i < 3; i++) {
      const drone = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.15, 0.4),
        new THREE.MeshLambertMaterial({ color: 0x222233 })
      );
      drone.add(body);

      for (let j = 0; j < 4; j++) {
        const propGeo = new THREE.BoxGeometry(0.3, 0.02, 0.05);
        const prop = new THREE.Mesh(propGeo, new THREE.MeshLambertMaterial({ color: 0x111111 }));
        prop.position.set(
          (j < 2 ? -1 : 1) * 0.25,
          0.05,
          (j % 2 === 0 ? -1 : 1) * 0.25
        );
        drone.add(prop);
      }

      const light = new THREE.PointLight(0xff2244, 1, 3);
      light.position.y = -0.1;
      drone.add(light);

      drone.position.set(x + (Math.random()-0.5)*4, y, z + (Math.random()-0.5)*4);
      this.scene.add(drone);

      let t = Math.random() * Math.PI * 2;
      const baseY = y;
      const radius = 3 + Math.random() * 3;
      const centerX = x;
      const centerZ = z;
      const animate = () => {
        t += 0.005 + Math.random() * 0.003;
        drone.position.x = centerX + Math.cos(t) * radius;
        drone.position.z = centerZ + Math.sin(t) * radius;
        drone.position.y = baseY + Math.sin(t * 2) * 0.5;
        drone.rotation.y = t;
        drone.children.forEach(c => {
          if (c.isGroup || c.type === 'PointLight') return;
        });
        requestAnimationFrame(animate);
      };
      animate();
    }
  }

  _addFloodlight(x, y, z, tx, ty, tz) {
    const pole = this._box(0.1, y, 0.1, this.assets ? this.assets.getMaterial('metal') : new THREE.MeshLambertMaterial({ color: 0x555555 }), x, y/2, z);
    const light = new THREE.SpotLight(0xffffff, 3);
    light.position.set(x, y, z);
    light.target.position.set(tx, ty, tz);
    light.angle = 0.6;
    light.penumbra = 0.3;
    light.castShadow = true;
    this.scene.add(light);
    this.scene.add(light.target);
    this.lights.push(light);

    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.2, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    housing.position.set(x, y, z);
    this.scene.add(housing);
  }

  _addCrate(x, y, z, mat) {
    const crate = this._box(1, 1, 1, mat, x, y + 0.5, z);
    crate.material = new THREE.MeshLambertMaterial({ color: 0x5a4a2a });
    this._collidable(crate);
    if (Math.random() > 0.5) {
      const crate2 = this._box(1, 1, 1, crate.material.clone(), x + (Math.random()-0.5), y + 1.5, z + (Math.random()-0.5));
      this._collidable(crate2);
    }
  }

  _buildFence(mat) {
    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x445544 });
    const sides = [
      { x: 0, z: -50, w: 100, d: 0.2, ry: 0 },
      { x: 0, z: 50, w: 100, d: 0.2, ry: 0 },
      { x: -50, z: 0, w: 0.2, d: 100, ry: 0 },
      { x: 50, z: 0, w: 0.2, d: 100, ry: 0 },
    ];
    sides.forEach(s => {
      const f = this._box(s.w, 2.5, s.d, fenceMat, s.x, 1.25, s.z);
      this._collidable(f);
    });
  }

  _buildGuardTower(x, y, z, mat) {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 4), mat.concrete);
    base.position.set(x, y + 0.15, z);
    this.scene.add(base);

    for (let i = 0; i < 4; i++) {
      const legX = x + ((i < 2) ? -1.5 : 1.5);
      const legZ = z + ((i % 2 === 0) ? -1.5 : 1.5);
      const leg = this._box(0.2, 6, 0.2, mat.metal, legX, y + 3, legZ);
      this._collidable(leg);
    }

    const platform = this._box(5, 0.3, 5, mat.metal, x, y + 6, z);
    this._collidable(platform);

    const wall = this._box(4.8, 1, 4.8, mat.concrete, x, y + 6.7, z);
    this._collidable(wall);

    const light = new THREE.PointLight(0xffffff, 1.5, 12);
    light.position.set(x, y + 7.5, z);
    this.scene.add(light);
    this.lights.push(light);

    return base;
  }

  _addHackTerminal(x, y, z) {
    const geo = new THREE.BoxGeometry(0.6, 1.2, 0.3);
    const mat = new THREE.MeshLambertMaterial({ color: 0x112233 });
    const terminal = new THREE.Mesh(geo, mat);
    terminal.position.set(x, y + 0.6, z);
    this.scene.add(terminal);

    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    screen.position.set(x, y + 0.9, z + 0.16);
    this.scene.add(screen);

    const light = new THREE.PointLight(0x00ff88, 1, 3);
    light.position.set(x, y + 0.9, z);
    this.scene.add(light);
    this.lights.push(light);

    terminal.userData.isTerminal = true;
    return terminal;
  }

  _addSearchlight(x, y, z, tx, ty, tz) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, y, 6),
      new THREE.MeshLambertMaterial({ color: 0x555555 })
    );
    pole.position.set(x, y/2, z);
    this.scene.add(pole);

    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 0.4, 8),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    head.position.set(x, y + 0.2, z);
    head.rotation.x = Math.PI / 2;
    this.scene.add(head);

    const spot = new THREE.SpotLight(0xffffff, 4);
    spot.position.set(x, y, z);
    spot.target.position.set(tx, ty, tz);
    spot.angle = 0.25;
    spot.penumbra = 0.2;
    spot.castShadow = true;
    this.scene.add(spot);
    this.scene.add(spot.target);
    this.lights.push(spot);

    let t = Math.random() * Math.PI * 2;
    const origTx = tx, origTz = tz, sweep = 15;
    const animateSpot = () => {
      t += 0.003;
      spot.target.position.x = origTx + Math.sin(t) * sweep;
      spot.target.position.z = origTz + Math.cos(t * 0.5) * 5;
      requestAnimationFrame(animateSpot);
    };
    animateSpot();
  }

  _addSecurityCamera(x, y, z, dx, dy, dz) {
    const cam = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.2, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    cam.position.set(x, y, z);
    this.scene.add(cam);

    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    lens.position.set(x + dx * 0.25, y, z + dz * 0.25);
    this.scene.add(lens);

    let t = 0;
    const animateCam = () => {
      t += 0.005;
      cam.rotation.y = Math.sin(t) * 0.6;
      lens.position.x = x + Math.sin(t) * 0.3 * dx;
      requestAnimationFrame(animateCam);
    };
    animateCam();

    this.interactables.push({ type: 'camera', mesh: cam, disabled: false, position: new THREE.Vector3(x, y, z) });
  }

  _buildExtractionGate(x, y, z, mat) {
    const gatePost1 = this._box(0.3, 4, 0.3, mat.metal, x - 3, y + 2, z);
    const gatePost2 = this._box(0.3, 4, 0.3, mat.metal, x + 3, y + 2, z);
    const gateTop = this._box(6.3, 0.3, 0.3, mat.metal, x, y + 4.1, z);
    this._collidable(gatePost1);
    this._collidable(gatePost2);

    const gateLight = new THREE.PointLight(0x00ff88, 2, 8);
    gateLight.position.set(x, y + 4, z);
    this.scene.add(gateLight);
    this.lights.push(gateLight);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(4, 1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    );
    sign.position.set(x, y + 5, z);
    this.scene.add(sign);

    return { position: new THREE.Vector3(x, y, z) };
  }

  clear() {
    this.lights.forEach(l => this.scene.remove(l));
    this.lights = [];
    this.colliders = [];
    this.interactables = [];
  }
}

window.LevelBuilder = LevelBuilder;
