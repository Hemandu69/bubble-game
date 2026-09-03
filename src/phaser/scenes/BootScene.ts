import Phaser from 'phaser';
import {
  EFFECTS_SHEET_KEY,
  SHOOTER_KEY,
  GAMEPLAY_BG_KEY,
  MENU_BG_KEY,
  LOGO_KEY,
  registerSheetFrames,
  generateProceduralTextures,
  generateBubbleTextures,
} from '../utils/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    this.load.image(EFFECTS_SHEET_KEY, '/effects/arcade-effects-sheet.png');
    this.load.image(SHOOTER_KEY, '/shooter/bubble-launcher.png');
    this.load.image(GAMEPLAY_BG_KEY, '/backgrounds/gameplay-sky-garden.png');
    this.load.image(MENU_BG_KEY, '/backgrounds/menu-floating-garden.png');
    this.load.image(LOGO_KEY, '/branding/bubble-bloom-logo.png');
  }

  create(): void {
    registerSheetFrames(this);
    generateProceduralTextures(this);
    generateBubbleTextures(this);
    this.scene.start('Menu');
  }
}
