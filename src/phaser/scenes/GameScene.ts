import Phaser from 'phaser';
import { HexGrid } from '../../core/hexGrid';
import { LevelManager } from '../../core/levelManager';
import { DEFAULT_SALT, type LevelConfig } from '../../core/levelGenerator';
import { findMatchGroup } from '../../core/matching';
import { findFloatingBubbles } from '../../core/floatingClusters';
import { scoreShot } from '../../core/score';
import { simulateTrajectory, type TrajectoryResult } from '../../core/trajectory';
import { insertCeilingRows } from '../../core/ceiling';
import { createLevelRandom, randomChoice, type RandomFn } from '../../core/rng';
import type { Bubble, BubbleColor, WorldPoint } from '../../core/types';
import { computeLayout, relayoutForFixedCols, type GameLayout } from '../../config/layout';
import {
  REFERENCE_CELL_SIZE,
  PROJECTILE_SPEED_CELLS_PER_SEC,
  AIM_MIN_ANGLE_DEG,
  AIM_MAX_ANGLE_DEG,
} from '../../config/gameConfig';
import { GAMEPLAY_BG_KEY, bubbleFrameName, bubbleDisplayScale } from '../utils/textures';
import { prefersReducedMotion } from '../utils/motion';
import { Shooter } from '../objects/Shooter';
import { TrajectoryGuide } from '../objects/TrajectoryGuide';
import { AimCursor } from '../objects/AimCursor';
import { GridRenderer } from '../managers/GridRenderer';
import { progressManager, audioManager } from '../appState';

type SceneState = 'aiming' | 'firing' | 'resolving' | 'levelComplete' | 'gameOver';

const MUZZLE_OFFSET_Y = -60;

export class GameScene extends Phaser.Scene {
  private layout!: GameLayout;
  private bg!: Phaser.GameObjects.Image;

  private levelManager!: LevelManager;
  private grid!: HexGrid;
  private gridRenderer!: GridRenderer;
  private levelConfig!: LevelConfig;
  private levelNumber = 1;

  private shooter!: Shooter;
  private trajectoryGuide!: TrajectoryGuide;
  private aimCursor!: AimCursor;

  private state: SceneState = 'aiming';
  private currentColor: BubbleColor = 'red';
  private nextColor: BubbleColor = 'blue';
  private shotRandom!: RandomFn;
  private ceilingRandom!: RandomFn;
  private nextBubbleId = 1_000_000;

  private score = 0;
  private comboStreak = 0;
  private shotsFired = 0;

  private lastPointer: WorldPoint = { x: 0, y: 0 };
  private lastTrajectory: TrajectoryResult | null = null;
  private aimGestureFromPlayField = false;

  private projectileSprite: Phaser.GameObjects.Image | null = null;
  private projectilePath: TrajectoryResult | null = null;
  private projectileSegmentIndex = 0;
  private projectileSegmentProgress = 0;

  private dangerLine!: Phaser.GameObjects.Graphics;

  constructor() {
    super('Game');
  }

  init(data: { level?: number }): void {
    this.levelNumber = Math.max(1, Math.min(LevelManager.maxLevel, data.level ?? 1));
    this.state = 'aiming';
    this.score = 0;
    this.comboStreak = 0;
    this.shotsFired = 0;
    this.nextBubbleId = 1_000_000;
    this.projectileSprite = null;
    this.projectilePath = null;
    this.aimGestureFromPlayField = false;
  }

  private get scaleFactor(): number {
    return this.layout.cellSize / REFERENCE_CELL_SIZE;
  }

