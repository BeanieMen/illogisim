"use client";

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition
} from "@xyflow/react";
import { create } from "zustand";
import type {
  CircuitSnapshot,
  ComponentKind,
  LogicNode,
  LogicValue,
  SerializedCircuit,
  WireEdge,
  WirePoint
} from "@/types/circuit";
import { componentDefinitions, getPinDefinition } from "@/lib/circuit/definitions";
import { evaluateCircuit } from "@/lib/circuit/simulation";
import { snapToGrid } from "@/lib/circuit/routing";

type Clipboard = CircuitSnapshot | null;

type CircuitStore = CircuitSnapshot & {
  history: CircuitSnapshot[];
  future: CircuitSnapshot[];
  clipboard: Clipboard;
  highlightedNetId: string | null;
  addComponent: (kind: ComponentKind, position: XYPosition) => void;
  setNodesFromFlow: (changes: NodeChange<LogicNode>[]) => void;
  setEdgesFromFlow: (changes: EdgeChange<WireEdge>[]) => void;
  connectPins: (connection: Connection) => void;
  isValidConnection: (connection: Connection) => boolean;
  toggleSource: (nodeId: string, pressed?: boolean) => void;
  tickClocks: () => void;
  setWireBends: (edgeId: string, bends: WirePoint[]) => void;
  deleteSelection: () => void;
  selectNet: (netId: string | null) => void;
  undo: () => void;
  redo: () => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  loadCircuit: (serialized: SerializedCircuit) => void;
  resetCircuit: () => void;
  serialize: () => SerializedCircuit;
};

const starterNodes: LogicNode[] = [
  createNode("switch", { x: 80, y: 140 }, "switch-1", 0),
  createNode("and", { x: 360, y: 132 }, "and-1"),
  createNode("led", { x: 680, y: 150 }, "led-1")
];

const starterEdges: WireEdge[] = [
  {
    id: "wire-switch-1-and-1-a",
    type: "wire",
    source: "switch-1",
    sourceHandle: "out",
    target: "and-1",
    targetHandle: "a",
    data: { value: "x", bends: [] }
  }
];

function createNode(
  kind: ComponentKind,
  position: XYPosition,
  id = `${kind}-${crypto.randomUUID().slice(0, 8)}`,
  value?: LogicValue
): LogicNode {
  const definition = componentDefinitions[kind];

  return {
    id,
    type: "logicNode",
    position: snapToGrid(position),
    data: {
      kind,
      label: definition.label,
      value: value ?? (kind === "constant" ? 1 : 0),
      clockHz: kind === "clock" ? 1 : undefined
    }
  };
}

function evaluate(nodes: LogicNode[], edges: WireEdge[]): CircuitSnapshot {
  return evaluateCircuit({ nodes, edges });
}

function withHistory(
  state: CircuitStore,
  next: CircuitSnapshot,
  options: { keepFuture?: boolean } = {}
) {
  const evaluated = evaluate(next.nodes, next.edges);
  return {
    ...evaluated,
    history: [...state.history, { nodes: state.nodes, edges: state.edges }].slice(-80),
    future: options.keepFuture ? state.future : []
  };
}

const initialCircuit = evaluate(starterNodes, starterEdges);

