import Phaser from 'phaser';
import type { BubbleColor } from '../../core/types';

export const EFFECTS_SHEET_KEY = 'effects-sheet';
export const SHOOTER_KEY = 'shooter-launcher';
export const GAMEPLAY_BG_KEY = 'gameplay-bg';
export const MENU_BG_KEY = 'menu-bg';
export const LOGO_KEY = 'bloom-logo';

export function bubbleFrameName(color: BubbleColor): string {
  return `bubble-${color}`;
}

const EFFECT_CELL_SIZE = 512;
const EFFECT_CELLS = {
  ringGlow: [0, 0],
  starBurst: [1, 0],
  swirl: [2, 0],
  popBurst: [0, 1],
  shatter: [1, 1],
  shadowRing: [2, 1],
} as const;

export type EffectFrameName = keyof typeof EFFECT_CELLS;

/** Slices the particle-effect sprite sheet into named frames Phaser can address directly. */
export function registerSheetFrames(scene: Phaser.Scene): void {
  const effectsTexture = scene.textures.get(EFFECTS_SHEET_KEY);
  for (const [name, [col, row]] of Object.entries(EFFECT_CELLS) as [EffectFrameName, [number, number]][]) {
    effectsTexture.add(name, 0, col * EFFECT_CELL_SIZE, row * EFFECT_CELL_SIZE, EFFECT_CELL_SIZE, EFFECT_CELL_SIZE);
  }
}

/**
 * Solid base colors for each bubble, sampled from the clean (non-overlapping)
 * portions of the source art direction. The generated bubble-variants sheet
 * turned out not to lay its second row (purple/cyan/orange) out on a clean
 * non-overlapping grid — adjacent bubbles there genuinely overlap each
 * other in the source pixels, so no crop rectangle can isolate a single
 * color cleanly. Bubbles are instead drawn procedurally at runtime using
 * this palette, guaranteeing every bubble is exactly one solid color.
 */
const BUBBLE_BASE_COLORS: Record<BubbleColor, number> = {
  red: 0xdd0401,
  blue: 0x0163f8,
  green: 0x30ad02,
  yellow: 0xf8ac03,
  purple: 0x8b1fd8,
  cyan: 0x17b8e0,
  orange: 0xff7a1a,
};

export const BUBBLE_TEXTURE_SIZE = 128;

/** Display scale to make a bubble texture render at exactly `cellSize` pixels across. */
export function bubbleDisplayScale(cellSize: number): number {
  return cellSize / BUBBLE_TEXTURE_SIZE;
}

function drawGlossyBubble(scene: Phaser.Scene, key: string, baseColor: number): void {
  const size = BUBBLE_TEXTURE_SIZE;
  const r = size / 2;
  const cx = r;
  const cy = r;

  const base = new Phaser.Display.Color();
  base.setFromRGB(Phaser.Display.Color.IntegerToRGB(baseColor));
  const rim = Phaser.Display.Color.Interpolate.ColorWithColor(base, new Phaser.Display.Color(255, 255, 255), 100, 20);
  const shade = Phaser.Display.Color.Interpolate.ColorWithColor(base, new Phaser.Display.Color(0, 0, 0), 100, 30);

  const g = scene.add.graphics();

  // Darker rim behind the fill gives the sphere a subtle 3D edge.
  g.fillStyle(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b), 1);
  g.fillCircle(cx, cy, r);

  // Main solid-color body.
  g.fillStyle(baseColor, 1);
  g.fillCircle(cx, cy, r * 0.92);

  // Soft bottom-right shading for volume.
  g.fillStyle(Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b), 0.35);
  g.fillEllipse(cx + r * 0.22, cy + r * 0.28, r * 1.15, r * 0.85);
  g.fillStyle(baseColor, 1);
  g.fillCircle(cx, cy, r * 0.78);

  // Broad soft highlight, upper-left.
  g.fillStyle(0xffffff, 0.3);
  g.fillEllipse(cx - r * 0.3, cy - r * 0.32, r * 0.85, r * 0.55);

  // Crisp specular dot.
  g.fillStyle(0xffffff, 0.9);
  g.fillEllipse(cx - r * 0.4, cy - r * 0.44, r * 0.22, r * 0.16);

  // Thin glossy rim stroke.
  g.lineStyle(Math.max(2, r * 0.06), Phaser.Display.Color.GetColor(rim.r, rim.g, rim.b), 0.9);
  g.strokeCircle(cx, cy, r * 0.92);

  g.generateTexture(key, size, size);
  g.destroy();
}

/** Generates one clean, single-color glossy bubble texture per bubble color. */
export function generateBubbleTextures(scene: Phaser.Scene): void {
  for (const [color, hex] of Object.entries(BUBBLE_BASE_COLORS) as [BubbleColor, number][]) {
    const key = bubbleFrameName(color);
    if (!scene.textures.exists(key)) {
      drawGlossyBubble(scene, key, hex);
    }
  }
}

/** Generates small procedural textures (particle dot, aim ring) that don't need real art. */
export function generateProceduralTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists('particle-dot')) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture('particle-dot', 16, 16);
    g.destroy();
  }

  if (!scene.textures.exists('aim-dot')) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('aim-dot', 12, 12);
    g.destroy();
  }

  if (!scene.textures.exists('aim-ring')) {
    const g = scene.add.graphics();
    g.lineStyle(4, 0xffffff, 1);
    g.strokeCircle(24, 24, 20);
    g.generateTexture('aim-ring', 48, 48);
    g.destroy();
  }
}
