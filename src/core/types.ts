export const BUBBLE_COLORS = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'cyan',
  'orange',
] as const;

export type BubbleColor = (typeof BUBBLE_COLORS)[number];

export interface GridCoord {
  row: number;
  col: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

export interface Bubble {
  id: number;
  row: number;
  col: number;
  color: BubbleColor;
}
