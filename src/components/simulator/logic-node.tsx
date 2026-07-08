"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Circle, Clock, Lightbulb, Power, Square, ToggleLeft, ToggleRight } from "lucide-react";
import { componentDefinitions } from "@/lib/circuit/definitions";
import { cn } from "@/lib/utils";
import { useCircuitStore } from "@/store/circuit-store";
import type { LogicNode, LogicValue, PinSpec } from "@/types/circuit";

function valueLabel(value: LogicValue | undefined) {
  if (value === 1) return "1";
  if (value === 0) return "0";
  return "X";
}

function Pin({
  nodeId,
  pin,
  value,
  side
}: {
  nodeId: string;
  pin: PinSpec;
  value: LogicValue | undefined;
  side: "left" | "right";
}) {
  const isOutput = pin.direction === "output";

  return (
    <div
      className={cn(
        "relative flex h-7 items-center gap-2 text-[11px] font-semibold uppercase text-slate-500",
        side === "right" ? "justify-end pr-3" : "pl-3"
      )}
    >
      {side === "left" ? <span>{pin.label}</span> : null}
      <span
        className={cn(
          "rounded-sm px-1.5 py-0.5 text-[10px]",
          value === 1 && "bg-green-100 text-green-700",
          value === 0 && "bg-blue-100 text-blue-700",
          value === "x" && "bg-slate-100 text-slate-500"
        )}
      >
        {valueLabel(value)}
      </span>
      {side === "right" ? <span>{pin.label}</span> : null}
      <Handle
        id={pin.id}
        type={isOutput ? "source" : "target"}
        position={isOutput ? Position.Right : Position.Left}
        className={cn(
          "!h-4 !w-4 !rounded-full !border-2 !border-white !shadow-md",
          isOutput ? "!right-[-9px] !bg-cyan-600" : "!left-[-9px] !bg-amber-500"
        )}
      />
    </div>
  );
}

export const LogicNodeComponent = memo(function LogicNodeComponent({
  id,
  data,
  selected
}: NodeProps<LogicNode>) {
  const definition = componentDefinitions[data.kind];
  const toggleSource = useCircuitStore((state) => state.toggleSource);
  const outputValue = Object.values(data.outputValues ?? {})[0] ?? data.value;
  const inputValue = Object.values(data.inputValues ?? {})[0] ?? "x";
  const active = outputValue === 1 || inputValue === 1;

  return (
    <div
      className={cn(
        "min-w-[144px] rounded-md border bg-card text-card-foreground shadow-sm transition-shadow",
        selected ? "border-cyan-500 shadow-panel" : "border-slate-300"
      )}
      style={{ borderTopColor: definition.accent, borderTopWidth: 4 }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <NodeIcon kind={data.kind} active={active} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{data.label}</div>
          <div className="truncate text-[11px] text-slate-500">{definition.description}</div>
        </div>
        {["switch", "button"].includes(data.kind) ? (
          <button
            className={cn(
              "nodrag rounded-md border border-slate-200 p-1 transition-colors",
              data.value === 1 ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
            )}
            onClick={() => data.kind === "switch" && toggleSource(id)}
            onPointerDown={() => data.kind === "button" && toggleSource(id, true)}
            onPointerUp={() => data.kind === "button" && toggleSource(id, false)}
            type="button"
          >
            {data.value === 1 ? <ToggleRight className="size-5" /> : <ToggleLeft className="size-5" />}
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-200 px-1 py-2">
        <div className="space-y-1">
          {definition.inputs.map((pin) => (
            <Pin
              key={pin.id}
              nodeId={id}
              pin={pin}
              side="left"
              value={data.inputValues?.[pin.id] ?? "x"}
            />
          ))}
        </div>
        <div className="space-y-1">
          {definition.outputs.map((pin) => (
            <Pin
              key={pin.id}
              nodeId={id}
              pin={pin}
              side="right"
              value={data.outputValues?.[pin.id] ?? data.value ?? "x"}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

function NodeIcon({ kind, active }: { kind: LogicNode["data"]["kind"]; active: boolean }) {
  const className = cn("size-5", active ? "text-green-600" : "text-slate-500");

  if (kind === "led") return <Lightbulb className={className} />;
  if (kind === "clock") return <Clock className={className} />;
  if (kind === "switch") return <Power className={className} />;
  if (kind === "display") return <Square className={className} />;
  return <Circle className={className} />;
}
