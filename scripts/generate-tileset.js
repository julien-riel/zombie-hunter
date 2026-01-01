/**
 * Script de génération du tileset placeholder pour Tiled
 * Génère zombie_tileset.png (512x384 pixels, 16x12 tuiles de 32x32)
 */

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TILE_SIZE = 32;
const COLS = 16;
const ROWS = 12;
const WIDTH = COLS * TILE_SIZE; // 512
const HEIGHT = ROWS * TILE_SIZE; // 384

// Couleurs par catégorie
const COLORS = {
  // Sol (lignes 0-1)
  FLOOR_DARK: '#2c3e50',
  FLOOR_CONCRETE: '#34495e',
  FLOOR_TILE: '#4a6278',
  FLOOR_GRATE: '#1a252f',
  FLOOR_BLOOD: '#641e16',

  // Murs (lignes 2-3)
  WALL_SOLID: '#7f8c8d',
  WALL_DAMAGED: '#5d6d7e',
  WALL_REINFORCED: '#95a5a6',
  WALL_CORNER: '#616a6b',

  // Portes (ligne 4)
  DOOR_ACTIVE: '#c0392b',
  DOOR_INACTIVE: '#641e16',
  DOOR_OPEN: '#2c3e50',
  DOOR_DESTROYED: '#1a1a1a',

  // Covers (ligne 5)
  COVER_PILLAR: '#8b4513',
  COVER_HALFWALL: '#a0522d',
  COVER_TABLE: '#d2691e',
  COVER_CRATE: '#cd853f',
  COVER_SHELF: '#b8860b',
  COVER_BARRICADE: '#8b7355',

  // Zones terrain (ligne 6)
  ZONE_PUDDLE: '#3498db',
  ZONE_BLOOD: '#8b0000',
  ZONE_DEBRIS: '#6c5b4a',
  ZONE_ELECTRIC: '#f1c40f',
  ZONE_FIRE: '#e74c3c',
  ZONE_ACID: '#27ae60',

  // Interactifs (ligne 7)
  BARREL_EXPLOSIVE: '#e74c3c',
  BARREL_FIRE: '#f39c12',
  SWITCH_ON: '#2ecc71',
  SWITCH_OFF: '#7f8c8d',
  GENERATOR: '#3498db',
  FLAME_TRAP: '#e67e22',
  BLADE_TRAP: '#bdc3c7',

  // Spawns et marqueurs (lignes 8-9)
  SPAWN_PLAYER: '#00bcd4',
  SPAWN_ZOMBIE: '#e74c3c',
  SPAWN_BOSS: '#9c27b0',
  OBJECTIVE: '#ffeb3b',
  CHECKPOINT: '#4caf50',
  TELEPORTER: '#9c27b0',

  // Décoration (lignes 10-11)
  DECOR_LIGHT: '#ffd700',
  DECOR_ALARM: '#ff5722',
  DECOR_WINDOW: '#87ceeb',
  DECOR_VENT: '#455a64',
};

/**
 * Dessine une tuile avec un style distinct
 */
function drawTile(ctx, x, y, color, label = '', style = 'solid') {
  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;

  // Fond
  ctx.fillStyle = color;
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Bordure
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

  // Patterns selon le style
  if (style === 'grid') {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let i = 8; i < TILE_SIZE; i += 8) {
      ctx.beginPath();
      ctx.moveTo(px + i, py);
      ctx.lineTo(px + i, py + TILE_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, py + i);
      ctx.lineTo(px + TILE_SIZE, py + i);
      ctx.stroke();
    }
  } else if (style === 'diagonal') {
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    for (let i = -TILE_SIZE; i < TILE_SIZE * 2; i += 8) {
      ctx.beginPath();
      ctx.moveTo(px + i, py);
      ctx.lineTo(px + i + TILE_SIZE, py + TILE_SIZE);
      ctx.stroke();
    }
  } else if (style === 'circle') {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE/3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (style === 'cross') {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + 8, py + 8);
    ctx.lineTo(px + TILE_SIZE - 8, py + TILE_SIZE - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px + TILE_SIZE - 8, py + 8);
    ctx.lineTo(px + 8, py + TILE_SIZE - 8);
    ctx.stroke();
  } else if (style === 'arrow') {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(px + TILE_SIZE/2, py + 6);
    ctx.lineTo(px + TILE_SIZE - 6, py + TILE_SIZE/2);
    ctx.lineTo(px + TILE_SIZE/2, py + TILE_SIZE - 6);
    ctx.lineTo(px + 6, py + TILE_SIZE/2);
    ctx.closePath();
    ctx.fill();
  }

  // Label
  if (label) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px + TILE_SIZE/2, py + TILE_SIZE/2);
  }
}

