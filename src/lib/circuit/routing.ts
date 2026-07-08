import type { XYPosition } from "@xyflow/react";
import type { WirePoint } from "@/types/circuit";

const MIN_LEG = 36;

export function routeOrthogonal(
  source: XYPosition,
  target: XYPosition,
  bends: WirePoint[] = []
): WirePoint[] {
  if (bends.length > 0) {
    return [source, ...bends, target];
  }

  const horizontalGap = Math.abs(target.x - source.x);
  const midX =
    horizontalGap < MIN_LEG * 2
      ? Math.max(source.x, target.x) + MIN_LEG
      : source.x + (target.x - source.x) / 2;

  return [
    source,
    { x: midX, y: source.y },
    { x: midX, y: target.y },
    target
  ];
}

export function pointsToPath(points: WirePoint[]) {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(" ")}`;
}

export function segmentMidpoints(points: WirePoint[]) {
  const midpoints: WirePoint[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    midpoints.push({
      x: start.x + (end.x - start.x) / 2,
      y: start.y + (end.y - start.y) / 2
    });
  }

  return midpoints;
}

export function snapToGrid(point: XYPosition, gridSize = 16): XYPosition {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  };
}

export function pointKey(point: XYPosition) {
  return `${Math.round(point.x)}:${Math.round(point.y)}`;
}
