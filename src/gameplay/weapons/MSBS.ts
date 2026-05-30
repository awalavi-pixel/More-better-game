import { WeaponBase } from '../WeaponBase.ts';

export class MSBS extends WeaponBase {
  constructor() {
    super({
      name: 'MSBS',
      caliber: '5.56mm',
      damage: 40,
      damageDropStart: 40,
      damageDropEnd: 80,
      minDamage: 20,
      rpm: 750,
      magSize: 30,
      reserveAmmo: 90,
      reloadEmpty: 2400,
      reloadTactical: 1800,
      adsTime: 200,
      hipfireSpread: 3.5,
      adsSpread: 0.5,
      recoilPattern: [
        { x: 0, y: 0.8 }, { x: 0.2, y: 0.9 }, { x: -0.1, y: 0.8 },
        { x: 0.1, y: 1.0 }, { x: 0.3, y: 0.9 }, { x: -0.2, y: 0.8 },
        { x: 0, y: 0.9 }, { x: 0.1, y: 0.8 }, { x: -0.1, y: 0.9 },
      ],
      penetration: 'medium',
      muzzleVelocity: 900,
      isSuppressed: false,
      isAutoFire: false,
      burstCount: 3,
      pelletCount: 1,
      ballisticDrop: false,
    });
  }
}
