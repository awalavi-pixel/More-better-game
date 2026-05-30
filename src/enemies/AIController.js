class AIController {
  constructor(enemy, scene) {
    this.enemy = enemy;
    this.scene = scene;

    this.state = 'patrol';
    this.previousState = null;

    this.target = null;
    this.lastKnownPos = null;
    this.patrolPoints = [];
    this.currentPatrolIndex = 0;
    this.patrolWaitTimer = 0;
    this.patrolWaitTime = 2;

    this.detectionLevel = 0;
    this.maxDetection = 100;
    this.visionRange = 20;
    this.visionAngle = Math.PI / 2.5;
    this.hearingRange = 12;
    this.investigateTimer = 0;
    this.alertTimer = 0;
    this.shootTimer = 0;
    this.coverTimer = 0;
    this.flankTimer = 0;
    this.retreatTimer = 0;
    this.callTimer = 0;
    this.callCooldown = 8;

    this.coverPoints = [];
    this.currentCover = null;
    this.isInCover = false;

    this.raycaster = new THREE.Raycaster();
  }

  setPatrolPoints(points) { this.patrolPoints = points; }
  setCoverPoints(points) { this.coverPoints = points; }

  update(dt, playerPos, allColliders, allEnemies, stealthLevel) {
    if (this.enemy.isDead) return;

    switch (this.state) {
      case 'patrol': this._updatePatrol(dt, playerPos, allColliders, stealthLevel); break;
      case 'investigate': this._updateInvestigate(dt, playerPos, allColliders); break;
      case 'alert': this._updateAlert(dt, playerPos, allColliders, allEnemies); break;
      case 'take_cover': this._updateTakeCover(dt, playerPos, allColliders, allEnemies); break;
      case 'shoot': this._updateShoot(dt, playerPos, allColliders, allEnemies); break;
      case 'flank': this._updateFlank(dt, playerPos, allColliders); break;
      case 'retreat': this._updateRetreat(dt, allColliders); break;
    }

    this._decayDetection(dt, stealthLevel);
  }

  _setState(newState) {
    this.previousState = this.state;
    this.state = newState;
  }

  _canSeePlayer(playerPos, allColliders) {
    const toPlayer = playerPos.clone().sub(this.enemy.position);
    const dist = toPlayer.length();
    if (dist > this.visionRange) return false;

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.enemy.mesh.rotation);
    const angle = forward.angleTo(toPlayer.normalize());
    if (angle > this.visionAngle) return false;

    this.raycaster.set(
      this.enemy.position.clone().add(new THREE.Vector3(0, 1.6, 0)),
      toPlayer.normalize()
    );
    const hits = this.raycaster.intersectObjects(allColliders, true);
    if (hits.length > 0 && hits[0].distance < dist - 0.5) return false;

    return true;
  }

  _updatePatrol(dt, playerPos, allColliders, stealthLevel) {
    const canSee = this._canSeePlayer(playerPos, allColliders);
    const dist = this.enemy.position.distanceTo(playerPos);

    if (canSee) {
      const detectSpeed = stealthLevel < 20 ? 8 : stealthLevel < 60 ? 25 : 60;
      this.detectionLevel += detectSpeed * dt;
      if (this.detectionLevel >= this.maxDetection) {
        this.target = playerPos.clone();
        this.lastKnownPos = playerPos.clone();
        this._setState('alert');
        this._callNearbyEnemies();
        return;
      }
      if (this.detectionLevel > 30) {
        this.lastKnownPos = playerPos.clone();
        this._setState('investigate');
        return;
      }
    } else {
      if (dist < this.hearingRange && stealthLevel > 50) {
        this.lastKnownPos = playerPos.clone();
        this._setState('investigate');
        return;
      }
    }

    if (this.patrolPoints.length === 0) return;

    const target = this.patrolPoints[this.currentPatrolIndex];
    const toTarget = new THREE.Vector2(target.x - this.enemy.position.x, target.z - this.enemy.position.z);
    if (toTarget.length() < 1) {
      this.patrolWaitTimer += dt;
      if (this.patrolWaitTimer >= this.patrolWaitTime) {
        this.patrolWaitTimer = 0;
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
      }
    } else {
      this._moveTo(target, dt, 2.5);
      this._faceDir(toTarget);
    }
  }

  _updateInvestigate(dt, playerPos, allColliders) {
    this.investigateTimer += dt;
    const canSee = this._canSeePlayer(playerPos, allColliders);

    if (canSee) {
      this.detectionLevel += 60 * dt;
      if (this.detectionLevel >= this.maxDetection) {
        this.target = playerPos.clone();
        this.lastKnownPos = playerPos.clone();
        this._setState('alert');
        this._callNearbyEnemies();
        return;
      }
    } else {
      this.detectionLevel -= 15 * dt;
    }

    if (this.investigateTimer > 5 || this.detectionLevel <= 0) {
      this.investigateTimer = 0;
      this.detectionLevel = 0;
      this._setState('patrol');
      return;
    }

    if (this.lastKnownPos) {
      const toTarget = new THREE.Vector2(
        this.lastKnownPos.x - this.enemy.position.x,
        this.lastKnownPos.z - this.enemy.position.z
      );
      if (toTarget.length() > 1) {
        this._moveTo(this.lastKnownPos, dt, 3);
      }
    }
  }

  _updateAlert(dt, playerPos, allColliders, allEnemies) {
    const canSee = this._canSeePlayer(playerPos, allColliders);
    this.alertTimer += dt;

    if (canSee) {
      this.lastKnownPos = playerPos.clone();
      const dist = this.enemy.position.distanceTo(playerPos);

      if (this.enemy.health < this.enemy.maxHealth * 0.3 && this.retreatTimer <= 0) {
        this._setState('retreat');
        this.retreatTimer = 4;
        return;
      }

      if (dist < 8 || Math.random() < 0.01) {
        this._setState('take_cover');
        this.coverTimer = 2 + Math.random() * 2;
        return;
      }

      this._setState('shoot');
      return;
    } else {
      if (this.lastKnownPos) {
        this._moveTo(this.lastKnownPos, dt, 4);
        const dist = this.enemy.position.distanceTo(this.lastKnownPos);
        if (dist < 2) {
          this.alertTimer += dt * 2;
        }
      }
      if (this.alertTimer > 10) {
        this.alertTimer = 0;
        this.detectionLevel = 40;
        this._setState('investigate');
      }
    }

    this.callTimer -= dt;
    if (this.callTimer <= 0) {
      this.callTimer = this.callCooldown;
      this._callNearbyEnemies();
    }
  }

  _updateShoot(dt, playerPos, allColliders, allEnemies) {
    const canSee = this._canSeePlayer(playerPos, allColliders);
    if (!canSee) {
      this._setState('alert');
      return;
    }

    this.lastKnownPos = playerPos.clone();
    const toPlayer = new THREE.Vector2(
      playerPos.x - this.enemy.position.x,
      playerPos.z - this.enemy.position.z
    );
    this._faceDir(toPlayer);

    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.enemy.fireRate + Math.random() * 0.3;
      this.enemy.shoot(playerPos);
    }

    if (Math.random() < 0.005) {
      this._setState('take_cover');
      this.coverTimer = 1.5 + Math.random() * 2;
    }
  }

  _updateTakeCover(dt, playerPos, allColliders, allEnemies) {
    this.coverTimer -= dt;

    if (!this.isInCover || !this.currentCover) {
      const cover = this._findBestCover(playerPos);
      if (cover) {
        this.currentCover = cover;
        const dist = this.enemy.position.distanceTo(cover);
        if (dist > 1) {
          this._moveTo(cover, dt, 5);
        } else {
          this.isInCover = true;
        }
      }
    }

    if (this.coverTimer <= 0 || Math.random() < 0.003) {
      this.isInCover = false;
      this.currentCover = null;
      this._setState('shoot');
    }

    if (this.coverTimer <= 0.5 && this._canSeePlayer(playerPos, allColliders)) {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = this.enemy.fireRate + Math.random() * 0.2;
        this.enemy.shoot(playerPos);
      }
    }
  }

  _updateFlank(dt, playerPos, allColliders) {
    this.flankTimer -= dt;
    if (this.flankTimer <= 0) {
      this._setState('shoot');
      return;
    }
    const angle = Math.atan2(
      this.enemy.position.z - playerPos.z,
      this.enemy.position.x - playerPos.x
    ) + Math.PI / 2;
    const flankTarget = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * 8,
      playerPos.y,
      playerPos.z + Math.sin(angle) * 8
    );
    this._moveTo(flankTarget, dt, 5);
  }

  _updateRetreat(dt, allColliders) {
    this.retreatTimer -= dt;
    const awayDir = this.enemy.position.clone().sub(this.lastKnownPos || new THREE.Vector3()).normalize();
    const retreatTarget = this.enemy.position.clone().add(awayDir.multiplyScalar(10));
    this._moveTo(retreatTarget, dt, 4);
    if (this.retreatTimer <= 0) {
      if (this.enemy.health > this.enemy.maxHealth * 0.2) {
        this._setState('alert');
      }
    }
  }

  _findBestCover(playerPos) {
    if (this.coverPoints.length === 0) {
      const angle = Math.atan2(
        this.enemy.position.z - playerPos.z,
        this.enemy.position.x - playerPos.x
      );
      return new THREE.Vector3(
        this.enemy.position.x + Math.cos(angle) * 5 + (Math.random()-0.5)*3,
        0,
        this.enemy.position.z + Math.sin(angle) * 5 + (Math.random()-0.5)*3
      );
    }
    let best = null, bestScore = -Infinity;
    for (const cover of this.coverPoints) {
      const distToPlayer = cover.distanceTo(playerPos);
      const distToSelf = cover.distanceTo(this.enemy.position);
      const score = distToPlayer * 0.5 - distToSelf * 2;
      if (score > bestScore) { bestScore = score; best = cover; }
    }
    return best;
  }

  _callNearbyEnemies() {
    if (window.GAME && window.GAME.enemyManager) {
      window.GAME.enemyManager.alertNearby(this.enemy.position, 20, this.lastKnownPos);
    }
  }

  _moveTo(target, dt, speed) {
    const dx = target.x - this.enemy.position.x;
    const dz = target.z - this.enemy.position.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    if (dist < 0.3) return;
    const nx = (dx / dist) * speed * dt;
    const nz = (dz / dist) * speed * dt;
    this.enemy.position.x += nx;
    this.enemy.position.z += nz;
    if (this.enemy.mesh) {
      this.enemy.mesh.position.copy(this.enemy.position);
      this.enemy.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI;
    }
  }

  _faceDir(dir2d) {
    if (this.enemy.mesh) {
      this.enemy.mesh.rotation.y = Math.atan2(dir2d.x, dir2d.y) + Math.PI;
    }
  }

  _decayDetection(dt, stealthLevel) {
    if (this.state === 'patrol' || this.state === 'investigate') {
      this.detectionLevel = Math.max(0, this.detectionLevel - 10 * dt);
    }
  }

  getDetectionPercent() { return this.detectionLevel / this.maxDetection; }
}

window.AIController = AIController;
