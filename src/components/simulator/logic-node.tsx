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
  pin,
  value,
  side
}: {
  pin: PinSpec;
  value: LogicValue | undefined;
  side: "left" | "right";
}) {
  const isOutput = pin.direction === "output";

  return (
    <div
      className={cn(
        "relative flex h-7 items-center gap-2 text-[11px] font-semibold uppercase text-slate-400",
        side === "right" ? "justify-end pr-3" : "pl-3"
      )}
    >
      {side === "left" ? <span>{pin.label}</span> : null}
      <span
        className={cn(
          "rounded-sm border px-1.5 py-0.5 text-[10px]",
          value === 1 && "border-green-400/30 bg-green-400/15 text-green-300",
          value === 0 && "border-blue-400/30 bg-blue-400/15 text-blue-300",
          value === "x" && "border-slate-500/30 bg-slate-500/15 text-slate-400"
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
          "!h-4 !w-4 !rounded-full !border-2 !border-slate-950 !shadow-[0_0_18px_rgb(45_212_191/0.18)]",
          isOutput ? "!right-[-9px] !bg-teal-300" : "!left-[-9px] !bg-amber-300"
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
        "min-w-[144px] rounded-md border bg-slate-950/88 text-card-foreground shadow-[0_14px_40px_rgb(0_0_0/0.3)] backdrop-blur transition-shadow",
        selected ? "border-teal-300 shadow-[0_0_0_1px_rgb(45_212_191/0.4),0_18px_60px_rgb(20_184_166/0.16)]" : "border-white/10"
      )}
      style={{ borderTopColor: definition.accent, borderTopWidth: 4 }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <NodeIcon kind={data.kind} active={active} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{data.label}</div>
          <div className="truncate text-[11px] text-slate-400">{definition.description}</div>
        </div>
        {["switch", "button"].includes(data.kind) ? (
          <button
            className={cn(
              "nodrag rounded-md border border-white/10 p-1 transition-colors",
              data.value === 1 ? "bg-green-400/15 text-green-300" : "bg-slate-800 text-slate-400"
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
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 px-1 py-2">
        <div className="space-y-1">
          {definition.inputs.map((pin) => (
            <Pin
              key={pin.id}
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
  const className = cn("size-5", active ? "text-green-300" : "text-slate-500");

  if (kind === "led") return <Lightbulb className={className} />;
  if (kind === "clock") return <Clock className={className} />;
  if (kind === "switch") return <Power className={className} />;
  if (kind === "display") return <Square className={className} />;
  return <Circle className={className} />;
}
