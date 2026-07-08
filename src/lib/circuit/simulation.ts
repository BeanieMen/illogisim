import type {
  CircuitSnapshot,
  ComponentKind,
  LogicNode,
  LogicValue,
  WireEdge
} from "@/types/circuit";
import { componentDefinitions } from "./definitions";

type PinKey = string;

const high = 1;
const low = 0;
const unknown = "x";

function key(nodeId: string, handleId: string): PinKey {
  return `${nodeId}:${handleId}`;
}

function evaluateGate(kind: ComponentKind, inputs: LogicValue[], value?: LogicValue) {
  if (kind === "switch" || kind === "button") return value ?? low;
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

export function evaluateCircuit(snapshot: CircuitSnapshot): CircuitSnapshot {
  const unionFind = new UnionFind();
  const nodeMap = new Map(snapshot.nodes.map((node) => [node.id, node]));

  snapshot.nodes.forEach((node) => {
    const definition = componentDefinitions[node.data.kind];
    [...definition.inputs, ...definition.outputs].forEach((pin) => {
      unionFind.add(key(node.id, pin.id));
    });
  });

  snapshot.edges.forEach((edge) => {
    if (edge.sourceHandle && edge.targetHandle) {
      unionFind.union(key(edge.source, edge.sourceHandle), key(edge.target, edge.targetHandle));
    }
  });

  let pinValues = seedOutputValues(snapshot.nodes);
  let inputValuesByNode = new Map<string, Record<string, LogicValue>>();
  let outputValuesByNode = new Map<string, Record<string, LogicValue>>();

  for (let step = 0; step < snapshot.nodes.length + 2; step += 1) {
    const netValues = resolveNetValues(snapshot, unionFind, pinValues);
    inputValuesByNode = collectInputValues(snapshot.nodes, unionFind, netValues);
    outputValuesByNode = new Map<string, Record<string, LogicValue>>();
    const nextPinValues = new Map<PinKey, LogicValue>();
    let changed = false;

    snapshot.nodes.forEach((node) => {
      const definition = componentDefinitions[node.data.kind];
      const inputs = definition.inputs.map(
        (pin) => inputValuesByNode.get(node.id)?.[pin.id] ?? unknown
      );
      const outputValue = evaluateGate(node.data.kind, inputs, node.data.value);
      const outputs: Record<string, LogicValue> = {};

      definition.outputs.forEach((pin) => {
        outputs[pin.id] = outputValue;
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

function seedOutputValues(nodes: LogicNode[]) {
  const pinValues = new Map<PinKey, LogicValue>();

  nodes.forEach((node) => {
    const definition = componentDefinitions[node.data.kind];
    const value = evaluateGate(node.data.kind, [], node.data.value);

    definition.outputs.forEach((pin) => {
      pinValues.set(key(node.id, pin.id), value);
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
    const definition = componentDefinitions[node.data.kind];
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
    const definition = componentDefinitions[node.data.kind];
    const nodeInputs: Record<string, LogicValue> = {};

    definition.inputs.forEach((pin) => {
      nodeInputs[pin.id] = netValues.get(unionFind.find(key(node.id, pin.id))) ?? unknown;
    });

    values.set(node.id, nodeInputs);
  });

  return values;
}
