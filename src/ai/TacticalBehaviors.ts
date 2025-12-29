import Phaser from 'phaser';
import type { Zombie } from '@entities/zombies/Zombie';
import type { HordeManager } from './HordeManager';

/**
 * Rôle tactique assigné à un zombie
 */
export enum TacticalRole {
  /** Attaque frontale directe */
  FRONTAL = 'frontal',
  /** Contourne par le flanc gauche */
  FLANK_LEFT = 'flank_left',
  /** Contourne par le flanc droit */
  FLANK_RIGHT = 'flank_right',
  /** Encercle par l'arrière */
  ENCIRCLE = 'encircle',
  /** Protège un allié important */
  PROTECT = 'protect',
  /** Se tient à distance */
  RANGED = 'ranged',
}

/**
 * Configuration des comportements tactiques
 */
export interface TacticalConfig {
  /** Distance d'encerclement autour de la cible */
  encircleRadius: number;
  /** Angle minimum entre deux zombies en encerclement */
  encircleSpacing: number;
  /** Distance de flanking par rapport à l'axe principal */
  flankingOffset: number;
  /** Distance minimale pour la protection (Necromancer) */
  protectionRadius: number;
  /** Pourcentage de zombies qui tentent le flanking */
  flankingRatio: number;
}

/**
 * Configuration par défaut
 */
export const DEFAULT_TACTICAL_CONFIG: TacticalConfig = {
  encircleRadius: 100,
  encircleSpacing: 45, // degrés
  flankingOffset: 150,
  protectionRadius: 80,
  flankingRatio: 0.3,
};

/**
 * Résultat d'un calcul de position tactique
 */
export interface TacticalTarget {
  x: number;
  y: number;
  role: TacticalRole;
  priority: number;
}

/**
 * Gestionnaire des comportements tactiques pour les hordes
 */
export class TacticalBehaviors {
  private config: TacticalConfig;

  /** Cache des rôles assignés */
  private roleAssignments: Map<Zombie, TacticalRole> = new Map();

  /** Positions d'encerclement occupées (angle en degrés) */
  private encirclePositions: Map<number, Zombie> = new Map();

  /** Zombies spéciaux à protéger (Necromancers) */
  private protectedZombies: Set<Zombie> = new Set();

  constructor(config: Partial<TacticalConfig> = {}) {
    this.config = { ...DEFAULT_TACTICAL_CONFIG, ...config };
  }

  /**
   * Définit le HordeManager pour les requêtes de voisinage
   */
  public setHordeManager(_manager: HordeManager): void {
    // Reserved for future use with horde-based tactical decisions
  }

  /**
   * Assigne un rôle tactique à un zombie
   */
  public assignRole(
    zombie: Zombie,
    playerX: number,
    playerY: number,
    _allZombies: Zombie[]
  ): TacticalRole {
    const zombieType = zombie.getType();

    // Rôles spéciaux par type
    if (zombieType === 'spitter') {
      this.roleAssignments.set(zombie, TacticalRole.RANGED);
      return TacticalRole.RANGED;
    }

    if (zombieType === 'necromancer') {
      this.protectedZombies.add(zombie);
      this.roleAssignments.set(zombie, TacticalRole.RANGED);
      return TacticalRole.RANGED;
    }

    // Calculer l'angle vers le joueur
    const angleToPlayer = Math.atan2(playerY - zombie.y, playerX - zombie.x);
    const angleDeg = Phaser.Math.RadToDeg(angleToPlayer);

    // Trouver l'angle d'encerclement disponible le plus proche
    const assignedSlot = this.findEncircleSlot(zombie, angleDeg);

    if (assignedSlot !== null) {
      // Déterminer le rôle basé sur l'angle
      const relativeAngle = Phaser.Math.Angle.ShortestBetween(angleDeg, assignedSlot);

      if (Math.abs(relativeAngle) < 30) {
        this.roleAssignments.set(zombie, TacticalRole.FRONTAL);
        return TacticalRole.FRONTAL;
      } else if (relativeAngle > 90) {
        this.roleAssignments.set(zombie, TacticalRole.ENCIRCLE);
        return TacticalRole.ENCIRCLE;
      } else if (relativeAngle > 0) {
        this.roleAssignments.set(zombie, TacticalRole.FLANK_RIGHT);
        return TacticalRole.FLANK_RIGHT;
      } else {
        this.roleAssignments.set(zombie, TacticalRole.FLANK_LEFT);
        return TacticalRole.FLANK_LEFT;
      }
    }

    // Par défaut: attaque frontale
    this.roleAssignments.set(zombie, TacticalRole.FRONTAL);
    return TacticalRole.FRONTAL;
  }

