import type { GameScene } from '@scenes/GameScene';

/**
 * Définition d'un achievement
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'experimental' | 'melee' | 'ranged' | 'special';
  requirement: number;
  reward?: {
    type: 'points' | 'unlock' | 'cosmetic';
    value: number | string;
  };
}

/**
 * État d'un achievement
 */
export interface AchievementProgress {
  achieved: boolean;
  progress: number;
  achievedAt?: number;
}

/**
 * WeaponAchievementSystem - Gère les achievements liés aux armes
 *
 * Achievements disponibles :
 * - Armes expérimentales : utilisation et maîtrise
 * - Armes de mêlée : kills et combos
 * - Armes à distance : précision et kills
 */
export class WeaponAchievementSystem {
  private scene: GameScene;
  private achievements: Map<string, Achievement> = new Map();
  private progress: Map<string, AchievementProgress> = new Map();

  private static readonly STORAGE_KEY = 'zombieHunter_achievements';

  constructor(scene: GameScene) {
    this.scene = scene;

    // Définir les achievements
    this.defineAchievements();

    // Charger la progression
    this.loadProgress();

    // Écouter les événements
    this.setupEventListeners();
  }

  /**
   * Définit tous les achievements liés aux armes
   */
  private defineAchievements(): void {
    const achievementList: Achievement[] = [
      // === ARMES EXPÉRIMENTALES ===
      {
        id: 'freeze_master',
        name: 'Maître du Froid',
        description: 'Geler 100 zombies avec le Rayon Glacial',
        icon: '❄️',
        category: 'experimental',
        requirement: 100,
        reward: { type: 'points', value: 500 },
      },
      {
        id: 'gravity_chaos',
        name: 'Chaos Gravitationnel',
        description: 'Faire se percuter 50 zombies avec le Canon Gravitique',
        icon: '🌀',
        category: 'experimental',
        requirement: 50,
        reward: { type: 'points', value: 500 },
      },
      {
        id: 'black_hole_destroyer',
        name: 'Destructeur Cosmique',
        description: 'Éliminer 200 zombies avec les trous noirs',
        icon: '🕳️',
        category: 'experimental',
        requirement: 200,
        reward: { type: 'points', value: 750 },
      },
      {
        id: 'laser_sweep',
        name: 'Balayage Laser',
        description: 'Toucher 10 zombies en un seul tir de Laser Minigun',
        icon: '⚡',
        category: 'experimental',
        requirement: 10,
        reward: { type: 'points', value: 300 },
      },
      {
        id: 'zombie_army',
        name: 'Armée de Zombies',
        description: 'Avoir 3 zombies convertis en même temps',
        icon: '☮️',
        category: 'experimental',
        requirement: 3,
        reward: { type: 'points', value: 400 },
      },
      {
        id: 'converter_mastery',
        name: 'Maître Convertisseur',
        description: 'Convertir 100 zombies au total',
        icon: '🔄',
        category: 'experimental',
        requirement: 100,
        reward: { type: 'unlock', value: 'zombieConverter' },
      },
      {
        id: 'experimental_collector',
        name: 'Collectionneur Expérimental',
        description: 'Débloquer toutes les armes expérimentales',
        icon: '🏆',
        category: 'experimental',
        requirement: 5,
        reward: { type: 'cosmetic', value: 'golden_aura' },
      },

      // === ARMES DE MÊLÉE ===
      {
        id: 'melee_combo_10',
        name: 'Combo de Mêlée',
        description: 'Enchaîner 10 kills à la mêlée sans prendre de dégâts',
        icon: '⚔️',
        category: 'melee',
        requirement: 10,
        reward: { type: 'points', value: 200 },
      },
      {
        id: 'katana_master',
        name: 'Maître du Katana',
        description: 'Réaliser 50 coups critiques avec le Katana',
        icon: '🗡️',
        category: 'melee',
        requirement: 50,
        reward: { type: 'points', value: 400 },
      },
      {
        id: 'sledge_stunner',
        name: 'Étourdisseur',
        description: 'Étourdir 100 zombies avec le Marteau',
        icon: '🔨',
        category: 'melee',
        requirement: 100,
        reward: { type: 'points', value: 350 },
      },
      {
        id: 'chainsaw_massacre',
        name: 'Massacre à la Tronçonneuse',
        description: 'Éliminer 30 zombies avec une seule charge de carburant',
        icon: '🪚',
        category: 'melee',
        requirement: 30,
        reward: { type: 'points', value: 500 },
      },

      // === ARMES À DISTANCE ===
      {
        id: 'sniper_precision',
        name: 'Sniper d\'Élite',
        description: 'Réaliser 25 headshots consécutifs',
        icon: '🎯',
        category: 'ranged',
        requirement: 25,
        reward: { type: 'points', value: 400 },
      },
      {
        id: 'shotgun_crowd',
        name: 'Foule Contrôlée',
        description: 'Toucher 5 zombies avec un seul tir de Shotgun',
        icon: '💥',
        category: 'ranged',
        requirement: 5,
        reward: { type: 'points', value: 200 },
      },
      {
        id: 'grenade_expert',
        name: 'Expert en Explosifs',
        description: 'Éliminer 8 zombies avec une seule grenade',
        icon: '💣',
        category: 'ranged',
        requirement: 8,
        reward: { type: 'points', value: 350 },
      },

      // === ARMES SPÉCIALES ===
      {
        id: 'tesla_chain',
        name: 'Réaction en Chaîne',
        description: 'Toucher 6 zombies avec un seul arc Tesla',
        icon: '⚡',
        category: 'special',
        requirement: 6,
        reward: { type: 'points', value: 300 },
      },
      {
        id: 'flamethrower_inferno',
        name: 'Inferno',
        description: 'Avoir 15 zombies en feu simultanément',
        icon: '🔥',
        category: 'special',
        requirement: 15,
        reward: { type: 'points', value: 350 },
      },
    ];

    for (const achievement of achievementList) {
      this.achievements.set(achievement.id, achievement);
    }
  }

