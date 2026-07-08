"use client";

import { Boxes, CircuitBoard, MousePointer2 } from "lucide-react";
import { paletteGroups, componentDefinitions } from "@/lib/circuit/definitions";
import type { ComponentKind } from "@/types/circuit";

export function PalettePanel() {
  function onDragStart(event: React.DragEvent<HTMLButtonElement>, kind: ComponentKind) {
    event.dataTransfer.setData("application/x-logic-kind", kind);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-card/95 backdrop-blur md:w-72">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-2 text-base font-bold">
          <CircuitBoard className="size-5 text-cyan-700" />
          Digital Logic
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <MousePointer2 className="size-3.5" />
          Drag parts onto the canvas
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {paletteGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Boxes className="size-3.5" />
              {group.title}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.kinds.map((kind) => {
                const definition = componentDefinitions[kind];
                return (
                  <button
                    key={kind}
                    draggable
                    onDragStart={(event) => onDragStart(event, kind)}
                    className="group rounded-md border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-cyan-500 hover:shadow-md active:scale-[0.98]"
                    type="button"
                  >
                    <span
                      className="mb-2 block h-1.5 w-8 rounded-full"
                      style={{ backgroundColor: definition.accent }}
                    />
                    <span className="block text-sm font-bold text-slate-900">{definition.label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                      {definition.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
