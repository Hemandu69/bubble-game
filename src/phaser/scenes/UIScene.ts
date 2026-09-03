import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { audioManager } from '../appState';

interface HudPayload {
  level: number;
  score: number;
  combo: number;
  label?: string;
  tierName: string;
}

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private topBar!: Phaser.GameObjects.Rectangle;
  private pauseBtn!: Phaser.GameObjects.Text;
  private restartBtn!: Phaser.GameObjects.Text;
  private overlay: Phaser.GameObjects.Container | null = null;
  private paused = false;

  constructor() {
    super('UI');
  }

  create(): void {
    const gameScene = this.scene.get('Game') as GameScene;

    this.topBar = this.add.rectangle(this.scale.width / 2, 60, this.scale.width, 120, 0x140a30, 0.55).setOrigin(0.5);

    this.levelText = this.add.text(24, 34, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: '#ffffff',
    });

    this.scoreText = this.add.text(24, 68, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#ffe08a',
    });

    this.pauseBtn = this.createIconButton(this.scale.width - 60, 60, '⏸', () => this.togglePause(gameScene));
    this.restartBtn = this.createIconButton(this.scale.width - 130, 60, '↻', () => {
      audioManager.play('uiClick');
      this.closeOverlay();
      gameScene.restartLevel();
    });

    gameScene.events.on('hud', (payload: HudPayload) => this.updateHud(payload));
    gameScene.events.on('levelComplete', (payload: { score: number; stars: number; level: number }) =>
      this.showLevelComplete(gameScene, payload),
    );
    gameScene.events.on('gameOver', (payload: { score: number; level: number }) => this.showGameOver(gameScene, payload));

    const onResize = (gameSize: Phaser.Structs.Size) => this.handleResize(gameSize);
    this.scale.on('resize', onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      gameScene.events.off('hud');
      gameScene.events.off('levelComplete');
      gameScene.events.off('gameOver');
      this.scale.off('resize', onResize);
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    this.topBar.setPosition(width / 2, 60).setSize(width, 120);
    this.pauseBtn.setPosition(width - 60, 60);
    this.restartBtn.setPosition(width - 130, 60);
    if (this.overlay) {
      this.overlay.setPosition(this.scale.width / 2, this.scale.height / 2 - 60);
    }
  }

  private updateHud(payload: HudPayload): void {
    const title = payload.label ? `${payload.label} · Lv ${payload.level}` : `Level ${payload.level}`;
    this.levelText.setText(title);
    this.scoreText.setText(`Score ${payload.score}`);
  }

  private createIconButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const btn = this.add
      .text(x, y, label, {
        fontFamily: 'Arial',
        fontSize: '30px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      this.tweens.add({ targets: btn, scale: 0.85, duration: 70, yoyo: true });
      onClick();
    });
    return btn;
  }

  private togglePause(gameScene: GameScene): void {
    audioManager.play('uiClick');
    if (this.paused) {
      this.resumeGame();
    } else {
      this.paused = true;
      this.scene.pause('Game');
      this.showPauseMenu(gameScene);
    }
  }

  private resumeGame(): void {
    this.paused = false;
    this.scene.resume('Game');
    this.closeOverlay();
  }

  private showPauseMenu(gameScene: GameScene): void {
    const c = this.buildPanel('PAUSED');
    this.addPanelButton(c, 0, 20, 'Resume', () => this.resumeGame());
    this.addPanelButton(c, 0, 105, 'Restart', () => {
      this.paused = false;
      this.scene.resume('Game');
      this.closeOverlay();
      gameScene.restartLevel();
    });
    this.addPanelButton(c, 0, 190, 'Menu', () => this.quitToMenu(gameScene));
  }

  private showLevelComplete(gameScene: GameScene, payload: { score: number; stars: number; level: number }): void {
    const c = this.buildPanel('LEVEL COMPLETE!');
    const stars = '★'.repeat(payload.stars) + '☆'.repeat(3 - payload.stars);
    c.add(
      this.add
        .text(0, -40, stars, { fontFamily: 'Georgia, serif', fontSize: '44px', color: '#ffe08a' })
        .setOrigin(0.5),
    );
    c.add(
      this.add
        .text(0, 10, `Score ${payload.score}`, { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffffff' })
        .setOrigin(0.5),
    );
    this.addPanelButton(c, 0, 100, 'Next Level', () => {
      this.closeOverlay();
      gameScene.goToNextLevel();
    });
    this.addPanelButton(c, 0, 190, 'Menu', () => this.quitToMenu(gameScene));
  }

  private showGameOver(gameScene: GameScene, payload: { score: number; level: number }): void {
    const c = this.buildPanel('GAME OVER');
    c.add(
      this.add
        .text(0, 0, `Score ${payload.score}`, { fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffffff' })
        .setOrigin(0.5),
    );
    this.addPanelButton(c, 0, 100, 'Retry', () => {
      this.closeOverlay();
      gameScene.restartLevel();
    });
    this.addPanelButton(c, 0, 190, 'Menu', () => this.quitToMenu(gameScene));
  }

  private quitToMenu(gameScene: GameScene): void {
    audioManager.play('uiClick');
    this.closeOverlay();
    gameScene.scene.stop();
    this.scene.stop();
    this.scene.start('Menu');
  }

  private buildPanel(title: string): Phaser.GameObjects.Container {
    this.closeOverlay();
    const container = this.add.container(this.scale.width / 2, this.scale.height / 2 - 60);
    container.setDepth(100);
    this.overlay = container;

    const dim = this.add.rectangle(0, 0, this.scale.width * 4, this.scale.height * 4, 0x0a0e2a, 0.6);
    dim.setInteractive();

    const panel = this.add.graphics();
    panel.fillStyle(0x241154, 0.96);
    panel.fillRoundedRect(-220, -150, 440, 380, 28);
    panel.lineStyle(3, 0xffe08a, 0.8);
    panel.strokeRoundedRect(-220, -150, 440, 380, 28);

    const titleText = this.add
      .text(0, -100, title, {
        fontFamily: 'Georgia, serif',
        fontSize: '32px',
        color: '#ffe08a',
      })
      .setOrigin(0.5);

    container.add([dim, panel, titleText]);
    container.setScale(0.85);
    container.setAlpha(0);
    this.tweens.add({ targets: container, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });

    return container;
  }

  private addPanelButton(container: Phaser.GameObjects.Container, x: number, y: number, label: string, onClick: () => void): void {
    const width = 300;
    const height = 64;
    const bg = this.add.graphics();
    bg.fillStyle(0x7b4fd6, 1);
    bg.fillRoundedRect(x - width / 2, y - height / 2, width, height, 18);
    bg.lineStyle(2, 0xffffff, 0.8);
    bg.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 18);

    const text = this.add
      .text(x, y, label, { fontFamily: 'Georgia, serif', fontSize: '26px', color: '#ffffff' })
      .setOrigin(0.5);

    const zone = this.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      audioManager.play('uiClick');
      this.tweens.add({ targets: [bg, text], scale: 0.94, duration: 60, yoyo: true });
      onClick();
    });

    container.add([bg, text, zone]);
  }

  private closeOverlay(): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }
}
