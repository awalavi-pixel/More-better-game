class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = 500;
  }

  _spawn(config) {
    if (this.particles.length >= this.maxParticles) {
      const old = this.particles.shift();
      this.scene.remove(old.mesh);
    }
    const geo = new THREE.SphereGeometry(config.size || 0.05, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: config.color || 0xffffff });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(config.position);
    this.scene.add(mesh);
    this.particles.push({
      mesh,
      velocity: config.velocity || new THREE.Vector3(0, 0, 0),
      life: config.life || 0.5,
      maxLife: config.life || 0.5,
      gravity: config.gravity !== undefined ? config.gravity : 9.8,
      fade: config.fade !== undefined ? config.fade : true,
      scale: config.scaleDown || false
    });
  }

  spawnMuzzleFlash(position, direction) {
    for (let i = 0; i < 8; i++) {
      const vel = direction.clone().multiplyScalar(Math.random() * 3 + 1);
      vel.x += (Math.random() - 0.5) * 2;
      vel.y += (Math.random() - 0.5) * 2;
      vel.z += (Math.random() - 0.5) * 2;
      this._spawn({
        position: position.clone(),
        velocity: vel,
        color: i < 4 ? 0xffaa22 : 0xffff88,
        size: Math.random() * 0.04 + 0.02,
        life: 0.08 + Math.random() * 0.05,
        gravity: 0
      });
    }
    const geo = new THREE.SphereGeometry(0.15, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.8 });
    const flash = new THREE.Mesh(geo, mat);
    flash.position.copy(position);
    this.scene.add(flash);
    setTimeout(() => this.scene.remove(flash), 60);
  }

  spawnBlood(position, normal) {
    for (let i = 0; i < 12; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3,
        (Math.random() - 0.5) * 4
      );
      if (normal) vel.add(normal.clone().multiplyScalar(2));
      this._spawn({
        position: position.clone().add(new THREE.Vector3((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2)),
        velocity: vel,
        color: 0xcc1111,
        size: Math.random() * 0.06 + 0.02,
        life: 0.3 + Math.random() * 0.3,
        gravity: 15
      });
    }
  }

  spawnSparks(position) {
    for (let i = 0; i < 10; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 6
      );
      this._spawn({
        position: position.clone(),
        velocity: vel,
        color: Math.random() > 0.5 ? 0xffcc00 : 0xff8800,
        size: 0.02 + Math.random() * 0.03,
        life: 0.2 + Math.random() * 0.3,
        gravity: 20
      });
    }
  }

  spawnExplosion(position) {
    for (let i = 0; i < 30; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 12
      );
      this._spawn({
        position: position.clone().add(new THREE.Vector3((Math.random()-0.5)*0.5, 0, (Math.random()-0.5)*0.5)),
        velocity: vel,
        color: Math.random() > 0.5 ? 0xff4400 : 0xff8800,
        size: Math.random() * 0.15 + 0.05,
        life: 0.4 + Math.random() * 0.6,
        gravity: 8
      });
    }
    const geo = new THREE.SphereGeometry(1.5, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.7 });
    const ball = new THREE.Mesh(geo, mat);
    ball.position.copy(position);
    this.scene.add(ball);
    let t = 0;
    const expand = () => {
      t += 0.05;
      ball.scale.setScalar(1 + t * 3);
      mat.opacity = 0.7 - t * 0.7;
      if (t < 1) requestAnimationFrame(expand);
      else this.scene.remove(ball);
    };
    requestAnimationFrame(expand);
  }

  spawnSmoke(position) {
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position).add(new THREE.Vector3(
        (Math.random()-0.5)*1, Math.random()*0.5, (Math.random()-0.5)*1
      ));
      this.scene.add(mesh);
      const vel = new THREE.Vector3((Math.random()-0.5)*0.5, 0.8+Math.random()*0.5, (Math.random()-0.5)*0.5);
      this.particles.push({
        mesh, velocity: vel, life: 2, maxLife: 2, gravity: -0.5, fade: true, scale: true
      });
    }
  }

  spawnShellEjection(position) {
    const geo = new THREE.CylinderGeometry(0.008, 0.008, 0.04, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xcc9900 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    this.scene.add(mesh);
    const vel = new THREE.Vector3((Math.random()-0.5)*3 + 1.5, Math.random()*2+1, (Math.random()-0.5)*1);
    this.particles.push({
      mesh, velocity: vel, life: 0.8, maxLife: 0.8, gravity: 15, fade: false, scale: false
    });
  }

  spawnImpactDust(position) {
    for (let i = 0; i < 5; i++) {
      const vel = new THREE.Vector3((Math.random()-0.5)*2, Math.random()*1.5, (Math.random()-0.5)*2);
      this._spawn({
        position: position.clone(),
        velocity: vel,
        color: 0xaaaaaa,
        size: 0.05 + Math.random() * 0.08,
        life: 0.3 + Math.random() * 0.2,
        gravity: 2
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.velocity.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      if (p.fade) {
        const alpha = p.life / p.maxLife;
        if (p.mesh.material.transparent !== undefined) {
          p.mesh.material.transparent = true;
          p.mesh.material.opacity = alpha;
        }
      }
      if (p.scale) {
        const s = 1 + (1 - p.life / p.maxLife) * 2;
        p.mesh.scale.setScalar(s);
      }
    }
  }

  clear() {
    this.particles.forEach(p => this.scene.remove(p.mesh));
    this.particles = [];
  }
}

window.ParticleSystem = ParticleSystem;
