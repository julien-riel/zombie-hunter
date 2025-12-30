import Phaser from 'phaser';
import type { DDASystem, PerformanceState } from '@systems/DDASystem';
import type { ThreatSystem } from '@systems/ThreatSystem';
import type { WaveSystem, WaveState } from '@systems/WaveSystem';
import type { TelemetryManager } from '@managers/TelemetryManager';

/**
 * Interface pour les données du panneau de stats
 */
export interface StatsPanelData {
  ddaSystem: DDASystem | null;
  threatSystem: ThreatSystem | null;
  waveSystem: WaveSystem | null;
  telemetryManager: TelemetryManager | null;
}

/**
 * Panneau d'affichage des statistiques des systèmes
 * Affiche les métriques du DDASystem, ThreatSystem et WaveSystem
 * Layout en 2 colonnes pour éviter la superposition
 * Accessible via F4
 */
export class StatsPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background!: Phaser.GameObjects.Rectangle;
  private getData: () => StatsPanelData;

  // Text elements - Column 1 (left)
  private headerText!: Phaser.GameObjects.Text;
  private ddaSection!: Phaser.GameObjects.Text;
  private waveSection!: Phaser.GameObjects.Text;

  // Text elements - Column 2 (right)
  private threatSection!: Phaser.GameObjects.Text;
  private telemetrySection!: Phaser.GameObjects.Text;

  private readonly PANEL_WIDTH = 680;
  private readonly COL1_X = 12;
  private readonly COL2_X = 350;
  private readonly COL_WIDTH = 315;

  constructor(scene: Phaser.Scene, getData: () => StatsPanelData) {
    this.scene = scene;
    this.getData = getData;

    this.container = scene.add.container(10, 10);
    this.container.setDepth(1001);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

    this.createPanel();
  }

  /**
   * Crée le panneau avec layout 2 colonnes
   */
  private createPanel(): void {
    // Background (more transparent)
    this.background = this.scene.add.rectangle(0, 0, this.PANEL_WIDTH, 300, 0x000000, 0.4);
    this.background.setOrigin(0, 0);
    this.background.setStrokeStyle(2, 0x00ffff);
    this.container.add(this.background);

    let y = 8;

    // Header (full width)
    this.headerText = this.createText(this.COL1_X, y, 'STATS PANEL (F4 close)', 14, '#00ffff');
    this.container.add(this.headerText);
    y += 24;

    // Full width separator
    this.addSeparator(y, this.COL1_X, this.PANEL_WIDTH - 20);
    y += 8;

    // ========== COLUMN 1 (left): DDA + Wave ==========
    let col1Y = y;

    // DDA Section
    this.ddaSection = this.createText(this.COL1_X, col1Y, '', 11, '#ffff00');
    this.container.add(this.ddaSection);
    col1Y += 200;

    // Separator for column 1
    this.addSeparator(col1Y, this.COL1_X, this.COL_WIDTH);
    col1Y += 12;

    // Wave Section
    this.waveSection = this.createText(this.COL1_X, col1Y, '', 11, '#88ff88');
    this.container.add(this.waveSection);
    col1Y += 180;

    // ========== COLUMN 2 (right): Threat + Telemetry ==========
    let col2Y = y;

    // Threat Section
    this.threatSection = this.createText(this.COL2_X, col2Y, '', 11, '#ff8800');
    this.container.add(this.threatSection);
    col2Y += 200;

    // Separator for column 2
    this.addSeparator(col2Y, this.COL2_X, this.COL_WIDTH);
    col2Y += 12;

    // Telemetry Section
    this.telemetrySection = this.createText(this.COL2_X, col2Y, '', 11, '#ff88ff');
    this.container.add(this.telemetrySection);
    col2Y += 180;

    // Vertical separator between columns
    const vertLine = this.scene.add.rectangle(this.COL2_X - 8, y, 1, Math.max(col1Y, col2Y) - y - 10, 0x444444);
    vertLine.setOrigin(0, 0);
    this.container.add(vertLine);

    // Resize background to fit content
    const maxY = Math.max(col1Y, col2Y);
    this.background.setSize(this.PANEL_WIDTH, maxY + 10);
  }

  /**
   * Crée un texte
   */
  private createText(x: number, y: number, text: string, size: number, color: string): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, text, {
      fontSize: `${size}px`,
      fontFamily: 'monospace',
      color,
      lineSpacing: 4,
    });
  }

  /**
   * Ajoute un séparateur horizontal
   */
  private addSeparator(y: number, x: number, width: number): void {
    const line = this.scene.add.rectangle(x, y, width, 1, 0x444444);
    line.setOrigin(0, 0);
    this.container.add(line);
  }

  /**
   * Met à jour l'affichage
   */
  public update(): void {
    if (!this.container.visible) return;

    const data = this.getData();
    this.updateDDASection(data.ddaSystem);
    this.updateWaveSection(data.waveSystem);
    this.updateThreatSection(data.threatSystem, data.waveSystem);
    this.updateTelemetrySection(data.telemetryManager);
  }

  /**
   * Met à jour la section DDA (colonne 1)
   */
  private updateDDASection(dda: DDASystem | null): void {
    if (!dda) {
      this.ddaSection.setText('DDA SYSTEM\n  Not available');
      return;
    }

    const modifiers = dda.getModifiers();
    const performance = dda.evaluatePerformance();
    const history = dda.getAdjustmentHistory();

    const lines: string[] = ['DDA SYSTEM'];
    lines.push(`  Enabled: ${dda.isEnabled() ? 'ON' : 'OFF'}`);
    lines.push(`  Performance: ${this.formatPerformance(performance)}`);
    lines.push('');
    lines.push('  Modifiers:');
    lines.push(`    Spawn Delay: ${this.formatPercent(modifiers.spawnDelayMultiplier)}`);
    lines.push(`    Budget:      ${this.formatPercent(modifiers.budgetMultiplier)}`);
    lines.push(`    Drop Rate:   ${this.formatPercent(modifiers.dropRateMultiplier)}`);

    // Last adjustments
    if (history.length > 0) {
      lines.push('');
      lines.push('  Recent Adjustments:');
      const recent = history.slice(-2);
      for (const adj of recent) {
        const ago = Math.round((Date.now() - adj.timestamp) / 1000);
        lines.push(`    ${ago}s: ${adj.state} -> ${adj.action}`);
      }
    }

    this.ddaSection.setText(lines.join('\n'));
  }

  /**
   * Met à jour la section Wave (colonne 1)
   */
  private updateWaveSection(wave: WaveSystem | null): void {
    if (!wave) {
      this.waveSection.setText('WAVE SYSTEM\n  Not available');
      return;
    }

    const currentWave = wave.getCurrentWave();
    const state = wave.getState();
    const remaining = wave.getZombiesRemaining();
    const config = wave.getWaveConfig();
    const isBossActive = wave.isBossActive();

    const lines: string[] = ['WAVE SYSTEM'];
    lines.push(`  Wave: ${currentWave}  State: ${this.formatState(state)}`);
    lines.push(`  Boss Active: ${isBossActive ? 'YES' : 'NO'}`);

    if (config) {
      lines.push('');
      lines.push(`  Zombies: ${remaining} / ${config.totalZombies}`);
      lines.push(`  Active Doors: ${config.activeDoors}`);

      // Composition breakdown
      if (config.composition) {
        const counts = config.composition.zombieCounts;
        const nonZero = Object.entries(counts).filter(([_, v]) => v > 0);
        if (nonZero.length > 0) {
          lines.push('');
          lines.push('  Composition:');
          const compStr = nonZero.map(([k, v]) => `${k.slice(0, 4)}:${v}`).join(' ');
          lines.push(`    ${compStr}`);
        }
      }
    }

    this.waveSection.setText(lines.join('\n'));
  }

  /**
   * Met à jour la section Threat (colonne 2)
   */
  private updateThreatSection(threat: ThreatSystem | null, wave: WaveSystem | null): void {
    if (!threat) {
      this.threatSection.setText('THREAT SYSTEM\n  Not available');
      return;
    }

    const config = threat.getConfig();
    const waveConfig = wave?.getWaveConfig();
    const currentWave = wave?.getCurrentWave() || 1;
    const budget = threat.getBudget(currentWave);

    const lines: string[] = ['THREAT SYSTEM'];
    lines.push(`  Wave Budget: ${budget.toFixed(1)}`);

    if (waveConfig?.composition) {
      const comp = waveConfig.composition;
      lines.push(`  Spent: ${comp.spentBudget.toFixed(1)} / ${comp.totalBudget.toFixed(1)}`);
    }

    lines.push('');
    lines.push('  Role Caps (max):');
    lines.push(`    Fodder:${config.roleCaps.fodder} Rusher:${config.roleCaps.rusher}`);
    lines.push(`    Tank:${config.roleCaps.tank} Ranged:${config.roleCaps.ranged}`);
    lines.push(`    Special: ${config.roleCaps.special}`);

    this.threatSection.setText(lines.join('\n'));
  }

  /**
   * Met à jour la section Telemetry (colonne 2)
   */
  private updateTelemetrySection(telemetry: TelemetryManager | null): void {
    if (!telemetry) {
      this.telemetrySection.setText('TELEMETRY\n  Not available');
      return;
    }

    const metrics = telemetry.getRealtimeMetrics();

    const lines: string[] = ['TELEMETRY (30s window)'];
    lines.push('');
    lines.push(`  Accuracy:    ${(metrics.accuracy * 100).toFixed(1)}%`);
    lines.push(`  Damage/min:  ${metrics.damageTakenPerMin.toFixed(1)}`);
    lines.push(`  Kills/min:   ${metrics.killsPerMin.toFixed(1)}`);
    lines.push(`  Dash/min:    ${metrics.dashUsagePerMin.toFixed(1)}`);
    lines.push('');
    lines.push(`  Health:      ${(metrics.currentHealthPercent * 100).toFixed(0)}%`);
    lines.push(`  Near Deaths: ${metrics.nearDeaths}`);
    lines.push(`  Survival:    ${this.formatTime(metrics.survivalTime)}`);
    lines.push(`  Avg Clear:   ${metrics.avgWaveClearTime > 0 ? metrics.avgWaveClearTime.toFixed(1) + 's' : 'N/A'}`);

    this.telemetrySection.setText(lines.join('\n'));
  }

  /**
   * Formate un pourcentage
   */
  private formatPercent(value: number): string {
    const percent = (value * 100).toFixed(0);
    if (value > 1) return `${percent}% +`;
    if (value < 1) return `${percent}% -`;
    return `${percent}%`;
  }

  /**
   * Formate l'état de performance
   */
  private formatPerformance(state: PerformanceState): string {
    switch (state) {
      case 'struggling':
        return 'STRUGGLING';
      case 'dominating':
        return 'DOMINATING';
      case 'neutral':
        return 'NEUTRAL';
      default:
        return state;
    }
  }

  /**
   * Formate l'état de la vague
   */
  private formatState(state: WaveState): string {
    return state.toUpperCase();
  }

  /**
   * Formate un temps en secondes
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Affiche ou masque le panneau
   */
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
    if (visible) {
      this.update();
    }
  }

  /**
   * Toggle la visibilité
   */
  public toggle(): void {
    this.setVisible(!this.container.visible);
  }

  /**
   * Vérifie si le panneau est visible
   */
  public isVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Nettoie les ressources
   */
  public destroy(): void {
    this.container.destroy();
  }
}
