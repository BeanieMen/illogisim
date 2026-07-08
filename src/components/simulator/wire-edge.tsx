"use client";

import { useMemo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  useReactFlow
} from "@xyflow/react";
import { useCircuitStore } from "@/store/circuit-store";
import type { WireEdge, WirePoint } from "@/types/circuit";
import { pointsToPath, routeOrthogonal, segmentMidpoints, snapToGrid } from "@/lib/circuit/routing";

const wireColors = {
  1: "#16a34a",
  0: "#2563eb",
  x: "#94a3b8"
} as const;

export function WireEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected
}: EdgeProps<WireEdge>) {
  const { screenToFlowPosition } = useReactFlow();
  const setWireBends = useCircuitStore((state) => state.setWireBends);
  const selectNet = useCircuitStore((state) => state.selectNet);
  const highlightedNetId = useCircuitStore((state) => state.highlightedNetId);
  const points = useMemo(
    () =>
      routeOrthogonal(
        { x: sourceX, y: sourceY },
        { x: targetX, y: targetY },
        data?.bends ?? []
      ),
    [data?.bends, sourceX, sourceY, targetX, targetY]
  );
  const path = pointsToPath(points);
  const color = wireColors[data?.value ?? "x"];
  const isHighlighted = highlightedNetId && highlightedNetId === data?.netId;
  const controls = selected ? data?.bends?.length ? data.bends : points.slice(1, -1) : [];
  const insertionControls = selected && controls.length === 0 ? segmentMidpoints(points) : [];

  function beginBendDrag(index: number, bendSource: WirePoint[]) {
    return (event: React.PointerEvent<SVGCircleElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        const flowPoint = snapToGrid(
          screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY }),
          8
        );
        const next = [...bendSource];
        next[index] = flowPoint;
        setWireBends(id, next);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={18}
        style={{
          stroke: color,
          strokeWidth: selected || isHighlighted ? 4 : 3,
          filter: isHighlighted ? "drop-shadow(0 0 7px rgb(22 163 74 / 0.45))" : undefined
        }}
      />
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        onMouseEnter={() => selectNet(data?.netId ?? null)}
        onMouseLeave={() => selectNet(null)}
      />
      <EdgeLabelRenderer>
        <div className="pointer-events-none absolute">
          {controls.map((point, index) => (
            <svg
              key={`${id}-bend-${index}`}
              className="pointer-events-auto absolute overflow-visible"
              style={{
                transform: `translate(${point.x - 7}px, ${point.y - 7}px)`
              }}
              width={14}
              height={14}
            >
              <circle
                cx={7}
                cy={7}
                r={6}
                className="cursor-grab fill-white stroke-cyan-700 stroke-2 active:cursor-grabbing"
                onPointerDown={beginBendDrag(index, controls)}
              />
            </svg>
          ))}
          {insertionControls.map((point, index) => (
            <svg
              key={`${id}-insert-${index}`}
              className="pointer-events-auto absolute overflow-visible"
              style={{
                transform: `translate(${point.x - 6}px, ${point.y - 6}px)`
              }}
              width={12}
              height={12}
            >
              <circle
                cx={6}
                cy={6}
                r={5}
                className="cursor-grab fill-cyan-50 stroke-cyan-500 stroke-2 active:cursor-grabbing"
                onPointerDown={beginBendDrag(index, insertionControls)}
              />
            </svg>
          ))}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
