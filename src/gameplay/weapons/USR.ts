import { WeaponBase } from '../WeaponBase.ts';
export class USR extends WeaponBase {
  constructor() {
    super({
      name: 'USR',
      caliber: '.338 Lapua',
      damage: 95,
      damageDropStart: 100,
      damageDropEnd: 400,
      minDamage: 65,
      rpm: 50,
      magSize: 5,
      reserveAmmo: 15,
      reloadEmpty: 4000,
      reloadTactical: 3200,
      adsTime: 600,
      hipfireSpread: 12.0,
      adsSpread: 0.05,
      recoilPattern: [
        { x: 0, y: 4.0 }, { x: 0.5, y: 4.5 }, { x: -0.3, y: 4.0 },
      ],
      penetration: 'high',
      muzzleVelocity: 1200,
      isSuppressed: false,
      isAutoFire: false,
      burstCount: 1,
      pelletCount: 1,
      ballisticDrop: true,
    });
  }
}
