class EnemyManager {
  constructor(scene, audio, effects) {
    this.scene = scene;
    this.audio = audio;
    this.effects = effects;
    this.enemies = [];
    this.colliders = [];
    this.raycaster = new THREE.Raycaster();
    this.killCount = 0;
    this.headshotCount = 0;
    this.stealthKillCount = 0;
    this.onEnemyKilled = null;
  }

  setColliders(colliders) { this.colliders = colliders; }

  spawn(type, position, patrolPoints) {
    const enemy = new Enemy(this.scene, type, position, this.audio, this.effects);
    if (patrolPoints) enemy.ai.setPatrolPoints(patrolPoints);
    this.enemies.push(enemy);
    return enemy;
  }

  spawnGroup(configs) {
    configs.forEach(cfg => {
      this.spawn(cfg.type, cfg.position, cfg.patrol);
    });
  }

  alertNearby(fromPos, radius, targetPos) {
    this.enemies.forEach(e => {
      if (e.isDead) return;
      if (e.position.distanceTo(fromPos) < radius) {
        if (e.ai.state === 'patrol' || e.ai.state === 'investigate') {
          e.ai._setState('alert');
          e.ai.lastKnownPos = targetPos ? targetPos.clone() : fromPos.clone();
          e.isAlert = true;
        }
      }
    });
  }

  checkBullet(origin, direction, playerRef, weaponData, isSuppressed) {
    if (!playerRef) return null;
    const ray = new THREE.Raycaster(origin, direction.clone().normalize(), 0, 200);
    const worldObjs = this.colliders.slice();
    this.enemies.forEach(e => {
      if (!e.isDead) {
        e.mesh.traverse(child => {
          if (child.isMesh) worldObjs.push(child);
        });
      }
    });
    const hits = ray.intersectObjects(worldObjs, false);
    if (hits.length === 0) {
      const tracer = origin.clone().add(direction.clone().normalize().multiplyScalar(50));
      this.effects.spawnBulletTracer(origin, tracer);
      return null;
    }

    const hit = hits[0];
    this.effects.spawnBulletTracer(origin, hit.point);

    const enemyRef = hit.object.userData.enemy;
    if (enemyRef && !enemyRef.isDead) {
      const isHeadshot = hit.object.geometry instanceof THREE.BoxGeometry &&
        hit.point.y > enemyRef.position.y + 1.4;

      let damage = weaponData.damage;
      if (isHeadshot) damage *= weaponData.headshotMult || 2;

      const stealthKill = (enemyRef.ai.state === 'patrol' || enemyRef.ai.state === 'investigate')
        && (isSuppressed || enemyRef.position.distanceTo(playerRef.position) < 3);

      enemyRef.takeDamage(damage, isHeadshot);
      this.effects.showHitMarker(isHeadshot);
      this.effects.particles.spawnSparks(hit.point);

      if (enemyRef.isDead) {
        this.killCount++;
        if (isHeadshot) this.headshotCount++;
        if (stealthKill) this.stealthKillCount++;
        if (this.onEnemyKilled) this.onEnemyKilled(enemyRef, isHeadshot, stealthKill);
      }

      return { enemy: enemyRef, isHeadshot, damage, stealthKill };
    } else {
      this.effects.particles.spawnSparks(hit.point);
      this.effects.spawnDecal(hit.point, hit.face ? hit.face.normal : new THREE.Vector3(0,1,0));
      this.effects.particles.spawnImpactDust(hit.point);
    }

    return { hit: true, point: hit.point };
  }

  checkPlayerDamage(playerPos) {
    this.enemies.forEach(e => {
      if (e.isDead) return;
      if (e.ai.state !== 'shoot' && e.ai.state !== 'take_cover') return;
      if (e.shootCooldown > 0) { e.shootCooldown -= 0.016; return; }

      const dist = e.position.distanceTo(playerPos);
      const range = e.type === 'Sniper' ? 60 : e.type === 'Heavy' ? 25 : 35;
      if (dist > range) return;

      const hit = e.shoot(playerPos);
      if (!hit) return;

      if (Math.random() < e.accuracy) {
        const dmg = e.damage * (0.7 + Math.random() * 0.6);
        if (window.GAME && window.GAME.player) {
          window.GAME.player.takeDamage(dmg, e.position);
        }
      }

      e.shootCooldown = e.fireRate + Math.random() * 0.2;
    });
  }

  update(dt, playerPos) {
    this.enemies.forEach(e => {
      if (!e.isDead) {
        e.update(dt, playerPos, this.colliders, this.enemies);
      }
    });
    this.checkPlayerDamage(playerPos);
  }

  aliveCount() {
    return this.enemies.filter(e => !e.isDead).length;
  }

  clear() {
    this.enemies.forEach(e => {
      if (!e.isDead) this.scene.remove(e.mesh);
    });
    this.enemies = [];
    this.killCount = 0;
    this.headshotCount = 0;
    this.stealthKillCount = 0;
  }

  drawRadar(ctx, playerPos, playerYaw, scale) {
    this.enemies.forEach(e => {
      if (e.isDead) return;
      const dx = e.position.x - playerPos.x;
      const dz = e.position.z - playerPos.z;
      const dist = Math.sqrt(dx*dx+dz*dz);
      if (dist > scale) return;
      const angle = Math.atan2(dx, dz) - playerYaw;
      const rx = Math.sin(angle) * (dist / scale) * 55 + 60;
      const ry = Math.cos(angle) * (dist / scale) * 55 + 60;

      const colors = {
        alert: '#ff2244', patrol: '#ff8800', investigate: '#ffff00'
      };
      const state = e.ai.state;
      ctx.fillStyle = state === 'alert' || state === 'shoot' || state === 'take_cover' ? '#ff2244' :
                      state === 'investigate' ? '#ffff00' : '#ff8800';
      ctx.beginPath();
      ctx.arc(rx, ry, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

window.EnemyManager = EnemyManager;
