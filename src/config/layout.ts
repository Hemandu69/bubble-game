/**
 * Pure viewport -> gameplay-layout computation. No Phaser dependency, so it
 * can be unit tested and reasoned about independently of rendering.
 *
 * Two layout families:
 *  - Portrait/mobile (viewport taller than wide): reproduces the original
 *    fixed 720x1280 design's proportions exactly (same 10 columns, same
 *    margins as fractions of the design canvas), just computed against the
 *    real viewport instead of a letterboxed fixed canvas.
 *  - Desktop/wide (viewport wider than or equal to its height): a
 *    dedicated layout that uses the full viewport, growing the number of
 *    columns with available width so the board reads as a wide arcade
 *    cabinet rather than a stretched phone screen.
 */

export interface GameLayout {
  width: number;
  height: number;
  isDesktop: boolean;
  cols: number;
  rows: number;
  cellSize: number;
  gridOriginX: number;
  gridOriginY: number;
  wallLeft: number;
  wallRight: number;
  ceilingY: number;
  shooterX: number;
  shooterY: number;
  uiSafeTop: number;
}

const BOARD_ROWS = 16;
const MOBILE_COLS = 10;

// Fractions of the original fixed 720x1280 mobile design, preserved exactly.
const MOBILE_SIDE_MARGIN_FRAC = 40 / 720;
const MOBILE_GRID_ORIGIN_Y_FRAC = 150 / 1280;
const MOBILE_SHOOTER_Y_FRAC = 1150 / 1280;
const MOBILE_UI_SAFE_TOP_FRAC = 130 / 1280;

const DESKTOP_MIN_COLS = 12;
const DESKTOP_MAX_COLS = 18;
const DESKTOP_TARGET_CELL_PX = 60;
const DESKTOP_TARGET_VISIBLE_ROWS = 11;
const DESKTOP_MAX_CELL_PX = 92;
const DESKTOP_MIN_CELL_PX = 34;
const DESKTOP_SIDE_MARGIN_FRAC = 0.06;
const DESKTOP_UI_SAFE_TOP_FRAC = 0.09;
const DESKTOP_UI_SAFE_TOP_MIN = 90;
const DESKTOP_SHOOTER_AREA_FRAC = 0.22;
const DESKTOP_SHOOTER_AREA_MIN = 200;

function computeMobileLayout(width: number, height: number): GameLayout {
  const sideMargin = width * MOBILE_SIDE_MARGIN_FRAC;
  const availableWidth = width - sideMargin * 2;
  const cellSize = availableWidth / MOBILE_COLS;
  const gridOriginX = sideMargin;
  const gridOriginY = height * MOBILE_GRID_ORIGIN_Y_FRAC;

  return {
    width,
    height,
    isDesktop: false,
    cols: MOBILE_COLS,
    rows: BOARD_ROWS,
    cellSize,
    gridOriginX,
    gridOriginY,
    wallLeft: gridOriginX,
    wallRight: gridOriginX + MOBILE_COLS * cellSize,
    ceilingY: gridOriginY,
    shooterX: width / 2,
    shooterY: height * MOBILE_SHOOTER_Y_FRAC,
    uiSafeTop: height * MOBILE_UI_SAFE_TOP_FRAC,
  };
}

function computeDesktopLayout(width: number, height: number): GameLayout {
  const uiSafeTop = Math.max(DESKTOP_UI_SAFE_TOP_MIN, height * DESKTOP_UI_SAFE_TOP_FRAC);
  const shooterAreaHeight = Math.max(DESKTOP_SHOOTER_AREA_MIN, height * DESKTOP_SHOOTER_AREA_FRAC);
  const sideMargin = width * DESKTOP_SIDE_MARGIN_FRAC;

  const availableWidth = width - sideMargin * 2;
  const availableHeight = height - uiSafeTop - shooterAreaHeight;

  let cols = Math.round(availableWidth / DESKTOP_TARGET_CELL_PX);
  cols = Math.max(DESKTOP_MIN_COLS, Math.min(DESKTOP_MAX_COLS, cols));

  const cellSizeFromWidth = availableWidth / cols;
  const cellSizeFromHeight = availableHeight / (DESKTOP_TARGET_VISIBLE_ROWS * (Math.sqrt(3) / 2));
  const cellSize = Math.max(
    DESKTOP_MIN_CELL_PX,
    Math.min(DESKTOP_MAX_CELL_PX, cellSizeFromWidth, cellSizeFromHeight),
  );

  const gridWidthUsed = cols * cellSize;
  const gridOriginX = (width - gridWidthUsed) / 2;
  const gridOriginY = uiSafeTop + Math.max(16, height * 0.02);

  return {
    width,
    height,
    isDesktop: true,
    cols,
    rows: BOARD_ROWS,
    cellSize,
    gridOriginX,
    gridOriginY,
    wallLeft: gridOriginX,
    wallRight: gridOriginX + gridWidthUsed,
    ceilingY: gridOriginY,
    shooterX: width / 2,
    shooterY: height - shooterAreaHeight * 0.42,
    uiSafeTop,
  };
}

