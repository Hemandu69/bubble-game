import Phaser from 'phaser';
import type { HexGrid } from '../../core/hexGrid';
import type { Bubble } from '../../core/types';
import { bubbleFrameName, bubbleDisplayScale, EFFECTS_SHEET_KEY } from '../utils/textures';

/**
 * Owns the visual bubbles that mirror the logical HexGrid: creating,
 * popping, dropping, and repositioning them. The HexGrid never knows this
 * class exists (per the pure-logic / presentation split); GameScene tells
 * this renderer what happened and it handles the sprites and animations.
 */
export class GridRenderer {
  private sprites = new Map<number, Phaser.GameObjects.Image>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly grid: HexGrid,
  ) {}

  /** Initial, non-animated render of every bubble already in the grid. */
  renderInitial(): void {
    for (const bubble of this.grid.getAllBubbles()) {
      this.createSprite(bubble, false);
    }
  }

  private createSprite(bubble: Bubble, dropIn: boolean): Phaser.GameObjects.Image {
    const pos = this.grid.gridToWorld(bubble.row, bubble.col);
    const sprite = this.scene.add.image(pos.x, dropIn ? pos.y - this.grid.cellSize * 2 : pos.y, bubbleFrameName(bubble.color));
    sprite.setScale(bubbleDisplayScale(this.grid.cellSize));
    sprite.setDepth(10);
    this.sprites.set(bubble.id, sprite);
    if (dropIn) {
      this.scene.tweens.add({
        targets: sprite,
        y: pos.y,
        duration: 320,
        ease: 'Bounce.easeOut',
      });
    }
    return sprite;
  }

  /** Adds a newly-placed (shot) bubble with a small pop-in flourish. */
  addBubble(bubble: Bubble): void {
    const pos = this.grid.gridToWorld(bubble.row, bubble.col);
    const targetScale = bubbleDisplayScale(this.grid.cellSize);
    const sprite = this.scene.add.image(pos.x, pos.y, bubbleFrameName(bubble.color));
    sprite.setScale(targetScale * 1.35);
    sprite.setDepth(10);
    this.sprites.set(bubble.id, sprite);
    this.scene.tweens.add({
      targets: sprite,
      scale: targetScale,
      duration: 120,
      ease: 'Quad.easeOut',
    });
  }

  /** Pops the given bubbles: burst particle, scale/fade out, then removes their sprites. */
  popBubbles(bubbles: Bubble[], onComplete: () => void): void {
    if (bubbles.length === 0) {
      onComplete();
      return;
    }
    let remaining = bubbles.length;
    bubbles.forEach((bubble, i) => {
      const sprite = this.sprites.get(bubble.id);
      const pos = this.grid.gridToWorld(bubble.row, bubble.col);
      const burst = this.scene.add.image(pos.x, pos.y, EFFECTS_SHEET_KEY, 'popBurst');
      burst.setScale(0.12).setAlpha(0.95).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({
        targets: burst,
        scale: 0.34,
        alpha: 0,
        duration: 260,
        delay: i * 18,
        ease: 'Quad.easeOut',
        onComplete: () => burst.destroy(),
      });

      if (!sprite) {
        remaining -= 1;
        if (remaining === 0) onComplete();
        return;
      }
      this.sprites.delete(bubble.id);
      this.scene.tweens.add({
        targets: sprite,
        scale: 0,
        alpha: 0,
        duration: 220,
        delay: i * 18,
        ease: 'Back.easeIn',
        onComplete: () => {
          sprite.destroy();
          remaining -= 1;
          if (remaining === 0) onComplete();
        },
      });
    });
  }

  /** Drops detached bubbles off the bottom of the screen with a light tumble. */
  dropBubbles(bubbles: Bubble[], floorY: number, onComplete: () => void): void {
    if (bubbles.length === 0) {
      onComplete();
      return;
    }
    let remaining = bubbles.length;
    for (const bubble of bubbles) {
      const sprite = this.sprites.get(bubble.id);
      if (!sprite) {
        remaining -= 1;
        if (remaining === 0) onComplete();
        continue;
      }
      this.sprites.delete(bubble.id);
      const spinDir = Math.random() < 0.5 ? -1 : 1;
      this.scene.tweens.add({
        targets: sprite,
        y: floorY,
        x: sprite.x + Phaser.Math.Between(-30, 30),
        rotation: spinDir * Phaser.Math.FloatBetween(2, 5),
        alpha: 0,
        duration: 550,
        ease: 'Quad.easeIn',
        onComplete: () => {
          sprite.destroy();
          remaining -= 1;
          if (remaining === 0) onComplete();
        },
      });
    }
  }

  /** After a ceiling-drop shift, moves surviving sprites to their new row and drops in the two fresh rows. */
  syncAfterCeilingShift(onComplete: () => void): void {
    const bubbles = this.grid.getAllBubbles();
    const seenIds = new Set(bubbles.map((b) => b.id));
    for (const [id, sprite] of this.sprites) {
      if (!seenIds.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    }

    let pending = 0;
    const done = () => {
      pending -= 1;
      if (pending <= 0) onComplete();
    };

    for (const bubble of bubbles) {
      const existing = this.sprites.get(bubble.id);
      const pos = this.grid.gridToWorld(bubble.row, bubble.col);
      if (existing) {
        pending += 1;
        this.scene.tweens.add({
          targets: existing,
          x: pos.x,
          y: pos.y,
          duration: 260,
          ease: 'Quad.easeInOut',
          onComplete: done,
        });
      } else {
        pending += 1;
        const sprite = this.createSprite(bubble, true);
        this.scene.time.delayedCall(320, done);
        void sprite;
      }
    }
    if (pending === 0) onComplete();
  }

  clearAll(): void {
    for (const sprite of this.sprites.values()) sprite.destroy();
    this.sprites.clear();
  }

  /** Instantly repositions/rescales every sprite to match the grid's current layout (after a resize). */
  relayout(): void {
    const scale = bubbleDisplayScale(this.grid.cellSize);
    for (const bubble of this.grid.getAllBubbles()) {
      const sprite = this.sprites.get(bubble.id);
      if (!sprite) continue;
      const pos = this.grid.gridToWorld(bubble.row, bubble.col);
      sprite.setPosition(pos.x, pos.y);
      sprite.setScale(scale);
    }
  }
}
