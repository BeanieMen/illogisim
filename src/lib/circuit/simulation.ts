import type {
  CircuitSnapshot,
  ComponentKind,
  CustomGateDefinition,
  LogicNode,
  LogicValue
} from "@/types/circuit";
import { getComponentDefinition } from "./definitions";

type PinKey = string;

const high = 1;
const low = 0;
const unknown = "x";

function key(nodeId: string, handleId: string): PinKey {
  return `${nodeId}:${handleId}`;
}

function evaluateGate(kind: ComponentKind, inputs: LogicValue[], value?: LogicValue) {
  if (kind === "switch" || kind === "button" || kind === "gateInput") return value ?? low;
  if (kind === "constant") return high;
  if (kind === "clock") return value ?? low;
  if (inputs.some((input) => input === unknown)) return unknown;

  const bits = inputs as (0 | 1)[];

  switch (kind) {
    case "and":
      return bits.every(Boolean) ? high : low;
    case "or":
      return bits.some(Boolean) ? high : low;
    case "not":
      return bits[0] ? low : high;
    case "nand":
      return bits.every(Boolean) ? low : high;
    case "nor":
      return bits.some(Boolean) ? low : high;
    case "xor":
      return bits.filter(Boolean).length % 2 === 1 ? high : low;
    case "xnor":
      return bits.filter(Boolean).length % 2 === 0 ? high : low;
    default:
      return unknown;
  }
}

function evaluateNodeOutputs(
  node: LogicNode,
  inputs: LogicValue[],
  customGates: CustomGateDefinition[],
  depth: number
) {
  const definition = getComponentDefinition(node.data.kind, node.data);
  const outputs: Record<string, LogicValue> = {};

  if (node.data.kind === "custom") {
    if (depth > 12) {
      definition.outputs.forEach((pin) => {
        outputs[pin.id] = unknown;
      });
      return outputs;
    }

    const customGate = customGates.find((gate) => gate.id === node.data.customGateId);
    const values = customGate
      ? evaluateCustomGate(customGate, inputs, customGates, depth + 1)
      : definition.outputs.map(() => unknown);

    definition.outputs.forEach((pin, index) => {
      outputs[pin.id] = values[index] ?? unknown;
    });
    return outputs;
  }

  const outputValue = evaluateGate(node.data.kind, inputs, node.data.value);
  definition.outputs.forEach((pin) => {
    outputs[pin.id] = outputValue;
  });

  return outputs;
}

function evaluateCustomGate(
  customGate: CustomGateDefinition,
  inputs: LogicValue[],
  customGates: CustomGateDefinition[],
  depth: number
) {
  const internalNodes = customGate.circuit.nodes.map((node) => {
    if (node.data.kind !== "gateInput") return node;
    const index = node.data.terminalIndex ?? 0;
    return {
      ...node,
      data: {
        ...node.data,
        value: inputs[index] ?? unknown
      }
    };
  });

  const evaluated = evaluateCircuit(
    {
      nodes: internalNodes,
      edges: customGate.circuit.edges
    },
    customGates,
    depth
  );

  return evaluated.nodes
    .filter((node) => node.data.kind === "gateOutput")
    .sort((a, b) => (a.data.terminalIndex ?? 0) - (b.data.terminalIndex ?? 0))
    .map((node) => node.data.inputValues?.in ?? unknown);
}

class UnionFind {
  private parents = new Map<PinKey, PinKey>();

  add(item: PinKey) {
    if (!this.parents.has(item)) this.parents.set(item, item);
  }

  find(item: PinKey): PinKey {
    this.add(item);
    const parent = this.parents.get(item);
    if (parent === item || !parent) return item;
    const root = this.find(parent);
    this.parents.set(item, root);
    return root;
  }

  union(a: PinKey, b: PinKey) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parents.set(rootB, rootA);
  }
}

