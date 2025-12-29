/**
 * Types liés aux armes
 */

export type FirearmType = 'pistol' | 'shotgun' | 'smg' | 'sniper';

export type SpecialWeaponType =
  | 'flamethrower'
  | 'tesla_cannon'
  | 'nail_gun'
  | 'composite_bow'
  | 'microwave_cannon';

export type MeleeWeaponType = 'baseball_bat' | 'machete' | 'chainsaw';

export type WeaponType = FirearmType | SpecialWeaponType | MeleeWeaponType;

export interface WeaponStats {
  damage: number;
  fireRate: number;
  reloadTime: number;
  magazineSize: number;
  spread?: number;
  range?: number;
}

export interface WeaponConfig extends WeaponStats {
  type: WeaponType;
  name: string;
  description: string;
}
