import Phaser from 'phaser';
import type { BubbleColor } from '../../core/types';
import { bubbleFrameName, BUBBLE_TEXTURE_SIZE, SHOOTER_KEY } from '../utils/textures';

const CURRENT_BUBBLE_PX = 72;
const NEXT_BUBBLE_PX = 40;
const currentBubbleScale = CURRENT_BUBBLE_PX / BUBBLE_TEXTURE_SIZE;
const nextBubbleScale = NEXT_BUBBLE_PX / BUBBLE_TEXTURE_SIZE;

const BASE_BARREL_SCALE = 0.22;
const BASE_MUZZLE_Y = -70;
const BASE_CURRENT_BUBBLE_Y = -46;
const BASE_NEXT_BUBBLE_X = 78;
const BASE_NEXT_BUBBLE_Y = 34;
const BASE_NEXT_LABEL_Y = 4;
const BASE_MUZZLE_DIST = 46;

/**
 * The bottom cannon: renders the launcher art, the currently loaded bubble,
 * and a small next-bubble preview. Owns purely visual/animation concerns —
 * which color is "current" vs "next" is decided by GameScene. `scaleFactor`
 * (relative to the reference cell size) lets the whole shooter grow or
 * shrink to match the current viewport's layout without re-tuning every
 * pixel offset by hand.
 */
export class Shooter {
  readonly container: Phaser.GameObjects.Container;
  private barrel: Phaser.GameObjects.Image;
  private currentBubble: Phaser.GameObjects.Image;
  private nextBubble: Phaser.GameObjects.Image;
  private nextLabel: Phaser.GameObjects.Text;
  private muzzle: Phaser.GameObjects.Image;
  private x: number;
  private y: number;
  private scaleFactor: number;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    scaleFactor: number,
  ) {
    this.x = x;
    this.y = y;
    this.scaleFactor = scaleFactor;
    this.container = scene.add.container(x, y);

    this.barrel = scene.add.image(0, 0, SHOOTER_KEY);
    this.barrel.setOrigin(0.5, 0.62);

    this.muzzle = scene.add.image(0, 0, 'aim-ring').setAlpha(0);

    this.currentBubble = scene.add.image(0, 0, bubbleFrameName('red'));

    this.nextBubble = scene.add.image(0, 0, bubbleFrameName('red'));
    this.nextLabel = scene.add
      .text(0, 0, 'NEXT', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.container.add([this.barrel, this.muzzle, this.currentBubble, this.nextBubble, this.nextLabel]);
    this.applyScale();
  }

  private applyScale(): void {
    const s = this.scaleFactor;
    this.barrel.setScale(BASE_BARREL_SCALE * s);
    this.muzzle.setPosition(0, BASE_MUZZLE_Y * s).setScale(1.6 * s);
    this.currentBubble.setPosition(0, BASE_CURRENT_BUBBLE_Y * s).setScale(currentBubbleScale * s);
    this.nextBubble.setPosition(BASE_NEXT_BUBBLE_X * s, BASE_NEXT_BUBBLE_Y * s).setScale(nextBubbleScale * s);
    this.nextLabel.setPosition(BASE_NEXT_BUBBLE_X * s, BASE_NEXT_LABEL_Y * s);
    this.nextLabel.setFontSize(14 * Math.max(0.75, s));
  }

  /** Repositions and rescales the whole shooter (used on viewport resize). */
  setLayout(x: number, y: number, scaleFactor: number): void {
    this.x = x;
    this.y = y;
    this.scaleFactor = scaleFactor;
    this.container.setPosition(x, y);
    this.applyScale();
  }

  setCurrentColor(color: BubbleColor): void {
    this.currentBubble.setTexture(bubbleFrameName(color));
  }

  setNextColor(color: BubbleColor): void {
    this.nextBubble.setTexture(bubbleFrameName(color));
  }

  setAimAngle(angleRad: number): void {
    this.barrel.setRotation(angleRad + Math.PI / 2);
  }

  hideCurrentBubble(): void {
    this.currentBubble.setVisible(false);
  }

  showCurrentBubble(): void {
    this.currentBubble.setVisible(true);
  }

  /** World-space muzzle point the projectile should spawn from, given the barrel's current rotation. */
  getMuzzlePoint(): { x: number; y: number } {
    const angle = this.barrel.rotation - Math.PI / 2;
    const dist = BASE_MUZZLE_DIST * this.scaleFactor;
    return {
      x: this.x + Math.cos(angle) * dist,
      y: this.y + Math.sin(angle) * dist,
    };
  }

  playFireAnimation(): void {
    const s = this.scaleFactor;
    this.scene.tweens.add({
      targets: this.barrel,
      scaleX: 0.19 * s,
      scaleY: 0.25 * s,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    this.container.setY(this.y + 6 * s);
    this.scene.tweens.add({
      targets: this.container,
      y: this.y,
      duration: 140,
      ease: 'Back.easeOut',
    });

    this.muzzle.setAlpha(0.9).setScale(0.6 * s);
    this.scene.tweens.add({
      targets: this.muzzle,
      alpha: 0,
      scale: 1.8 * s,
      duration: 220,
      ease: 'Quad.easeOut',
    });
  }

  /** Animates the next bubble sliding into the current slot after a shot. */
  playReload(newCurrentColor: BubbleColor, newNextColor: BubbleColor): void {
    const s = this.scaleFactor;
    this.currentBubble
      .setVisible(true)
      .setScale(nextBubbleScale * s)
      .setPosition(BASE_NEXT_BUBBLE_X * s, BASE_NEXT_BUBBLE_Y * s);
    this.currentBubble.setTexture(bubbleFrameName(newCurrentColor));
    this.scene.tweens.add({
      targets: this.currentBubble,
      x: 0,
      y: BASE_CURRENT_BUBBLE_Y * s,
      scale: currentBubbleScale * s,
      duration: 220,
      ease: 'Back.easeOut',
    });

    this.nextBubble.setAlpha(0).setTexture(bubbleFrameName(newNextColor));
    this.scene.tweens.add({ targets: this.nextBubble, alpha: 1, duration: 260, delay: 100 });
  }
}
