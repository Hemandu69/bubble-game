import Phaser from 'phaser';
import { MENU_BG_KEY, LOGO_KEY } from '../utils/textures';
import { progressManager, audioManager, setActiveLevel } from '../appState';
import { LevelManager } from '../../core/levelManager';

// Base vertical offsets from screen center, at menuScale = 1 (a comfortable
// ~900px-tall reference). menuScale shrinks the whole cluster to fit short
// wide viewports (desktop) without the percentage-of-height math that broke
// down there, while staying ~1 (unchanged) for normal portrait heights.
const LOGO_OFFSET_Y = -260;
const LEVEL_OFFSET_Y = -40;
const BEST_OFFSET_Y = 10;
const PLAY_OFFSET_Y = 100;
const TIER_OFFSET_Y = 220;
const REFERENCE_HEIGHT = 900;
const MIN_MENU_SCALE = 0.55;

function menuScaleFor(height: number): number {
  return Phaser.Math.Clamp(height / REFERENCE_HEIGHT, MIN_MENU_SCALE, 1);
}

export class MenuScene extends Phaser.Scene {
  private bg!: Phaser.GameObjects.Image;
  private logo!: Phaser.GameObjects.Image;
  private levelLabel!: Phaser.GameObjects.Text;
  private bestLabel!: Phaser.GameObjects.Text | null;
  private tierLabel!: Phaser.GameObjects.Text;
  private muteBtn!: Phaser.GameObjects.Text;
  private playButton!: { bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone };

  constructor() {
    super('Menu');
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const s = menuScaleFor(height);
    const cy = height / 2;

    this.bg = this.add.image(width / 2, height / 2, MENU_BG_KEY);
    this.bg.setScale(Math.max(width / this.bg.width, height / this.bg.height));

    this.logo = this.add.image(width / 2, cy + LOGO_OFFSET_Y * s, LOGO_KEY);
    this.logo.setScale(Math.min(1, (width * 0.7) / this.logo.width, (height * 0.32) / this.logo.height));
    this.tweens.add({
      targets: this.logo,
      y: '+=20',
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const level = progressManager.unlockedLevel;
    const best = progressManager.getLevelResult(Math.max(1, level - 1));

    this.levelLabel = this.add
      .text(width / 2, cy + LEVEL_OFFSET_Y * s, `Level ${level}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#ffffff',
        stroke: '#3a1d6b',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.bestLabel = best
      ? this.add
          .text(width / 2, cy + BEST_OFFSET_Y * s, `Best score: ${best.bestScore}`, {
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            color: '#e0d6ff',
          })
          .setOrigin(0.5)
      : null;

    this.playButton = this.createButton(width / 2, cy + PLAY_OFFSET_Y * s, 'PLAY', () => {
      audioManager.unlock();
      audioManager.play('uiClick');
      setActiveLevel(level);
      this.scene.start('Game', { level });
    });

    this.tierLabel = this.add
      .text(width / 2, cy + TIER_OFFSET_Y * s, `Levels 1 - ${LevelManager.maxLevel}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#c9bfe8',
      })
      .setOrigin(0.5);

    this.muteBtn = this.createMuteToggle();

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => this.handleResize(gameSize));
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;
    const s = menuScaleFor(height);
    const cy = height / 2;

    this.bg.setPosition(width / 2, height / 2);
    this.bg.setScale(Math.max(width / this.bg.width, height / this.bg.height));

    this.logo.setPosition(width / 2, cy + LOGO_OFFSET_Y * s);
    this.logo.setScale(Math.min(1, (width * 0.7) / this.logo.width, (height * 0.32) / this.logo.height));

    this.levelLabel.setPosition(width / 2, cy + LEVEL_OFFSET_Y * s);
    this.bestLabel?.setPosition(width / 2, cy + BEST_OFFSET_Y * s);
    this.repositionButton(this.playButton, width / 2, cy + PLAY_OFFSET_Y * s);
    this.tierLabel.setPosition(width / 2, cy + TIER_OFFSET_Y * s);
    this.muteBtn.setPosition(width - 60, 60);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): { bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone } {
    const width = 260;
    const height = 84;
    const bg = this.add.graphics();
    const drawBg = (fill: number) => {
      bg.clear();
      bg.fillStyle(fill, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 24);
      bg.lineStyle(3, 0xffffff, 0.9);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 24);
    };
    bg.setPosition(x, y);
    drawBg(0x7b4fd6);

    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: '34px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const zone = this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => drawBg(0x9269e8));
    zone.on('pointerout', () => drawBg(0x7b4fd6));
    zone.on('pointerdown', () => {
      this.tweens.add({ targets: [bg, text], scale: 0.94, duration: 60, yoyo: true });
      onClick();
    });

    return { bg, text, zone };
  }

  private repositionButton(
    button: { bg: Phaser.GameObjects.Graphics; text: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone },
    x: number,
    y: number,
  ): void {
    button.bg.setPosition(x, y);
    button.bg.clear();
    const width = 260;
    const height = 84;
    button.bg.fillStyle(0x7b4fd6, 1);
    button.bg.fillRoundedRect(-width / 2, -height / 2, width, height, 24);
    button.bg.lineStyle(3, 0xffffff, 0.9);
    button.bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 24);
    button.text.setPosition(x, y);
    button.zone.setPosition(x, y);
  }

  private createMuteToggle(): Phaser.GameObjects.Text {
    const x = this.scale.width - 60;
    const y = 60;
    const label = () => (progressManager.settings.muted ? 'MUTE' : 'SFX');
    const text = this.add
      .text(x, y, label(), {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#3a1d6b',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    text.on('pointerdown', () => {
      const muted = !progressManager.settings.muted;
      progressManager.updateSettings({ muted });
      audioManager.configure(progressManager.settings);
      text.setText(label());
      if (!muted) audioManager.play('uiClick');
    });

    return text;
  }
}
