"use client";

import type { ConnectionLineComponentProps } from "@xyflow/react";
import { pointsToPath, routeOrthogonal } from "@/lib/circuit/routing";

export function ConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  connectionStatus
}: ConnectionLineComponentProps) {
  const path = pointsToPath(
    routeOrthogonal(
      { x: fromX, y: fromY },
      { x: toX, y: toY }
    )
  );
  const valid = connectionStatus === "valid";

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={valid ? "#16a34a" : "#64748b"}
        strokeDasharray={valid ? undefined : "8 7"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
      />
      <circle
        cx={toX}
        cy={toY}
        r={5}
        fill={valid ? "#16a34a" : "#f8fafc"}
        stroke={valid ? "#15803d" : "#64748b"}
        strokeWidth={2}
      />
    </g>
  );
}