export function evaluateCircuit(
  snapshot: CircuitSnapshot,
  customGates: CustomGateDefinition[] = [],
  depth = 0
): CircuitSnapshot {
  const unionFind = new UnionFind();
  snapshot.nodes.forEach((node) => {
    const definition = getComponentDefinition(node.data.kind, node.data);
    [...definition.inputs, ...definition.outputs].forEach((pin) => {
      unionFind.add(key(node.id, pin.id));
    });
  });

  snapshot.edges.forEach((edge) => {
    if (edge.sourceHandle && edge.targetHandle) {
      unionFind.union(key(edge.source, edge.sourceHandle), key(edge.target, edge.targetHandle));
    }
  });

  let pinValues = seedOutputValues(snapshot.nodes, customGates, depth);
  let inputValuesByNode = new Map<string, Record<string, LogicValue>>();
  let outputValuesByNode = new Map<string, Record<string, LogicValue>>();

  for (let step = 0; step < snapshot.nodes.length + 2; step += 1) {
    const netValues = resolveNetValues(snapshot, unionFind, pinValues);
    inputValuesByNode = collectInputValues(snapshot.nodes, unionFind, netValues);
    outputValuesByNode = new Map<string, Record<string, LogicValue>>();
    const nextPinValues = new Map<PinKey, LogicValue>();
    let changed = false;

    snapshot.nodes.forEach((node) => {
      const definition = getComponentDefinition(node.data.kind, node.data);
      const inputs = definition.inputs.map(
        (pin) => inputValuesByNode.get(node.id)?.[pin.id] ?? unknown
      );
      const outputs = evaluateNodeOutputs(node, inputs, customGates, depth);

      definition.outputs.forEach((pin) => {
        const outputValue = outputs[pin.id] ?? unknown;
        const pinKey = key(node.id, pin.id);
        nextPinValues.set(pinKey, outputValue);
        if (pinValues.get(pinKey) !== outputValue) changed = true;
      });

      outputValuesByNode.set(node.id, outputs);
    });

    pinValues = nextPinValues;
    if (!changed) break;
  }

  const finalNetValues = resolveNetValues(snapshot, unionFind, pinValues);

  return {
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        inputValues: inputValuesByNode.get(node.id) ?? {},
        outputValues: outputValuesByNode.get(node.id) ?? {}
      }
    })),
    edges: snapshot.edges.map((edge) => {
      const netId =
        edge.sourceHandle && edge.targetHandle
          ? unionFind.find(key(edge.source, edge.sourceHandle))
          : edge.id;
      return {
        ...edge,
        data: {
          value: finalNetValues.get(netId) ?? unknown,
          bends: edge.data?.bends ?? [],
          netId
        }
      };
    })
  };
}

function seedOutputValues(
  nodes: LogicNode[],
  customGates: CustomGateDefinition[],
  depth: number
) {
  const pinValues = new Map<PinKey, LogicValue>();

  nodes.forEach((node) => {
    const definition = getComponentDefinition(node.data.kind, node.data);
    const outputs = evaluateNodeOutputs(node, [], customGates, depth);

    definition.outputs.forEach((pin) => {
      pinValues.set(key(node.id, pin.id), outputs[pin.id] ?? unknown);
    });
  });

  return pinValues;
}

function resolveNetValues(
  snapshot: CircuitSnapshot,
  unionFind: UnionFind,
  outputValues: Map<PinKey, LogicValue>
) {
  const netValues = new Map<string, LogicValue>();
  const drivenCounts = new Map<string, number>();

  outputValues.forEach((value, pinKey) => {
    const netId = unionFind.find(pinKey);
    const previous = netValues.get(netId);
    drivenCounts.set(netId, (drivenCounts.get(netId) ?? 0) + 1);

    if (previous === undefined) {
      netValues.set(netId, value);
    } else if (previous !== value) {
      netValues.set(netId, unknown);
    }
  });

  snapshot.nodes.forEach((node) => {
    const definition = getComponentDefinition(node.data.kind, node.data);
    definition.inputs.forEach((pin) => {
      const netId = unionFind.find(key(node.id, pin.id));
      if (!drivenCounts.has(netId)) netValues.set(netId, unknown);
    });
  });

  return netValues;
}

function collectInputValues(
  nodes: LogicNode[],
  unionFind: UnionFind,
  netValues: Map<string, LogicValue>
) {
  const values = new Map<string, Record<string, LogicValue>>();

  nodes.forEach((node) => {
    const definition = getComponentDefinition(node.data.kind, node.data);
    const nodeInputs: Record<string, LogicValue> = {};

    definition.inputs.forEach((pin) => {
      nodeInputs[pin.id] = netValues.get(unionFind.find(key(node.id, pin.id))) ?? unknown;
    });

    values.set(node.id, nodeInputs);
  });

  return values;
}