export const useCircuitStore = create<CircuitStore>((set, get) => ({
  ...initialCircuit,
  history: [],
  future: [],
  clipboard: null,
  highlightedNetId: null,

  addComponent: (kind, position) =>
    set((state) =>
      withHistory(state, {
        nodes: [...state.nodes, createNode(kind, position)],
        edges: state.edges
      })
    ),

  setNodesFromFlow: (changes) =>
    set((state) =>
      withHistory(state, {
        nodes: applyNodeChanges(changes, state.nodes),
        edges: state.edges
      })
    ),

  setEdgesFromFlow: (changes) =>
    set((state) =>
      withHistory(state, {
        nodes: state.nodes,
        edges: applyEdgeChanges(changes, state.edges)
      })
    ),

  connectPins: (connection) =>
    set((state) => {
      if (!get().isValidConnection(connection)) return state;

      const edge: WireEdge = {
        id: `wire-${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}-${Date.now()}`,
        type: "wire",
        source: connection.source!,
        sourceHandle: connection.sourceHandle,
        target: connection.target!,
        targetHandle: connection.targetHandle,
        data: { value: "x", bends: [] }
      };

      return withHistory(state, {
        nodes: state.nodes,
        edges: addEdge(edge, state.edges)
      });
    }),

  isValidConnection: (connection) => {
    if (
      !connection.source ||
      !connection.target ||
      !connection.sourceHandle ||
      !connection.targetHandle ||
      connection.source === connection.target
    ) {
      return false;
    }

    const state = get();
    const source = state.nodes.find((node) => node.id === connection.source);
    const target = state.nodes.find((node) => node.id === connection.target);
    if (!source || !target) return false;

    const sourcePin = getPinDefinition(source.data.kind, connection.sourceHandle);
    const targetPin = getPinDefinition(target.data.kind, connection.targetHandle);

    if (!sourcePin || !targetPin) return false;
    if (sourcePin.direction !== "output" || targetPin.direction !== "input") return false;
    if (sourcePin.type !== targetPin.type && sourcePin.type !== "clock") return false;

    return !state.edges.some(
      (edge) => edge.target === target.id && edge.targetHandle === targetPin.id
    );
  },

  toggleSource: (nodeId, pressed) =>
    set((state) => {
      const nodes = state.nodes.map((node) => {
        if (node.id !== nodeId) return node;
        const isMomentary = node.data.kind === "button";
        const nextValue: LogicValue = isMomentary
          ? pressed
            ? 1
            : 0
          : node.data.value === 1
            ? 0
            : 1;

        return { ...node, data: { ...node.data, value: nextValue } };
      });

      return withHistory(state, { nodes, edges: state.edges });
    }),

  tickClocks: () =>
    set((state) =>
      evaluate(
        state.nodes.map((node) =>
          node.data.kind === "clock"
            ? {
                ...node,
                data: {
                  ...node.data,
                  value: node.data.value === 1 ? 0 : 1
                }
              }
            : node
        ),
        state.edges
      )
    ),

  setWireBends: (edgeId, bends) =>
    set((state) =>
      withHistory(state, {
        nodes: state.nodes,
        edges: state.edges.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                data: {
                  value: edge.data?.value ?? "x",
                  bends,
                  highlighted: edge.data?.highlighted,
                  invalid: edge.data?.invalid,
                  netId: edge.data?.netId,
                  selected: edge.data?.selected
                }
              }
            : edge
        )
      })
    ),

  deleteSelection: () =>
    set((state) =>
      withHistory(state, {
        nodes: state.nodes.filter((node) => !node.selected),
        edges: state.edges.filter((edge) => !edge.selected)
      })
    ),

  selectNet: (netId) => set({ highlightedNetId: netId }),

  undo: () =>
    set((state) => {
      const previous = state.history.at(-1);
      if (!previous) return state;

      return {
        ...evaluate(previous.nodes, previous.edges),
        history: state.history.slice(0, -1),
        future: [{ nodes: state.nodes, edges: state.edges }, ...state.future]
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return state;

      return {
        ...evaluate(next.nodes, next.edges),
        history: [...state.history, { nodes: state.nodes, edges: state.edges }],
        future: state.future.slice(1)
      };
    }),

  copySelection: () =>
    set((state) => ({
      clipboard: {
        nodes: state.nodes.filter((node) => node.selected),
        edges: state.edges.filter((edge) => edge.selected)
      }
    })),

  pasteClipboard: () =>
    set((state) => {
      if (!state.clipboard || state.clipboard.nodes.length === 0) return state;

      const idMap = new Map<string, string>();
      const nodes = state.clipboard.nodes.map((node) => {
        const id = `${node.data.kind}-${crypto.randomUUID().slice(0, 8)}`;
        idMap.set(node.id, id);
        return {
          ...node,
          id,
          selected: true,
          position: { x: node.position.x + 48, y: node.position.y + 48 }
        };
      });
      const edges = state.clipboard.edges
        .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
        .map((edge) => ({
          ...edge,
          id: `wire-${crypto.randomUUID().slice(0, 10)}`,
          source: idMap.get(edge.source)!,
          target: idMap.get(edge.target)!,
          selected: true
        }));

      return withHistory(state, {
        nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), ...nodes],
        edges: [...state.edges.map((edge) => ({ ...edge, selected: false })), ...edges]
      });
    }),

  loadCircuit: (serialized) =>
    set((state) =>
      withHistory(state, {
        nodes: serialized.nodes,
        edges: serialized.edges
      })
    ),

  resetCircuit: () =>
    set((state) =>
      withHistory(state, {
        nodes: starterNodes,
        edges: starterEdges
      })
    ),

  serialize: () => ({
    version: 1,
    savedAt: new Date().toISOString(),
    nodes: get().nodes,
    edges: get().edges
  })
}));
