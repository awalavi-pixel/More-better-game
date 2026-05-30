import { WeaponBase } from '../WeaponBase.ts';
export class VectorCRB extends WeaponBase {
  constructor() {
    super({
      name: 'Vector CRB',
      caliber: '.45 ACP',
      damage: 30,
      damageDropStart: 20,
      damageDropEnd: 45,
      minDamage: 15,
      rpm: 1100,
      magSize: 25,
      reserveAmmo: 75,
      reloadEmpty: 2000,
      reloadTactical: 1500,
      adsTime: 160,
      hipfireSpread: 4.0,
      adsSpread: 0.7,
      recoilPattern: [
        { x: 0, y: 0.6 }, { x: 0.3, y: 0.7 }, { x: -0.3, y: 0.6 },
        { x: 0.2, y: 0.7 }, { x: -0.2, y: 0.65 }, { x: 0, y: 0.6 },
      ],
      penetration: 'low',
      muzzleVelocity: 420,
      isSuppressed: false,
      isAutoFire: true,
      burstCount: 0,
      pelletCount: 1,
      ballisticDrop: false,
    });
  }
}