  /**
   * Charge la progression depuis le localStorage
   */
  private loadProgress(): void {
    try {
      const saved = localStorage.getItem(WeaponAchievementSystem.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        for (const [id, data] of Object.entries(parsed)) {
          this.progress.set(id, data as AchievementProgress);
        }
      }
    } catch (e) {
      console.warn('Erreur lors du chargement des achievements:', e);
    }

    // Initialiser les achievements manquants
    for (const id of this.achievements.keys()) {
      if (!this.progress.has(id)) {
        this.progress.set(id, { achieved: false, progress: 0 });
      }
    }
  }

  /**
   * Sauvegarde la progression
   */
  private saveProgress(): void {
    try {
      const toSave: Record<string, AchievementProgress> = {};
      for (const [id, data] of this.progress.entries()) {
        toSave[id] = data;
      }
      localStorage.setItem(WeaponAchievementSystem.STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.warn('Erreur lors de la sauvegarde des achievements:', e);
    }
  }

  /**
   * Configure les écouteurs d'événements
   */
  private setupEventListeners(): void {
    // Événements de gel
    this.scene.events.on('zombieFrozen', () => this.incrementProgress('freeze_master'));

    // Événements de collision gravitationnelle
    this.scene.events.on('gravityCollision', () => this.incrementProgress('gravity_chaos'));

    // Événements de trou noir
    this.scene.events.on('blackHoleKill', () => this.incrementProgress('black_hole_destroyer'));

    // Événements de laser (touche multiple)
    this.scene.events.on('laserMultiHit', (count: number) => {
      const current = this.progress.get('laser_sweep')?.progress || 0;
      if (count > current) {
        this.setProgress('laser_sweep', count);
      }
    });

    // Événements de conversion
    this.scene.events.on('zombieConverted', () => this.incrementProgress('converter_mastery'));
    this.scene.events.on('convertedCount', (count: number) => {
      const current = this.progress.get('zombie_army')?.progress || 0;
      if (count > current) {
        this.setProgress('zombie_army', count);
      }
    });

    // Déblocage d'armes
    this.scene.events.on('weaponUnlocked', () => {
      this.incrementProgress('experimental_collector');
    });

    // Mêlée
    this.scene.events.on('meleeKillStreak', (count: number) => {
      const current = this.progress.get('melee_combo_10')?.progress || 0;
      if (count > current) {
        this.setProgress('melee_combo_10', count);
      }
    });

    this.scene.events.on('katanaCrit', () => this.incrementProgress('katana_master'));
    this.scene.events.on('sledgeStun', () => this.incrementProgress('sledge_stunner'));
    this.scene.events.on('chainsawKillStreak', (count: number) => {
      const current = this.progress.get('chainsaw_massacre')?.progress || 0;
      if (count > current) {
        this.setProgress('chainsaw_massacre', count);
      }
    });

    // Armes à distance
    this.scene.events.on('headshot', () => this.incrementProgress('sniper_precision'));
    this.scene.events.on('shotgunMultiHit', (count: number) => {
      const current = this.progress.get('shotgun_crowd')?.progress || 0;
      if (count > current) {
        this.setProgress('shotgun_crowd', count);
      }
    });
    this.scene.events.on('grenadeMultiKill', (count: number) => {
      const current = this.progress.get('grenade_expert')?.progress || 0;
      if (count > current) {
        this.setProgress('grenade_expert', count);
      }
    });

    // Armes spéciales
    this.scene.events.on('teslaChainHit', (count: number) => {
      const current = this.progress.get('tesla_chain')?.progress || 0;
      if (count > current) {
        this.setProgress('tesla_chain', count);
      }
    });
    this.scene.events.on('burningZombies', (count: number) => {
      const current = this.progress.get('flamethrower_inferno')?.progress || 0;
      if (count > current) {
        this.setProgress('flamethrower_inferno', count);
      }
    });
  }

  /**
   * Incrémente la progression d'un achievement
   */
  public incrementProgress(achievementId: string, amount: number = 1): void {
    const achievement = this.achievements.get(achievementId);
    const progressData = this.progress.get(achievementId);

    if (!achievement || !progressData || progressData.achieved) return;

    progressData.progress += amount;

    if (progressData.progress >= achievement.requirement) {
      this.unlockAchievement(achievementId);
    }

    this.saveProgress();
  }

  /**
   * Définit la progression d'un achievement
   */
  public setProgress(achievementId: string, value: number): void {
    const achievement = this.achievements.get(achievementId);
    const progressData = this.progress.get(achievementId);

    if (!achievement || !progressData || progressData.achieved) return;

    progressData.progress = value;

    if (progressData.progress >= achievement.requirement) {
      this.unlockAchievement(achievementId);
    }

    this.saveProgress();
  }

  /**
   * Débloque un achievement
   */
  private unlockAchievement(achievementId: string): void {
    const achievement = this.achievements.get(achievementId);
    const progressData = this.progress.get(achievementId);

    if (!achievement || !progressData || progressData.achieved) return;

    progressData.achieved = true;
    progressData.achievedAt = Date.now();

    // Appliquer la récompense
    if (achievement.reward) {
      this.applyReward(achievement.reward);
    }

    // Afficher la notification
    this.showAchievementNotification(achievement);

    // Émettre l'événement
    this.scene.events.emit('achievementUnlocked', achievement);

    this.saveProgress();
  }

  /**
   * Applique une récompense
   */
  private applyReward(reward: Achievement['reward']): void {
    if (!reward) return;

    switch (reward.type) {
      case 'points':
        const economySystem = this.scene.getEconomySystem?.();
        if (economySystem) {
          economySystem.addPoints(reward.value as number);
        }
        break;

      case 'unlock':
        this.scene.events.emit('achievementUnlock', reward.value);
        break;

      case 'cosmetic':
        // Stocker le cosmétique débloqué
        const cosmetics = JSON.parse(localStorage.getItem('zombieHunter_cosmetics') || '[]');
        if (!cosmetics.includes(reward.value)) {
          cosmetics.push(reward.value);
          localStorage.setItem('zombieHunter_cosmetics', JSON.stringify(cosmetics));
        }
        break;
    }
  }

  /**
   * Affiche la notification d'achievement
   */
  private showAchievementNotification(achievement: Achievement): void {
    const centerX = this.scene.cameras.main.centerX;
    const y = 100;

    // Fond
    const bg = this.scene.add.rectangle(centerX, y, 320, 70, 0x000000, 0.9);
    bg.setStrokeStyle(2, 0xffdd00, 1);
    bg.setDepth(150);

    // Icône
    const icon = this.scene.add.text(centerX - 130, y, achievement.icon, {
      fontSize: '32px',
    });
    icon.setOrigin(0.5);
    icon.setDepth(151);

    // Titre "ACHIEVEMENT"
    const title = this.scene.add.text(centerX + 10, y - 15, 'ACHIEVEMENT DÉBLOQUÉ!', {
      fontSize: '12px',
      color: '#ffdd00',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    title.setDepth(151);

    // Nom de l'achievement
    const name = this.scene.add.text(centerX + 10, y + 10, achievement.name, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    name.setOrigin(0.5);
    name.setDepth(151);

    // Animation d'entrée
    const elements = [bg, icon, title, name];
    elements.forEach((el) => {
      el.setAlpha(0);
      el.setScale(0.5);
    });

    this.scene.tweens.add({
      targets: elements,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Animation de sortie après 4 secondes
    this.scene.time.delayedCall(4000, () => {
      this.scene.tweens.add({
        targets: elements,
        alpha: 0,
        y: y - 50,
        duration: 500,
        onComplete: () => {
          elements.forEach((el) => el.destroy());
        },
      });
    });
  }

  /**
   * Retourne tous les achievements
   */
  public getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * Retourne les achievements par catégorie
   */
  public getAchievementsByCategory(category: Achievement['category']): Achievement[] {
    return Array.from(this.achievements.values()).filter((a) => a.category === category);
  }

  /**
   * Retourne la progression d'un achievement
   */
  public getProgress(achievementId: string): AchievementProgress | undefined {
    return this.progress.get(achievementId);
  }

  /**
   * Retourne le nombre d'achievements débloqués
   */
  public getUnlockedCount(): number {
    return Array.from(this.progress.values()).filter((p) => p.achieved).length;
  }

  /**
   * Retourne le nombre total d'achievements
   */
  public getTotalCount(): number {
    return this.achievements.size;
  }

  /**
   * Nettoie le système
   */
  public destroy(): void {
    this.scene.events.off('zombieFrozen');
    this.scene.events.off('gravityCollision');
    this.scene.events.off('blackHoleKill');
    this.scene.events.off('laserMultiHit');
    this.scene.events.off('zombieConverted');
    this.scene.events.off('convertedCount');
    this.scene.events.off('weaponUnlocked');
    this.scene.events.off('meleeKillStreak');
    this.scene.events.off('katanaCrit');
    this.scene.events.off('sledgeStun');
    this.scene.events.off('chainsawKillStreak');
    this.scene.events.off('headshot');
    this.scene.events.off('shotgunMultiHit');
    this.scene.events.off('grenadeMultiKill');
    this.scene.events.off('teslaChainHit');
    this.scene.events.off('burningZombies');
  }
}
