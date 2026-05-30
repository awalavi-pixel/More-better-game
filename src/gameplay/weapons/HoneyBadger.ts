import { WeaponBase } from '../WeaponBase.ts';
export class HoneyBadger extends WeaponBase {
  constructor() {
    super({
      name: 'Honey Badger',
      caliber: '300BLK',
      damage: 40,
      damageDropStart: 35,
      damageDropEnd: 65,
      minDamage: 20,
      rpm: 750,
      magSize: 30,
      reserveAmmo: 90,
      reloadEmpty: 2300,
      reloadTactical: 1700,
      adsTime: 190,
      hipfireSpread: 3.0,
      adsSpread: 0.4,
      recoilPattern: [
        { x: 0, y: 0.7 }, { x: 0.2, y: 0.8 }, { x: -0.15, y: 0.7 },
        { x: 0.1, y: 0.8 }, { x: -0.2, y: 0.75 }, { x: 0.05, y: 0.7 },
      ],
      penetration: 'low',
      muzzleVelocity: 650,
      isSuppressed: true,
      isAutoFire: true,
      burstCount: 0,
      pelletCount: 1,
      ballisticDrop: false,
    });
  }
}