/**
 * Génère le tileset complet
 */
function generateTileset() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  // Fond transparent
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // === LIGNE 0-1: Sol (32 tuiles) ===
  // Variations de sol
  for (let i = 0; i < 8; i++) {
    drawTile(ctx, i, 0, COLORS.FLOOR_DARK, '', 'solid');
    drawTile(ctx, i + 8, 0, COLORS.FLOOR_CONCRETE, '', 'solid');
  }
  for (let i = 0; i < 8; i++) {
    drawTile(ctx, i, 1, COLORS.FLOOR_TILE, '', 'grid');
    drawTile(ctx, i + 8, 1, COLORS.FLOOR_GRATE, '', 'diagonal');
  }
  // Sol avec sang
  drawTile(ctx, 0, 1, COLORS.FLOOR_BLOOD, 'B', 'solid');
  drawTile(ctx, 1, 1, COLORS.FLOOR_BLOOD, 'B', 'solid');

  // === LIGNE 2-3: Murs (32 tuiles) ===
  // Murs solides
  for (let i = 0; i < 4; i++) {
    drawTile(ctx, i, 2, COLORS.WALL_SOLID, 'W', 'solid');
  }
  // Murs endommagés
  for (let i = 4; i < 8; i++) {
    drawTile(ctx, i, 2, COLORS.WALL_DAMAGED, 'WD', 'cross');
  }
  // Murs renforcés
  for (let i = 8; i < 12; i++) {
    drawTile(ctx, i, 2, COLORS.WALL_REINFORCED, 'WR', 'grid');
  }
  // Coins
  drawTile(ctx, 12, 2, COLORS.WALL_CORNER, 'NW', 'solid');
  drawTile(ctx, 13, 2, COLORS.WALL_CORNER, 'NE', 'solid');
  drawTile(ctx, 14, 2, COLORS.WALL_CORNER, 'SW', 'solid');
  drawTile(ctx, 15, 2, COLORS.WALL_CORNER, 'SE', 'solid');

  // Ligne 3: Plus de murs
  for (let i = 0; i < 16; i++) {
    drawTile(ctx, i, 3, COLORS.WALL_SOLID, '', 'solid');
  }

  // === LIGNE 4: Portes (16 tuiles) ===
  drawTile(ctx, 0, 4, COLORS.DOOR_ACTIVE, 'DA', 'solid');
  drawTile(ctx, 1, 4, COLORS.DOOR_ACTIVE, 'DA', 'solid');
  drawTile(ctx, 2, 4, COLORS.DOOR_INACTIVE, 'DI', 'solid');
  drawTile(ctx, 3, 4, COLORS.DOOR_INACTIVE, 'DI', 'solid');
  drawTile(ctx, 4, 4, COLORS.DOOR_OPEN, 'DO', 'solid');
  drawTile(ctx, 5, 4, COLORS.DOOR_OPEN, 'DO', 'solid');
  drawTile(ctx, 6, 4, COLORS.DOOR_DESTROYED, 'DD', 'cross');
  drawTile(ctx, 7, 4, COLORS.DOOR_DESTROYED, 'DD', 'cross');
  // Réserve
  for (let i = 8; i < 16; i++) {
    drawTile(ctx, i, 4, '#1a1a1a', '', 'solid');
  }

  // === LIGNE 5: Covers (16 tuiles) ===
  drawTile(ctx, 0, 5, COLORS.COVER_PILLAR, 'PIL', 'solid');
  drawTile(ctx, 1, 5, COLORS.COVER_PILLAR, 'PIL', 'solid');
  drawTile(ctx, 2, 5, COLORS.COVER_HALFWALL, 'HW', 'solid');
  drawTile(ctx, 3, 5, COLORS.COVER_HALFWALL, 'HW', 'solid');
  drawTile(ctx, 4, 5, COLORS.COVER_TABLE, 'TBL', 'solid');
  drawTile(ctx, 5, 5, COLORS.COVER_TABLE, 'TBL', 'solid');
  drawTile(ctx, 6, 5, COLORS.COVER_CRATE, 'CRT', 'grid');
  drawTile(ctx, 7, 5, COLORS.COVER_CRATE, 'CRT', 'grid');
  drawTile(ctx, 8, 5, COLORS.COVER_SHELF, 'SHF', 'diagonal');
  drawTile(ctx, 9, 5, COLORS.COVER_SHELF, 'SHF', 'diagonal');
  drawTile(ctx, 10, 5, COLORS.COVER_BARRICADE, 'BAR', 'cross');
  drawTile(ctx, 11, 5, COLORS.COVER_BARRICADE, 'BAR', 'cross');
  // Réserve
  for (let i = 12; i < 16; i++) {
    drawTile(ctx, i, 5, '#3d3d3d', '', 'solid');
  }

  // === LIGNE 6: Zones terrain (16 tuiles) ===
  drawTile(ctx, 0, 6, COLORS.ZONE_PUDDLE, 'WTR', 'circle');
  drawTile(ctx, 1, 6, COLORS.ZONE_PUDDLE, 'WTR', 'circle');
  drawTile(ctx, 2, 6, COLORS.ZONE_BLOOD, 'BLD', 'circle');
  drawTile(ctx, 3, 6, COLORS.ZONE_BLOOD, 'BLD', 'circle');
  drawTile(ctx, 4, 6, COLORS.ZONE_DEBRIS, 'DBR', 'diagonal');
  drawTile(ctx, 5, 6, COLORS.ZONE_DEBRIS, 'DBR', 'diagonal');
  drawTile(ctx, 6, 6, COLORS.ZONE_ELECTRIC, 'ELC', 'cross');
  drawTile(ctx, 7, 6, COLORS.ZONE_ELECTRIC, 'ELC', 'cross');
  drawTile(ctx, 8, 6, COLORS.ZONE_FIRE, 'FIR', 'circle');
  drawTile(ctx, 9, 6, COLORS.ZONE_FIRE, 'FIR', 'circle');
  drawTile(ctx, 10, 6, COLORS.ZONE_ACID, 'ACD', 'circle');
  drawTile(ctx, 11, 6, COLORS.ZONE_ACID, 'ACD', 'circle');
  // Réserve
  for (let i = 12; i < 16; i++) {
    drawTile(ctx, i, 6, '#2d4a2d', '', 'solid');
  }

  // === LIGNE 7: Interactifs (16 tuiles) ===
  drawTile(ctx, 0, 7, COLORS.BARREL_EXPLOSIVE, 'EXP', 'circle');
  drawTile(ctx, 1, 7, COLORS.BARREL_EXPLOSIVE, 'EXP', 'circle');
  drawTile(ctx, 2, 7, COLORS.BARREL_FIRE, 'FBR', 'circle');
  drawTile(ctx, 3, 7, COLORS.BARREL_FIRE, 'FBR', 'circle');
  drawTile(ctx, 4, 7, COLORS.SWITCH_ON, 'ON', 'solid');
  drawTile(ctx, 5, 7, COLORS.SWITCH_OFF, 'OFF', 'solid');
  drawTile(ctx, 6, 7, COLORS.GENERATOR, 'GEN', 'grid');
  drawTile(ctx, 7, 7, COLORS.GENERATOR, 'GEN', 'grid');
  drawTile(ctx, 8, 7, COLORS.FLAME_TRAP, 'FT', 'arrow');
  drawTile(ctx, 9, 7, COLORS.FLAME_TRAP, 'FT', 'arrow');
  drawTile(ctx, 10, 7, COLORS.BLADE_TRAP, 'BT', 'cross');
  drawTile(ctx, 11, 7, COLORS.BLADE_TRAP, 'BT', 'cross');
  // Réserve
  for (let i = 12; i < 16; i++) {
    drawTile(ctx, i, 7, '#4a3d2d', '', 'solid');
  }

  // === LIGNE 8-9: Spawns et marqueurs (32 tuiles) ===
  drawTile(ctx, 0, 8, COLORS.SPAWN_PLAYER, 'P', 'circle');
  drawTile(ctx, 1, 8, COLORS.SPAWN_PLAYER, 'P', 'circle');
  drawTile(ctx, 2, 8, COLORS.SPAWN_ZOMBIE, 'Z', 'circle');
  drawTile(ctx, 3, 8, COLORS.SPAWN_ZOMBIE, 'Z', 'circle');
  drawTile(ctx, 4, 8, COLORS.SPAWN_BOSS, 'B', 'circle');
  drawTile(ctx, 5, 8, COLORS.SPAWN_BOSS, 'B', 'circle');
  drawTile(ctx, 6, 8, COLORS.OBJECTIVE, 'OBJ', 'arrow');
  drawTile(ctx, 7, 8, COLORS.OBJECTIVE, 'OBJ', 'arrow');
  drawTile(ctx, 8, 8, COLORS.CHECKPOINT, 'CP', 'solid');
  drawTile(ctx, 9, 8, COLORS.CHECKPOINT, 'CP', 'solid');
  drawTile(ctx, 10, 8, COLORS.TELEPORTER, 'TP', 'circle');
  drawTile(ctx, 11, 8, COLORS.TELEPORTER, 'TP', 'circle');
  // Réserve
  for (let i = 12; i < 16; i++) {
    drawTile(ctx, i, 8, '#2d2d4a', '', 'solid');
  }

  // Ligne 9: Plus de marqueurs
  for (let i = 0; i < 16; i++) {
    drawTile(ctx, i, 9, '#2d2d4a', '', 'solid');
  }

  // === LIGNE 10-11: Décoration (32 tuiles) ===
  drawTile(ctx, 0, 10, COLORS.DECOR_LIGHT, 'LT', 'circle');
  drawTile(ctx, 1, 10, COLORS.DECOR_LIGHT, 'LT', 'circle');
  drawTile(ctx, 2, 10, COLORS.DECOR_ALARM, 'ALM', 'circle');
  drawTile(ctx, 3, 10, COLORS.DECOR_ALARM, 'ALM', 'circle');
  drawTile(ctx, 4, 10, COLORS.DECOR_WINDOW, 'WIN', 'grid');
  drawTile(ctx, 5, 10, COLORS.DECOR_WINDOW, 'WIN', 'grid');
  drawTile(ctx, 6, 10, COLORS.DECOR_VENT, 'VNT', 'diagonal');
  drawTile(ctx, 7, 10, COLORS.DECOR_VENT, 'VNT', 'diagonal');
  // Réserve
  for (let i = 8; i < 16; i++) {
    drawTile(ctx, i, 10, '#1a1a2e', '', 'solid');
  }

  // Ligne 11: Réserve
  for (let i = 0; i < 16; i++) {
    drawTile(ctx, i, 11, '#1a1a2e', '', 'solid');
  }

  return canvas;
}

// Génère et sauvegarde le tileset
const canvas = generateTileset();
const buffer = canvas.toBuffer('image/png');

const outputPath = join(__dirname, '../public/assets/tilemaps/zombie_tileset.png');
const outputDir = dirname(outputPath);

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

writeFileSync(outputPath, buffer);
console.log(`Tileset généré: ${outputPath}`);
console.log(`Dimensions: ${WIDTH}x${HEIGHT} (${COLS}x${ROWS} tuiles de ${TILE_SIZE}x${TILE_SIZE})`);
