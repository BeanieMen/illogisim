"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type OnConnectStartParams,
  type ReactFlowInstance
} from "@xyflow/react";
import { toPng } from "html-to-image";
import { ConnectionLine } from "./connection-line";
import { LogicNodeComponent } from "./logic-node";
import { PalettePanel } from "./palette-panel";
import { TopToolbar } from "./top-toolbar";
import { WireEdge } from "./wire-edge";
import { useCircuitStore } from "@/store/circuit-store";
import type { ComponentKind, LogicNode, WireEdge as WireEdgeType } from "@/types/circuit";

const nodeTypes = { logicNode: LogicNodeComponent };
const edgeTypes = { wire: WireEdge };

export function LogicSimulator() {
  return (
    <ReactFlowProvider>
      <SimulatorCanvas />
    </ReactFlowProvider>
  );
}

function SimulatorCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<ReactFlowInstance<LogicNode, WireEdgeType> | null>(null);
  const nodes = useCircuitStore((state) => state.nodes);
  const edges = useCircuitStore((state) => state.edges);
  const history = useCircuitStore((state) => state.history);
  const future = useCircuitStore((state) => state.future);
  const addComponent = useCircuitStore((state) => state.addComponent);
  const setNodesFromFlow = useCircuitStore((state) => state.setNodesFromFlow);
  const setEdgesFromFlow = useCircuitStore((state) => state.setEdgesFromFlow);
  const connectPins = useCircuitStore((state) => state.connectPins);
  const isValidConnection = useCircuitStore((state) => state.isValidConnection);
  const undo = useCircuitStore((state) => state.undo);
  const redo = useCircuitStore((state) => state.redo);
  const deleteSelection = useCircuitStore((state) => state.deleteSelection);
  const copySelection = useCircuitStore((state) => state.copySelection);
  const pasteClipboard = useCircuitStore((state) => state.pasteClipboard);
  const loadCircuit = useCircuitStore((state) => state.loadCircuit);
  const resetCircuit = useCircuitStore((state) => state.resetCircuit);
  const serialize = useCircuitStore((state) => state.serialize);
  const tickClocks = useCircuitStore((state) => state.tickClocks);

  useEffect(() => {
    const interval = window.setInterval(() => tickClocks(), 500);
    return () => window.clearInterval(interval);
  }, [tickClocks]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (
        (modifier && event.key.toLowerCase() === "y") ||
        (modifier && event.shiftKey && event.key.toLowerCase() === "z")
      ) {
        event.preventDefault();
        redo();
      } else if (modifier && event.key.toLowerCase() === "c") {
        copySelection();
      } else if (modifier && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
      } else if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        deleteSelection();
      } else if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveJson();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData("application/x-logic-kind") as ComponentKind;
      if (!kind || !flowRef.current) return;

      const position = flowRef.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });
      addComponent(kind, position);
    },
    [addComponent]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "wire",
      data: { value: "x" as const, bends: [] }
    }),
    []
  );

  function saveJson() {
    const blob = new Blob([JSON.stringify(serialize(), null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "logic-circuit.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportPng() {
    const element = wrapperRef.current?.querySelector(".react-flow") as HTMLElement | null;
    if (!element) return;
    const dataUrl = await toPng(element, {
      backgroundColor: "#f1f5f9",
      pixelRatio: 2
    });
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = "logic-circuit.png";
    anchor.click();
  }

  const onConnectStart = useCallback((_event: unknown, params: OnConnectStartParams) => {
    document.body.dataset.connectingHandle = params.handleType ?? "";
  }, []);

  const onConnectEnd = useCallback(() => {
    delete document.body.dataset.connectingHandle;
  }, []);

  return (
    <main className="flex h-screen min-h-[620px] flex-col overflow-hidden bg-transparent text-slate-100 md:flex-row">
      <div className="h-[260px] shrink-0 md:h-full">
        <PalettePanel />
      </div>
      <section className="relative min-h-0 flex-1" ref={wrapperRef}>
        <div className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between gap-3">
          <TopToolbar
            canUndo={history.length > 0}
            canRedo={future.length > 0}
            onUndo={undo}
            onRedo={redo}
            onDelete={deleteSelection}
            onReset={resetCircuit}
            onSave={saveJson}
            onLoad={loadCircuit}
            onExportPng={exportPng}
          />
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onInit={(instance) => {
            flowRef.current = instance;
          }}
          onNodesChange={setNodesFromFlow}
          onEdgesChange={setEdgesFromFlow}
          onConnect={connectPins}
          isValidConnection={(connection) => isValidConnection(connection as Connection)}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          connectionLineComponent={ConnectionLine}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          panOnScroll
          selectionOnDrag
          deleteKeyCode={null}
          multiSelectionKeyCode={["Meta", "Control"]}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={44} size={0.7} color="#334155" />
          <MiniMap
            pannable
            zoomable
            className="!bottom-4 !right-4 !rounded-md !border !border-white/10 !bg-slate-950/80"
            maskColor="rgb(2 6 23 / 0.35)"
          />
          <Controls className="!bottom-4 !left-4 !rounded-md !border !border-white/10 !bg-slate-950/80" />
        </ReactFlow>
      </section>
    </main>
  );
}
