/**
 * Device-independent gameplay constants. Everything that depends on actual
 * viewport size (grid origin, cell size, columns, shooter position, UI
 * safe area) is computed per-viewport by `computeLayout` in `layout.ts`
 * instead of being hardcoded here.
 */

// Reference cell size the "feel" constants below (speed, muzzle offset) were
// tuned against; actual gameplay always scales these by layout.cellSize / this.
export const REFERENCE_CELL_SIZE = 64;

export const PROJECTILE_SPEED_CELLS_PER_SEC = 1150 / REFERENCE_CELL_SIZE;

export const AIM_MIN_ANGLE_DEG = -168; // measured from +x axis, so this is just past straight-left
export const AIM_MAX_ANGLE_DEG = -12; // just past straight-right
