import Phaser from 'phaser';
import type { TrajectoryResult } from '../../core/trajectory';
import type { HexGrid } from '../../core/hexGrid';
import type { BubbleColor } from '../../core/types';
import { bubbleFrameName, bubbleDisplayScale } from '../utils/textures';

const DOT_SPACING = 24;
const MAX_DOTS = 60;

/**
 * Renders the aiming preview: a dotted path that reflects off the side
 * walls exactly like the real shot will, plus a ghost bubble at the
 * predicted landing cell so the impact area is unambiguous.
 */
export class TrajectoryGuide {
  private dots: Phaser.GameObjects.Image[] = [];
  private ghost: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < MAX_DOTS; i++) {
      const dot = scene.add.image(0, 0, 'aim-dot');
      dot.setVisible(false);
      dot.setDepth(15);
      this.dots.push(dot);
    }
    this.ghost = scene.add.image(0, 0, bubbleFrameName('red'));
    this.ghost.setAlpha(0.45);
    this.ghost.setVisible(false);
    this.ghost.setDepth(14);
  }

  update(result: TrajectoryResult, grid: HexGrid, currentColor: BubbleColor): void {
    let dotIndex = 0;
    for (const segment of result.segments) {
      const dx = segment.to.x - segment.from.x;
      const dy = segment.to.y - segment.from.y;
      const length = Math.hypot(dx, dy);
      const steps = Math.floor(length / DOT_SPACING);
      for (let i = 1; i <= steps && dotIndex < MAX_DOTS; i++) {
        const t = (i * DOT_SPACING) / length;
        const dot = this.dots[dotIndex++];
        dot.setPosition(segment.from.x + dx * t, segment.from.y + dy * t);
        dot.setVisible(true);
        dot.setAlpha(0.85 - (dotIndex / MAX_DOTS) * 0.5);
      }
    }
    for (; dotIndex < MAX_DOTS; dotIndex++) {
      this.dots[dotIndex].setVisible(false);
    }

    if (result.snapCell) {
      const p = grid.gridToWorld(result.snapCell.row, result.snapCell.col);
      this.ghost.setPosition(p.x, p.y);
      this.ghost.setScale(bubbleDisplayScale(grid.cellSize));
      this.ghost.setTexture(bubbleFrameName(currentColor));
      this.ghost.setVisible(true);
    } else {
      this.ghost.setVisible(false);
    }
  }

  hide(): void {
    for (const dot of this.dots) dot.setVisible(false);
    this.ghost.setVisible(false);
  }

  destroy(): void {
    for (const dot of this.dots) dot.destroy();
    this.ghost.destroy();
  }
}
