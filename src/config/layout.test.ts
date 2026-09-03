import { describe, expect, it } from 'vitest';
import { computeLayout, relayoutForFixedCols } from './layout';

describe('computeLayout', () => {
  it('treats a portrait viewport as mobile with exactly 10 columns', () => {
    const layout = computeLayout(390, 844);
    expect(layout.isDesktop).toBe(false);
    expect(layout.cols).toBe(10);
  });

  it('treats a landscape/square viewport as desktop', () => {
    expect(computeLayout(1920, 1080).isDesktop).toBe(true);
    expect(computeLayout(800, 800).isDesktop).toBe(true); // square counts as desktop
  });

  it.each([
    [390, 844],
    [430, 932],
    [375, 812],
  ])('mobile %ix%i: grid exactly fits the reported wall bounds with no overlap', (w, h) => {
    const layout = computeLayout(w, h);
    expect(layout.wallRight - layout.wallLeft).toBeCloseTo(layout.cols * layout.cellSize, 5);
  });

  it.each([
    [1920, 1080],
    [1440, 900],
    [1366, 768],
  ])('desktop %ix%i: column count grows within the 12-18 range', (w, h) => {
    const layout = computeLayout(w, h);
    expect(layout.isDesktop).toBe(true);
    expect(layout.cols).toBeGreaterThanOrEqual(12);
    expect(layout.cols).toBeLessThanOrEqual(18);
    expect(layout.cellSize).toBeGreaterThan(0);
    expect(layout.wallRight - layout.wallLeft).toBeCloseTo(layout.cols * layout.cellSize, 5);
  });

  it('desktop uses more columns than mobile for a wide viewport', () => {
    const mobile = computeLayout(390, 844);
    const desktop = computeLayout(1920, 1080);
    expect(desktop.cols).toBeGreaterThan(mobile.cols);
  });

  it('never lets the grid extend past the viewport width', () => {
    for (const [w, h] of [
      [1920, 1080],
      [1366, 768],
      [390, 844],
      [320, 568],
    ]) {
      const layout = computeLayout(w, h);
      expect(layout.wallLeft).toBeGreaterThanOrEqual(0);
      expect(layout.wallRight).toBeLessThanOrEqual(w + 0.01);
    }
  });

  it('keeps UI bar, grid, and shooter stacked in sane vertical order', () => {
    for (const [w, h] of [
      [1920, 1080],
      [390, 844],
    ]) {
      const layout = computeLayout(w, h);
      expect(layout.uiSafeTop).toBeLessThan(layout.gridOriginY);
      expect(layout.gridOriginY).toBeLessThan(layout.shooterY);
      expect(layout.shooterY).toBeLessThan(h);
    }
  });

  it('centers the shooter horizontally', () => {
    const layout = computeLayout(1440, 900);
    expect(layout.shooterX).toBeCloseTo(720, 5);
  });

  it('relayoutForFixedCols preserves the column count across a resize', () => {
    const initial = computeLayout(1920, 1080);
    const resized = relayoutForFixedCols(1366, 768, initial.cols);
    expect(resized.cols).toBe(initial.cols);
    expect(resized.wallRight - resized.wallLeft).toBeCloseTo(resized.cols * resized.cellSize, 5);
  });

  it('relayoutForFixedCols keeps mobile at 10 columns and still fits the width', () => {
    const initial = computeLayout(390, 844);
    const resized = relayoutForFixedCols(430, 932, initial.cols);
    expect(resized.cols).toBe(10);
    expect(resized.wallLeft).toBeGreaterThanOrEqual(0);
    expect(resized.wallRight).toBeLessThanOrEqual(430.01);
  });

  it('relayoutForFixedCols adapts cell size sensibly when the new viewport is much smaller', () => {
    const initial = computeLayout(1920, 1080); // wide desktop, many columns
    const resized = relayoutForFixedCols(1024, 768, initial.cols);
    expect(resized.cellSize).toBeGreaterThan(0);
    expect(resized.wallRight - resized.wallLeft).toBeCloseTo(resized.cols * resized.cellSize, 5);
  });

  it('produces stable, finite numbers for extreme sizes', () => {
    for (const [w, h] of [
      [3840, 2160],
      [280, 280],
      [1024, 1366],
    ]) {
      const layout = computeLayout(w, h);
      for (const value of Object.values(layout)) {
        if (typeof value === 'number') {
          expect(Number.isFinite(value)).toBe(true);
        }
      }
    }
  });
});
