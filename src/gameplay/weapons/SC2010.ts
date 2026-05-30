import { WeaponBase } from '../WeaponBase.ts';
export class SC2010 extends WeaponBase {
  constructor() {
    super({
      name: 'SC 2010',
      caliber: '5.56mm',
      damage: 38,
      damageDropStart: 38,
      damageDropEnd: 75,
      minDamage: 18,
      rpm: 800,
      magSize: 30,
      reserveAmmo: 90,
      reloadEmpty: 2500,
      reloadTactical: 1900,
      adsTime: 210,
      hipfireSpread: 3.8,
      adsSpread: 0.6,
      recoilPattern: [
        { x: 0, y: 0.9 }, { x: 0.3, y: 1.0 }, { x: -0.2, y: 0.9 },
        { x: 0.2, y: 1.1 }, { x: -0.3, y: 1.0 }, { x: 0.1, y: 0.9 },
      ],
      penetration: 'medium',
      muzzleVelocity: 880,
      isSuppressed: false,
      isAutoFire: true,
      burstCount: 0,
      pelletCount: 1,
      ballisticDrop: false,
    });
  }
}
