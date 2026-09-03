import type { Bubble, GridCoord, WorldPoint } from './types';

export interface HexGridConfig {
  /** Number of columns in an even row. Odd rows have one fewer column. */
  cols: number;
  /** Number of rows the grid can ever hold (including headroom below the danger line). */
  rows: number;
  /** Diameter of a bubble / grid cell, in world units. */
  cellSize: number;
  /** World-space top-left origin of the grid. */
  originX?: number;
  originY?: number;
}

/**
 * A staggered hex grid using "odd-r" horizontal offset coordinates: rows run
 * left-to-right, odd rows are shifted right by half a cell so each bubble
 * nestles between the two bubbles above/below it. This mirrors the classic
 * bubble-shooter honeycomb layout while keeping simple integer (row, col)
 * addressing.
 *
 * This class is pure logic with no rendering dependency, so it can be unit
 * tested and reused by any presentation layer.
 */
export class HexGrid {
  readonly cols: number;
  readonly rows: number;
  cellSize: number;
  originX: number;
  originY: number;
  /** Vertical distance between row centers for tightly packed circles. */
  rowHeight: number;

  private cells: Map<string, Bubble> = new Map();

  constructor(config: HexGridConfig) {
    this.cols = config.cols;
    this.rows = config.rows;
    this.cellSize = config.cellSize;
    this.originX = config.originX ?? 0;
    this.originY = config.originY ?? 0;
    this.rowHeight = this.cellSize * (Math.sqrt(3) / 2);
  }

  private key(row: number, col: number): string {
    return `${row},${col}`;
  }

  /** Number of columns available in a given row (odd rows have one fewer). */
  colsInRow(row: number): number {
    return this.isOddRow(row) ? this.cols - 1 : this.cols;
  }

  private isOddRow(row: number): boolean {
    return ((row % 2) + 2) % 2 === 1;
  }

  isValidCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.rows) return false;
    if (col < 0 || col >= this.colsInRow(row)) return false;
    return true;
  }

  isOccupied(row: number, col: number): boolean {
    return this.cells.has(this.key(row, col));
  }

  getBubble(row: number, col: number): Bubble | null {
    return this.cells.get(this.key(row, col)) ?? null;
  }

  setBubble(bubble: Bubble): void {
    if (!this.isValidCell(bubble.row, bubble.col)) {
      throw new Error(`Cannot place bubble at invalid cell (${bubble.row}, ${bubble.col})`);
    }
    this.cells.set(this.key(bubble.row, bubble.col), bubble);
  }

  removeBubble(row: number, col: number): Bubble | null {
    const key = this.key(row, col);
    const bubble = this.cells.get(key) ?? null;
    if (bubble) this.cells.delete(key);
    return bubble;
  }

  clear(): void {
    this.cells.clear();
  }

  /** Every valid neighbor coordinate for a cell, occupied or not. */
  getNeighborCoords(row: number, col: number): GridCoord[] {
    const odd = this.isOddRow(row);
    // odd-r offset neighbor deltas: [dCol, dRow]
    const deltas: [number, number][] = odd
      ? [
          [1, 0],
          [-1, 0],
          [1, -1],
          [0, -1],
          [1, 1],
          [0, 1],
        ]
      : [
          [1, 0],
          [-1, 0],
          [0, -1],
          [-1, -1],
          [0, 1],
          [-1, 1],
        ];

    const result: GridCoord[] = [];
    for (const [dCol, dRow] of deltas) {
      const nRow = row + dRow;
      const nCol = col + dCol;
      if (this.isValidCell(nRow, nCol)) {
        result.push({ row: nRow, col: nCol });
      }
    }
    return result;
  }

  getOccupiedNeighbors(row: number, col: number): Bubble[] {
    return this.getNeighborCoords(row, col)
      .map((c) => this.getBubble(c.row, c.col))
      .filter((b): b is Bubble => b !== null);
  }

  getEmptyNeighbors(row: number, col: number): GridCoord[] {
    return this.getNeighborCoords(row, col).filter((c) => !this.isOccupied(c.row, c.col));
  }

  getAllBubbles(): Bubble[] {
    return Array.from(this.cells.values());
  }

  get bubbleCount(): number {
    return this.cells.size;
  }

  /**
   * Updates the world-space scale/position this grid renders at, without
   * touching occupancy data. Used when the viewport is resized: the puzzle
   * (which cells are occupied, by which colors) doesn't change, only where
   * and how big it's drawn.
   */
  updateLayout(cellSize: number, originX: number, originY: number): void {
    this.cellSize = cellSize;
    this.originX = originX;
    this.originY = originY;
    this.rowHeight = cellSize * (Math.sqrt(3) / 2);
  }

  /** World-space center of a grid cell. */
  gridToWorld(row: number, col: number): WorldPoint {
    const odd = this.isOddRow(row);
    const x = this.originX + col * this.cellSize + this.cellSize / 2 + (odd ? this.cellSize / 2 : 0);
    const y = this.originY + row * this.rowHeight + this.cellSize / 2;
    return { x, y };
  }

  /** Finds the nearest valid cell (occupied or not) to a world point. */
  worldToGrid(x: number, y: number): GridCoord {
    const approxRow = Math.round((y - this.originY - this.cellSize / 2) / this.rowHeight);
    let best: GridCoord | null = null;
    let bestDist = Infinity;

    for (let row = Math.max(0, approxRow - 1); row <= Math.min(this.rows - 1, approxRow + 1); row++) {
      const cols = this.colsInRow(row);
      for (let col = 0; col < cols; col++) {
        const p = this.gridToWorld(row, col);
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = { row, col };
        }
      }
    }

    return best ?? { row: 0, col: 0 };
  }

  /**
   * Finds the best empty cell to snap a projectile into after it collides
   * with `hitCell`, choosing whichever valid empty neighbor is closest to
   * the projectile's world position at the moment of impact.
   */
  findSnapCell(hitCell: GridCoord, approachPoint: WorldPoint): GridCoord | null {
    const candidates = this.getEmptyNeighbors(hitCell.row, hitCell.col);
    if (candidates.length === 0) return null;

    let best = candidates[0];
    let bestDist = Infinity;
    for (const c of candidates) {
      const p = this.gridToWorld(c.row, c.col);
      const dx = p.x - approachPoint.x;
      const dy = p.y - approachPoint.y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    return best;
  }

  /**
   * Last-resort placement lookup: scans every empty cell in the grid and
   * returns whichever is closest to the given world point. Used only when a
   * projectile's natural snap target has no empty neighbors left (a nearly
   * full board).
   */
  findNearestEmptyCell(x: number, y: number): GridCoord | null {
    let best: GridCoord | null = null;
    let bestDist = Infinity;
    for (let row = 0; row < this.rows; row++) {
      const cols = this.colsInRow(row);
      for (let col = 0; col < cols; col++) {
        if (this.isOccupied(row, col)) continue;
        const p = this.gridToWorld(row, col);
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = { row, col };
        }
      }
    }
    return best;
  }

  /** Total pixel width the widest row occupies (used for layout/centering). */
  get pixelWidth(): number {
    return this.cols * this.cellSize;
  }

  get pixelHeight(): number {
    return (this.rows - 1) * this.rowHeight + this.cellSize;
  }
}