  /**
   * Trouve un slot d'encerclement disponible
   */
  private findEncircleSlot(zombie: Zombie, preferredAngle: number): number | null {
    // Nettoyer les slots avec des zombies inactifs
    for (const [angle, z] of this.encirclePositions) {
      if (!z.active) {
        this.encirclePositions.delete(angle);
      }
    }

    // Chercher un slot proche de l'angle préféré
    const spacing = this.config.encircleSpacing;
    const normalizedAngle = ((preferredAngle % 360) + 360) % 360;
    const slotIndex = Math.round(normalizedAngle / spacing);
    const slotAngle = slotIndex * spacing;

    // Vérifier si ce slot est disponible
    if (!this.encirclePositions.has(slotAngle)) {
      this.encirclePositions.set(slotAngle, zombie);
      return slotAngle;
    }

    // Chercher un slot adjacent
    for (let offset = 1; offset <= 4; offset++) {
      const leftSlot = ((slotAngle - offset * spacing) + 360) % 360;
      const rightSlot = (slotAngle + offset * spacing) % 360;

      if (!this.encirclePositions.has(leftSlot)) {
        this.encirclePositions.set(leftSlot, zombie);
        return leftSlot;
      }
      if (!this.encirclePositions.has(rightSlot)) {
        this.encirclePositions.set(rightSlot, zombie);
        return rightSlot;
      }
    }

    return null;
  }

  /**
   * Calcule la position tactique pour un zombie
   */
  public calculateTacticalTarget(
    zombie: Zombie,
    playerX: number,
    playerY: number,
    allZombies: Zombie[]
  ): TacticalTarget {
    let role = this.roleAssignments.get(zombie);

    // Assigner un rôle si nécessaire
    if (!role) {
      role = this.assignRole(zombie, playerX, playerY, allZombies);
    }

    switch (role) {
      case TacticalRole.FRONTAL:
        return this.calculateFrontalTarget(zombie, playerX, playerY);

      case TacticalRole.FLANK_LEFT:
        return this.calculateFlankTarget(zombie, playerX, playerY, -1);

      case TacticalRole.FLANK_RIGHT:
        return this.calculateFlankTarget(zombie, playerX, playerY, 1);

      case TacticalRole.ENCIRCLE:
        return this.calculateEncircleTarget(zombie, playerX, playerY);

      case TacticalRole.RANGED:
        return this.calculateRangedTarget(zombie, playerX, playerY);

      case TacticalRole.PROTECT:
        return this.calculateProtectTarget(zombie, allZombies);

      default:
        return {
          x: playerX,
          y: playerY,
          role: TacticalRole.FRONTAL,
          priority: 1,
        };
    }
  }

  /**
   * Position d'attaque frontale directe
   */
  private calculateFrontalTarget(
    _zombie: Zombie,
    playerX: number,
    playerY: number
  ): TacticalTarget {
    return {
      x: playerX,
      y: playerY,
      role: TacticalRole.FRONTAL,
      priority: 1,
    };
  }

  /**
   * Position de flanking (contournement)
   */
  private calculateFlankTarget(
    zombie: Zombie,
    playerX: number,
    playerY: number,
    side: -1 | 1 // -1 = gauche, 1 = droite
  ): TacticalTarget {
    // Calculer la direction perpendiculaire à l'axe zombie-joueur
    const dx = playerX - zombie.x;
    const dy = playerY - zombie.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      return { x: playerX, y: playerY, role: TacticalRole.FRONTAL, priority: 1 };
    }

    // Normaliser
    const nx = dx / dist;
    const ny = dy / dist;

    // Perpendiculaire
    const perpX = -ny * side;
    const perpY = nx * side;

    // Position de flanking: décalée sur le côté
    const flankX = playerX + perpX * this.config.flankingOffset;
    const flankY = playerY + perpY * this.config.flankingOffset;

