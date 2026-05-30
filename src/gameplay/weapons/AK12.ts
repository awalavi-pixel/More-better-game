import { WeaponBase } from '../WeaponBase.ts';
export class AK12 extends WeaponBase {
  constructor() {
    super({
      name: 'AK-12',
      caliber: '5.45mm',
      damage: 44,
      damageDropStart: 42,
      damageDropEnd: 80,
      minDamage: 24,
      rpm: 660,
      magSize: 30,
      reserveAmmo: 90,
      reloadEmpty: 2700,
      reloadTactical: 2100,
      adsTime: 230,
      hipfireSpread: 3.3,
      adsSpread: 0.55,
      recoilPattern: [
        { x: 0, y: 1.0 }, { x: 0.4, y: 1.1 }, { x: -0.3, y: 1.0 },
        { x: 0.3, y: 1.2 }, { x: -0.2, y: 1.1 }, { x: 0.1, y: 1.0 },
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
