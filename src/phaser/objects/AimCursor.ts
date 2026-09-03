import Phaser from 'phaser';

/**
 * Custom in-game aim/target indicator that tracks the pointer (mouse hover
 * on desktop, touch-drag position on mobile) while the player is aiming.
 * Phaser owns this visual entirely — no DOM cursor is involved — so it
 * looks and behaves identically across input types.
 */
export class AimCursor {
  private ring: Phaser.GameObjects.Image;
  private dot: Phaser.GameObjects.Image;
  private pulseTween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    this.ring = scene.add.image(0, 0, 'aim-ring');
    this.ring.setScale(0.9);
    this.ring.setAlpha(0);
    this.ring.setDepth(20);
    this.ring.setTint(0xffe08a);

    this.dot = scene.add.image(0, 0, 'aim-dot');
    this.dot.setAlpha(0);
    this.dot.setDepth(20);
    this.dot.setTint(0xffe08a);

    this.pulseTween = scene.tweens.add({
      targets: this.ring,
      scale: 1.15,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      paused: true,
    });
  }

  show(x: number, y: number): void {
    this.ring.setPosition(x, y).setAlpha(0.85);
    this.dot.setPosition(x, y).setAlpha(0.9);
    if (this.pulseTween.paused) this.pulseTween.resume();
  }

  hide(): void {
    this.ring.setAlpha(0);
    this.dot.setAlpha(0);
    this.pulseTween.pause();
  }

  destroy(): void {
    this.pulseTween.stop();
    this.ring.destroy();
    this.dot.destroy();
  }
}