  create(): void {
    this.layout = computeLayout(this.scale.width, this.scale.height);
    this.lastPointer = { x: this.layout.shooterX, y: this.layout.shooterY - 400 };

    this.bg = this.add.image(0, 0, GAMEPLAY_BG_KEY);
    this.bg.setDepth(-10);

    this.levelManager = new LevelManager();
    this.levelConfig = this.levelManager.getLevelData(this.levelNumber, this.layout.cols).config;
    this.grid = this.levelManager.buildGrid(
      this.levelNumber,
      this.layout.cellSize,
      this.layout.gridOriginX,
      this.layout.gridOriginY,
      this.layout.cols,
    );
    this.gridRenderer = new GridRenderer(this, this.grid);
    this.gridRenderer.renderInitial();

    this.dangerLine = this.add.graphics().setDepth(5);

    this.shotRandom = createLevelRandom(`${DEFAULT_SALT}:shots`, this.levelNumber);
    this.ceilingRandom = createLevelRandom(`${DEFAULT_SALT}:ceiling`, this.levelNumber);
    this.currentColor = this.pickShotColor();
    this.nextColor = this.pickShotColor();

    this.shooter = new Shooter(this, this.layout.shooterX, this.layout.shooterY, this.scaleFactor);
    this.shooter.setCurrentColor(this.currentColor);
    this.shooter.setNextColor(this.nextColor);

    this.trajectoryGuide = new TrajectoryGuide(this);
    this.aimCursor = new AimCursor(this);

    this.relayoutVisuals();

    this.input.setDefaultCursor('none');
    // GameScene's input listeners see every pointer event on the canvas,
    // including clicks meant for the UIScene overlay (pause/restart icons,
    // modal buttons) drawn on top of it — both scenes' input plugins process
    // the same browser event independently. Gating on where the gesture
    // *started* (rather than the scene's display list) keeps a tap on a UI
    // icon from also firing a shot, while still letting a drag that ends
    // above the play field (aiming steeply) fire normally on release.
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.lastPointer = { x: pointer.x, y: pointer.y };
      if (this.state !== 'aiming') return;
      const allowed = pointer.isDown ? this.aimGestureFromPlayField : pointer.y >= this.layout.uiSafeTop;
      if (allowed) this.updateAim(pointer.x, pointer.y);
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      audioManager.unlock();
      this.aimGestureFromPlayField = pointer.y >= this.layout.uiSafeTop;
      if (this.state === 'aiming' && this.aimGestureFromPlayField) this.updateAim(pointer.x, pointer.y);
    });
    this.input.on('pointerup', () => {
      if (this.state === 'aiming' && this.aimGestureFromPlayField) this.fire();
      this.aimGestureFromPlayField = false;
    });
    const onGameOut = () => this.aimCursor.hide();
    this.game.events.on('gameout', onGameOut);

    const onResize = (gameSize: Phaser.Structs.Size) => this.handleResize(gameSize);
    this.scale.on('resize', onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown(onGameOut, onResize));
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.teardown(onGameOut, onResize));

    if (!this.scene.isActive('UI')) {
      this.scene.launch('UI');
    }
    this.emitHud();

    this.updateAim(this.lastPointer.x, this.lastPointer.y);
  }

  private teardown(onGameOut: () => void, onResize: (gameSize: Phaser.Structs.Size) => void): void {
    this.input.setDefaultCursor('default');
    this.input.removeAllListeners();
    this.game.events.off('gameout', onGameOut);
    this.scale.off('resize', onResize);
  }

  /** Repositions/rescales everything that depends on `this.layout` (initial create, and after a resize). */
  private relayoutVisuals(): void {
    this.bg.setPosition(this.layout.width / 2, this.layout.height / 2);
    this.bg.setScale(Math.max(this.layout.width / this.bg.width, this.layout.height / this.bg.height));
    this.drawDangerLine();
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    if (!this.layout) return;
    this.layout = relayoutForFixedCols(gameSize.width, gameSize.height, this.layout.cols);
    this.grid.updateLayout(this.layout.cellSize, this.layout.gridOriginX, this.layout.gridOriginY);
    this.gridRenderer.relayout();
    this.shooter.setLayout(this.layout.shooterX, this.layout.shooterY, this.scaleFactor);
    this.relayoutVisuals();
    if (this.state === 'aiming') {
      this.updateAim(this.lastPointer.x, this.lastPointer.y);
    }
  }

  private muzzleOrigin(): WorldPoint {
    return { x: this.layout.shooterX, y: this.layout.shooterY + MUZZLE_OFFSET_Y * this.scaleFactor };
  }

  private pickShotColor(): BubbleColor {
    const present = new Set(this.grid?.getAllBubbles().map((b) => b.color) ?? []);
    const pool = present.size > 0 ? Array.from(present) : this.levelConfig.colors;
    return randomChoice(this.shotRandom, pool);
  }

  private drawDangerLine(): void {
    const y = this.grid.gridToWorld(this.levelConfig.dangerRow, 0).y - this.layout.cellSize / 2;
    this.dangerLine.clear();
    this.dangerLine.lineStyle(3, 0xff5566, 0.55);
    for (let x = this.layout.wallLeft; x < this.layout.wallRight; x += 18) {
      this.dangerLine.lineBetween(x, y, Math.min(x + 10, this.layout.wallRight), y);
    }
  }

  private updateAim(px: number, py: number): void {
    const origin = this.muzzleOrigin();
    const angleDeg = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(origin.x, origin.y, px, py));
    const clampedDeg = Phaser.Math.Clamp(angleDeg, AIM_MIN_ANGLE_DEG, AIM_MAX_ANGLE_DEG);
    const angle = Phaser.Math.DegToRad(clampedDeg);
    this.shooter.setAimAngle(angle);

    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const result = simulateTrajectory({
      origin,
      direction,
      grid: this.grid,
      bubbleRadius: this.layout.cellSize / 2,
      bounds: { left: this.layout.wallLeft, right: this.layout.wallRight, top: this.layout.ceilingY },
    });
    this.lastTrajectory = result;
    this.trajectoryGuide.update(result, this.grid, this.currentColor);
    this.aimCursor.show(px, py);
  }

  private fire(): void {
    if (!this.lastTrajectory) return;
    this.state = 'firing';
    this.shotsFired += 1;
    this.trajectoryGuide.hide();
    this.aimCursor.hide();
    this.shooter.hideCurrentBubble();
    this.shooter.playFireAnimation();
    audioManager.play('shoot');

    this.projectilePath = this.lastTrajectory;
    this.projectileSegmentIndex = 0;
    this.projectileSegmentProgress = 0;
    const origin = this.muzzleOrigin();
    this.projectileSprite = this.add.image(origin.x, origin.y, bubbleFrameName(this.currentColor));
    this.projectileSprite.setScale(bubbleDisplayScale(this.grid.cellSize));
    this.projectileSprite.setDepth(11);
  }

  update(_time: number, delta: number): void {
    if (this.state !== 'firing' || !this.projectilePath || !this.projectileSprite) return;

    const projectileSpeed = PROJECTILE_SPEED_CELLS_PER_SEC * this.layout.cellSize;
    let remaining = (projectileSpeed * delta) / 1000;
    const segments = this.projectilePath.segments;

    while (remaining > 0 && this.projectileSegmentIndex < segments.length) {
      const seg = segments[this.projectileSegmentIndex];
      const segLen = Phaser.Math.Distance.Between(seg.from.x, seg.from.y, seg.to.x, seg.to.y);
      const remainingInSeg = segLen - this.projectileSegmentProgress;

      if (segLen < 1e-6 || remaining < remainingInSeg) {
        this.projectileSegmentProgress += remaining;
        const t = segLen < 1e-6 ? 1 : this.projectileSegmentProgress / segLen;
        this.projectileSprite.setPosition(
          Phaser.Math.Linear(seg.from.x, seg.to.x, t),
          Phaser.Math.Linear(seg.from.y, seg.to.y, t),
        );
        remaining = 0;
      } else {
        remaining -= remainingInSeg;
        this.projectileSegmentIndex += 1;
        this.projectileSegmentProgress = 0;
        if (this.projectileSegmentIndex >= segments.length) {
          this.projectileSprite.setPosition(seg.to.x, seg.to.y);
        }
      }
    }

    this.projectileSprite.rotation += delta * 0.01;

    if (this.projectileSegmentIndex >= segments.length) {
      this.resolveImpact();
    }
  }

  private resolveImpact(): void {
    this.state = 'resolving';
    const result = this.projectilePath!;
    const placedColor = this.currentColor;
    this.projectileSprite?.destroy();
    this.projectileSprite = null;
    this.projectilePath = null;

    let landingCell = result.snapCell;
    if (!landingCell) {
      landingCell = this.grid.findNearestEmptyCell(result.impactPoint.x, result.impactPoint.y);
    }
    if (!landingCell) {
      this.afterResolution();
      return;
    }

    const newBubble: Bubble = {
      id: this.nextBubbleId++,
      row: landingCell.row,
      col: landingCell.col,
      color: placedColor,
    };
    this.grid.setBubble(newBubble);
    this.gridRenderer.addBubble(newBubble);

    const matchGroup = findMatchGroup(this.grid, { row: landingCell.row, col: landingCell.col });
    if (!matchGroup) {
      this.comboStreak = 0;
      this.afterResolution();
      return;
    }

    const matchedBubbles = matchGroup.map((c) => this.grid.getBubble(c.row, c.col)!);
    for (const c of matchGroup) this.grid.removeBubble(c.row, c.col);
    this.comboStreak += 1;

    this.gridRenderer.popBubbles(matchedBubbles, () => {
      audioManager.play(this.comboStreak > 1 ? 'combo' : 'pop');
      if (this.comboStreak > 1 && !prefersReducedMotion) {
        this.cameras.main.shake(120, 0.003);
      }

      const floatingCoords = findFloatingBubbles(this.grid);
      const floatingBubbles = floatingCoords.map((c) => this.grid.getBubble(c.row, c.col)!);
      for (const c of floatingCoords) this.grid.removeBubble(c.row, c.col);

      const scoreResult = scoreShot({
        matchedCount: matchedBubbles.length,
        droppedCount: floatingBubbles.length,
        comboStreak: this.comboStreak,
      });
      this.score += scoreResult.totalScore;
      this.emitHud();
      this.showScorePopup(this.grid.gridToWorld(landingCell.row, landingCell.col), scoreResult.totalScore, this.comboStreak);

      this.gridRenderer.dropBubbles(floatingBubbles, this.layout.height + 80, () => {
        if (floatingBubbles.length > 0) audioManager.play('drop');
        this.afterResolution();
      });
    });
  }

  private afterResolution(): void {
    if (this.grid.bubbleCount === 0) {
      this.triggerLevelComplete();
      return;
    }

    const shotsPerNewRow = this.levelConfig.shotsPerNewRow;
    if (shotsPerNewRow < 999 && this.shotsFired > 0 && this.shotsFired % shotsPerNewRow === 0) {
      const ok = insertCeilingRows(this.grid, this.levelConfig.colors, this.ceilingRandom);
      if (!ok) {
        this.triggerGameOver();
        return;
      }
      this.drawDangerLine();
      this.gridRenderer.syncAfterCeilingShift(() => this.checkDangerAndContinue());
      return;
    }

    this.checkDangerAndContinue();
  }

  private checkDangerAndContinue(): void {
    const dangerRow = this.levelConfig.dangerRow;
    const overflow = this.grid.getAllBubbles().some((b) => b.row >= dangerRow);
    if (overflow) {
      this.triggerGameOver();
      return;
    }
    this.reloadShooter();
  }

  private reloadShooter(): void {
    this.currentColor = this.nextColor;
    this.nextColor = this.pickShotColor();
    this.shooter.playReload(this.currentColor, this.nextColor);
    this.shooter.showCurrentBubble();
    this.state = 'aiming';
    this.updateAim(this.lastPointer.x, this.lastPointer.y);
  }

  private showScorePopup(pos: WorldPoint, amount: number, combo: number): void {
    if (amount <= 0) return;
    const label = combo > 1 ? `+${amount}  x${combo.toFixed(1)}` : `+${amount}`;
    const text = this.add
      .text(pos.x, pos.y, label, {
        fontFamily: 'Georgia, serif',
        fontSize: combo > 1 ? '26px' : '22px',
        color: combo > 1 ? '#ffe08a' : '#ffffff',
        stroke: '#3a1d6b',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(25);
    this.tweens.add({
      targets: text,
      y: pos.y - 70,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private emitHud(): void {
    this.events.emit('hud', {
      level: this.levelNumber,
      score: this.score,
      combo: this.comboStreak,
      nextColor: this.nextColor,
      label: this.levelConfig.label,
      tierName: this.levelConfig.tierName,
    });
  }

  private triggerLevelComplete(): void {
    this.state = 'levelComplete';
    audioManager.play('levelComplete');
    const par = this.levelConfig.startRows * 300;
    let stars = 1;
    if (this.score >= par * 2) stars = 3;
    else if (this.score >= par) stars = 2;
    progressManager.completeLevel(this.levelNumber, this.score, stars);
    this.events.emit('levelComplete', { score: this.score, stars, level: this.levelNumber });
  }

  private triggerGameOver(): void {
    this.state = 'gameOver';
    audioManager.play('gameOver');
    this.events.emit('gameOver', { score: this.score, level: this.levelNumber });
  }

  // --- Public controls used by UIScene ---

  restartLevel(): void {
    this.scene.restart({ level: this.levelNumber });
  }

  goToNextLevel(): void {
    const next = Math.min(LevelManager.maxLevel, this.levelNumber + 1);
    this.scene.restart({ level: next });
  }
}
