import { WeaponBase } from '../WeaponBase.ts';
export class DesertEagle extends WeaponBase {
  constructor() {
    super({
      name: 'Desert Eagle',
      caliber: '.50 AE',
      damage: 70,
      damageDropStart: 20,
      damageDropEnd: 45,
      minDamage: 35,
      rpm: 400,
      magSize: 7,
      reserveAmmo: 28,
      reloadEmpty: 2200,
      reloadTactical: 1800,
      adsTime: 250,
      hipfireSpread: 5.0,
      adsSpread: 1.5,
      recoilPattern: [
        { x: 0, y: 3.5 }, { x: 0.8, y: 3.8 }, { x: -0.6, y: 3.5 },
        { x: 0.4, y: 4.0 }, { x: -0.3, y: 3.7 },
      ],
      penetration: 'medium',
      muzzleVelocity: 470,
      isSuppressed: false,
      isAutoFire: false,
      burstCount: 1,
      pelletCount: 1,
      ballisticDrop: false,
    });
  }
}
