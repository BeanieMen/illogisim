"use client";

import { Boxes, CircuitBoard, Sparkles } from "lucide-react";
import { paletteGroups, componentDefinitions } from "@/lib/circuit/definitions";
import type { ComponentKind } from "@/types/circuit";

export function PalettePanel() {
  function onDragStart(event: React.DragEvent<HTMLButtonElement>, kind: ComponentKind) {
    event.dataTransfer.setData("application/x-logic-kind", kind);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/10 bg-slate-950/72 shadow-panel backdrop-blur-2xl md:w-72">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2 text-base font-bold">
          <CircuitBoard className="size-5 text-teal-300" />
          Logic Studio
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="size-3.5 text-violet-300" />
          Custom gates and live signal flow
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {paletteGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Boxes className="size-3.5 text-slate-600" />
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
                    className="group rounded-md border border-white/10 bg-white/[0.045] p-3 text-left shadow-sm transition hover:border-teal-300/70 hover:bg-white/[0.075] hover:shadow-[0_0_30px_rgb(20_184_166/0.12)] active:scale-[0.98]"
                    type="button"
                  >
                    <span
                      className="mb-2 block h-1.5 w-8 rounded-full shadow-[0_0_16px_currentColor]"
                      style={{ backgroundColor: definition.accent }}
                    />
                    <span className="block text-sm font-bold text-slate-100">{definition.label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-slate-400">
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
