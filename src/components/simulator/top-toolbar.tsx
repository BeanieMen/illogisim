"use client";

import { Download, FileDown, FileUp, Redo2, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useRef } from "react";
import type { SerializedCircuit } from "@/types/circuit";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

type ToolbarProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onReset: () => void;
  onSave: () => void;
  onLoad: (serialized: SerializedCircuit) => void;
  onExportPng: () => void;
};

export function TopToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDelete,
  onReset,
  onSave,
  onLoad,
  onExportPng
}: ToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleLoad(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onLoad(JSON.parse(text) as SerializedCircuit);
    event.target.value = "";
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-card p-2 shadow-panel">
        <ToolButton label="Undo" disabled={!canUndo} onClick={onUndo}>
          <Undo2 />
        </ToolButton>
        <ToolButton label="Redo" disabled={!canRedo} onClick={onRedo}>
          <Redo2 />
        </ToolButton>
        <div className="mx-1 h-7 w-px bg-slate-200" />
        <ToolButton label="Delete selected" onClick={onDelete}>
          <Trash2 />
        </ToolButton>
        <ToolButton label="Reset circuit" onClick={onReset}>
          <RotateCcw />
        </ToolButton>
        <div className="mx-1 h-7 w-px bg-slate-200" />
        <ToolButton label="Save JSON" onClick={onSave}>
          <FileDown />
        </ToolButton>
        <ToolButton label="Load JSON" onClick={() => inputRef.current?.click()}>
          <FileUp />
        </ToolButton>
        <ToolButton label="Export PNG" onClick={onExportPng}>
          <Download />
        </ToolButton>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="application/json"
          onChange={handleLoad}
        />
      </div>
    </TooltipProvider>
  );
}

function ToolButton({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
