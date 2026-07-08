import type { Edge, Node, XYPosition } from "@xyflow/react";

export type LogicValue = 0 | 1 | "x";

export type PinDirection = "input" | "output";

export type PinType = "bit" | "clock";

export type ComponentKind =
  | "and"
  | "or"
  | "not"
  | "nand"
  | "nor"
  | "xor"
  | "xnor"
  | "switch"
  | "button"
  | "constant"
  | "led"
  | "clock"
  | "display";

export type PinSpec = {
  id: string;
  label: string;
  direction: PinDirection;
  type: PinType;
};

export type ComponentDefinition = {
  kind: ComponentKind;
  label: string;
  description: string;
  accent: string;
  inputs: PinSpec[];
  outputs: PinSpec[];
};

export type LogicNodeData = {
  kind: ComponentKind;
  label: string;
  value?: LogicValue;
  clockHz?: number;
  inputValues?: Record<string, LogicValue>;
  outputValues?: Record<string, LogicValue>;
};

export type WirePoint = XYPosition;

export type WireEdgeData = {
  value: LogicValue;
  bends: WirePoint[];
  selected?: boolean;
  highlighted?: boolean;
  invalid?: boolean;
  netId?: string;
};

export type LogicNode = Node<LogicNodeData, "logicNode">;
export type WireEdge = Edge<WireEdgeData, "wire">;

export type CircuitSnapshot = {
  nodes: LogicNode[];
  edges: WireEdge[];
};

export type SerializedCircuit = CircuitSnapshot & {
  version: 1;
  savedAt: string;
};