/** Aspect-ratio based, not device/user-agent based: landscape-or-square => desktop layout. */
export function computeLayout(viewportWidth: number, viewportHeight: number): GameLayout {
  const width = Math.max(280, Math.round(viewportWidth));
  const height = Math.max(280, Math.round(viewportHeight));
  const isDesktop = width >= height;
  return isDesktop ? computeDesktopLayout(width, height) : computeMobileLayout(width, height);
}

/**
 * Recomputes pixel positions/sizes for a viewport change *without* changing
 * the number of columns. The board's column count is chosen once when a
 * level starts (it's baked into that level's deterministic layout); if a
 * live browser resize changed it, the existing grid's occupied cells would
 * no longer line up with valid columns. This keeps the same board shape but
 * rescales and repositions it to fit the new viewport cleanly — used for
 * live window resizes / orientation changes during an active level.
 */
export function relayoutForFixedCols(viewportWidth: number, viewportHeight: number, cols: number): GameLayout {
  const width = Math.max(280, Math.round(viewportWidth));
  const height = Math.max(280, Math.round(viewportHeight));
  const isDesktop = width >= height;

  if (!isDesktop) {
    const base = computeMobileLayout(width, height);
    if (cols === MOBILE_COLS) return base;
    // Extremely unlikely (a desktop-shaped level surviving a resize into
    // portrait), but stay correct: fit the locked column count into the
    // mobile margins instead of silently using the wrong cell size.
    const sideMargin = width * MOBILE_SIDE_MARGIN_FRAC;
    const availableWidth = width - sideMargin * 2;
    const cellSize = availableWidth / cols;
    return { ...base, cols, cellSize, wallRight: base.wallLeft + cols * cellSize };
  }

  const uiSafeTop = Math.max(DESKTOP_UI_SAFE_TOP_MIN, height * DESKTOP_UI_SAFE_TOP_FRAC);
  const shooterAreaHeight = Math.max(DESKTOP_SHOOTER_AREA_MIN, height * DESKTOP_SHOOTER_AREA_FRAC);
  const sideMargin = width * DESKTOP_SIDE_MARGIN_FRAC;
  const availableWidth = width - sideMargin * 2;
  const availableHeight = height - uiSafeTop - shooterAreaHeight;

  const cellSizeFromWidth = availableWidth / cols;
  const cellSizeFromHeight = availableHeight / (DESKTOP_TARGET_VISIBLE_ROWS * (Math.sqrt(3) / 2));
  const cellSize = Math.max(
    DESKTOP_MIN_CELL_PX,
    Math.min(DESKTOP_MAX_CELL_PX, cellSizeFromWidth, cellSizeFromHeight),
  );

  const gridWidthUsed = cols * cellSize;
  const gridOriginX = (width - gridWidthUsed) / 2;
  const gridOriginY = uiSafeTop + Math.max(16, height * 0.02);

  return {
    width,
    height,
    isDesktop: true,
    cols,
    rows: BOARD_ROWS,
    cellSize,
    gridOriginX,
    gridOriginY,
    wallLeft: gridOriginX,
    wallRight: gridOriginX + gridWidthUsed,
    ceilingY: gridOriginY,
    shooterX: width / 2,
    shooterY: height - shooterAreaHeight * 0.42,
    uiSafeTop,
  };
}