    return {
      x: flankX,
      y: flankY,
      role: side === -1 ? TacticalRole.FLANK_LEFT : TacticalRole.FLANK_RIGHT,
      priority: 0.9,
    };
  }

  /**
   * Position d'encerclement
   */
  private calculateEncircleTarget(
    zombie: Zombie,
    playerX: number,
    playerY: number
  ): TacticalTarget {
    // Trouver l'angle assigné au zombie
    let assignedAngle = 180; // Par défaut: derrière le joueur

    for (const [angle, z] of this.encirclePositions) {
      if (z === zombie) {
        assignedAngle = angle;
        break;
      }
    }

    // Calculer la position sur le cercle d'encerclement
    const angleRad = Phaser.Math.DegToRad(assignedAngle);
    const targetX = playerX + Math.cos(angleRad) * this.config.encircleRadius;
    const targetY = playerY + Math.sin(angleRad) * this.config.encircleRadius;

    return {
      x: targetX,
      y: targetY,
      role: TacticalRole.ENCIRCLE,
      priority: 0.8,
    };
  }

  /**
   * Position pour les zombies à distance (Spitter, Necromancer)
   */
  private calculateRangedTarget(
    zombie: Zombie,
    playerX: number,
    playerY: number
  ): TacticalTarget {
    const dx = zombie.x - playerX;
    const dy = zombie.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Distance préférée pour les attaques à distance
    const preferredDist = 200;

    if (dist < preferredDist * 0.7) {
      // Trop proche: reculer
      const angle = Math.atan2(dy, dx);
      return {
        x: playerX + Math.cos(angle) * preferredDist,
        y: playerY + Math.sin(angle) * preferredDist,
        role: TacticalRole.RANGED,
        priority: 0.95,
      };
    } else if (dist > preferredDist * 1.3) {
      // Trop loin: avancer
      return {
        x: playerX,
        y: playerY,
        role: TacticalRole.RANGED,
        priority: 0.7,
      };
    }

    // Bonne distance: rester en place
    return {
      x: zombie.x,
      y: zombie.y,
      role: TacticalRole.RANGED,
      priority: 0.5,
    };
  }

  /**
   * Position de protection (pour escorter les Necromancers)
   */
  private calculateProtectTarget(zombie: Zombie, _allZombies: Zombie[]): TacticalTarget {
    // Trouver le Necromancer le plus proche
    let nearestNecro: Zombie | null = null;
    let nearestDist = Infinity;

    for (const z of this.protectedZombies) {
      if (!z.active) continue;

      const dist = Math.sqrt(
        (z.x - zombie.x) * (z.x - zombie.x) + (z.y - zombie.y) * (z.y - zombie.y)
      );

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestNecro = z;
      }
    }

    if (nearestNecro) {
      return {
        x: nearestNecro.x,
        y: nearestNecro.y,
        role: TacticalRole.PROTECT,
        priority: 0.85,
      };
    }

    // Pas de Necromancer à protéger: attaquer
    return {
      x: zombie.x,
      y: zombie.y,
      role: TacticalRole.FRONTAL,
      priority: 0.5,
    };
  }

  /**
   * Applique le buff du Screamer aux zombies proches
   * @returns Nombre de zombies affectés
   */
  public applyScreamerBuff(
    screamer: Zombie,
    allZombies: Zombie[],
    radius: number,
    speedBoost: number,
    duration: number
  ): number {
    let affected = 0;

    for (const zombie of allZombies) {
      if (zombie === screamer || !zombie.active) continue;

      const dist = Math.sqrt(
        (zombie.x - screamer.x) * (zombie.x - screamer.x) +
          (zombie.y - screamer.y) * (zombie.y - screamer.y)
      );

      if (dist <= radius) {
        zombie.movementComponent.applySpeedBoost(speedBoost, duration);
        affected++;

        // Effet visuel du buff
        zombie.setTint(0xff6666);
        zombie.scene.time.delayedCall(duration, () => {
          if (zombie.active) {
            zombie.clearTint();
          }
        });
      }
    }

    return affected;
  }

  /**
   * Vérifie si un zombie devrait protéger un Necromancer
   */
  public shouldProtectNecromancer(zombie: Zombie, allZombies: Zombie[]): boolean {
    // Les Tanks et certains autres types peuvent protéger
    if (zombie.getType() !== 'tank' && zombie.getType() !== 'shambler') {
      return false;
    }

    // Vérifier s'il y a un Necromancer proche sans protection
    for (const z of this.protectedZombies) {
      if (!z.active) continue;

      const dist = Math.sqrt(
        (z.x - zombie.x) * (z.x - zombie.x) + (z.y - zombie.y) * (z.y - zombie.y)
      );

      if (dist < this.config.protectionRadius * 2) {
        // Compter les protecteurs existants
        let protectors = 0;
        for (const other of allZombies) {
          if (this.roleAssignments.get(other) === TacticalRole.PROTECT) {
            protectors++;
          }
        }

        // Besoin de plus de protecteurs?
        if (protectors < 2) {
          this.roleAssignments.set(zombie, TacticalRole.PROTECT);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Réinitialise les assignations tactiques
   */
  public reset(): void {
    this.roleAssignments.clear();
    this.encirclePositions.clear();
    this.protectedZombies.clear();
  }

  /**
   * Supprime un zombie des assignations
   */
  public removeZombie(zombie: Zombie): void {
    this.roleAssignments.delete(zombie);
    this.protectedZombies.delete(zombie);

    for (const [angle, z] of this.encirclePositions) {
      if (z === zombie) {
        this.encirclePositions.delete(angle);
        break;
      }
    }
  }

  /**
   * Met à jour les comportements tactiques
   */
  public update(_playerX: number, _playerY: number, _allZombies: Zombie[]): void {
    // Nettoyer les zombies inactifs
    for (const zombie of this.roleAssignments.keys()) {
      if (!zombie.active) {
        this.removeZombie(zombie);
      }
    }

    // Nettoyer les zombies protégés inactifs
    for (const zombie of this.protectedZombies) {
      if (!zombie.active) {
        this.protectedZombies.delete(zombie);
      }
    }
  }
}
