import type { HexGrid } from './hexGrid';
import type { GridCoord, WorldPoint } from './types';

export interface TrajectorySegment {
  from: WorldPoint;
  to: WorldPoint;
}

export type TrajectoryHitType = 'bubble' | 'ceiling' | 'none';

export interface TrajectoryResult {
  segments: TrajectorySegment[];
  hitType: TrajectoryHitType;
  hitCell?: GridCoord;
  impactPoint: WorldPoint;
  snapCell: GridCoord | null;
}

export interface TrajectoryBounds {
  left: number;
  right: number;
  top: number;
}

export interface SimulateTrajectoryParams {
  origin: WorldPoint;
  direction: WorldPoint;
  grid: HexGrid;
  bubbleRadius: number;
  bounds: TrajectoryBounds;
  maxBounces?: number;
  maxDistance?: number;
}

function normalize(v: WorldPoint): WorldPoint {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

/** Smallest positive t at which a ray from `origin` along unit `dir` hits the circle at `center` with the given radius, or null. */
function raySphereHit(
  origin: WorldPoint,
  dir: WorldPoint,
  center: WorldPoint,
  radius: number,
): number | null {
  const ocx = origin.x - center.x;
  const ocy = origin.y - center.y;
  const b = ocx * dir.x + ocy * dir.y;
  const c = ocx * ocx + ocy * ocy - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const t = -b - sqrtDisc;
  return t > 1e-6 ? t : null;
}

/**
 * Traces a shot from `origin` in `direction`, reflecting off the left/right
 * walls and stopping when it would hit the ceiling or an existing bubble.
 * Used both to render the aiming guide and to drive the live projectile, so
 * the preview and the actual shot always agree.
 */
export function simulateTrajectory(params: SimulateTrajectoryParams): TrajectoryResult {
  const { grid, bubbleRadius, bounds } = params;
  const maxBounces = params.maxBounces ?? 6;
  const maxDistance = params.maxDistance ?? 4000;

  let pos: WorldPoint = { ...params.origin };
  let dir = normalize(params.direction);
  const segments: TrajectorySegment[] = [];
  const occupied = grid.getAllBubbles();

  let remaining = maxDistance;
  let bounces = 0;

  while (remaining > 0 && bounces <= maxBounces) {
    let bestT = Infinity;
    let event: 'left' | 'right' | 'ceiling' | 'bubble' | null = null;
    let hitCell: GridCoord | undefined;

    if (dir.x < -1e-9) {
      const t = (bounds.left + bubbleRadius - pos.x) / dir.x;
      if (t > 1e-6 && t < bestT) {
        bestT = t;
        event = 'left';
      }
    } else if (dir.x > 1e-9) {
      const t = (bounds.right - bubbleRadius - pos.x) / dir.x;
      if (t > 1e-6 && t < bestT) {
        bestT = t;
        event = 'right';
      }
    }

    if (dir.y < -1e-9) {
      const t = (bounds.top + bubbleRadius - pos.y) / dir.y;
      if (t > 1e-6 && t < bestT) {
        bestT = t;
        event = 'ceiling';
      }
    }

    for (const bubble of occupied) {
      const center = grid.gridToWorld(bubble.row, bubble.col);
      const t = raySphereHit(pos, dir, center, bubbleRadius * 2);
      if (t !== null && t < bestT) {
        bestT = t;
        event = 'bubble';
        hitCell = { row: bubble.row, col: bubble.col };
      }
    }

    if (event === null || bestT === Infinity) {
      const t = Math.min(remaining, maxDistance);
      const end = { x: pos.x + dir.x * t, y: pos.y + dir.y * t };
      segments.push({ from: pos, to: end });
      return {
        segments,
        hitType: 'none',
        impactPoint: end,
        snapCell: null,
      };
    }

    const travel = Math.min(bestT, remaining);
    const end = { x: pos.x + dir.x * travel, y: pos.y + dir.y * travel };
    segments.push({ from: pos, to: end });
    remaining -= travel;
    pos = end;

    if (event === 'left' || event === 'right') {
      dir = { x: -dir.x, y: dir.y };
      bounces += 1;
      continue;
    }

    if (event === 'ceiling') {
      const snapCell = resolveCeilingSnapCell(grid, pos);
      return { segments, hitType: 'ceiling', impactPoint: pos, snapCell };
    }

    // event === 'bubble'
    const snapCell = hitCell ? grid.findSnapCell(hitCell, pos) : null;
    return { segments, hitType: 'bubble', hitCell, impactPoint: pos, snapCell };
  }

  const last = segments[segments.length - 1];
  return {
    segments,
    hitType: 'none',
    impactPoint: last ? last.to : pos,
    snapCell: null,
  };
}

function resolveCeilingSnapCell(grid: HexGrid, impact: WorldPoint): GridCoord | null {
  const nearest = grid.worldToGrid(impact.x, impact.y);
  const row = 0;
  if (grid.isValidCell(row, nearest.col) && !grid.isOccupied(row, nearest.col)) {
    return { row, col: nearest.col };
  }
  let bestCol: number | null = null;
  let bestDist = Infinity;
  for (let col = 0; col < grid.colsInRow(row); col++) {
    if (grid.isOccupied(row, col)) continue;
    const p = grid.gridToWorld(row, col);
    const dist = Math.abs(p.x - impact.x);
    if (dist < bestDist) {
      bestDist = dist;
      bestCol = col;
    }
  }
  return bestCol !== null ? { row, col: bestCol } : null;
}
