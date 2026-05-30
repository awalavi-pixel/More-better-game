import { WeaponBase } from '../WeaponBase.ts';
export class SA805 extends WeaponBase {
  constructor() {
    super({
      name: 'SA-805',
      caliber: '5.56mm',
      damage: 42,
      damageDropStart: 45,
      damageDropEnd: 85,
      minDamage: 22,
      rpm: 680,
      magSize: 30,
      reserveAmmo: 90,
      reloadEmpty: 2600,
      reloadTactical: 2000,
      adsTime: 220,
      hipfireSpread: 3.2,
      adsSpread: 0.5,
      recoilPattern: [
        { x: 0, y: 0.7 }, { x: 0.1, y: 0.8 }, { x: -0.1, y: 0.7 },
        { x: 0.2, y: 0.9 }, { x: -0.1, y: 0.8 }, { x: 0, y: 0.7 },
      ],
      penetration: 'medium',
      muzzleVelocity: 920,
      isSuppressed: false,
      isAutoFire: true,
      burstCount: 0,
      pelletCount: 1,
      ballisticDrop: false,
    });
  }
}
