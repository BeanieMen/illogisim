import type { ComponentDefinition, ComponentKind, PinSpec } from "@/types/circuit";

const bitInput = (id: string, label = id.toUpperCase()): PinSpec => ({
  id,
  label,
  direction: "input",
  type: "bit"
});

const bitOutput = (id = "out", label = "OUT"): PinSpec => ({
  id,
  label,
  direction: "output",
  type: "bit"
});

export const componentDefinitions: Record<ComponentKind, ComponentDefinition> = {
  and: {
    kind: "and",
    label: "AND",
    description: "HIGH when every input is HIGH",
    accent: "#0891b2",
    inputs: [bitInput("a", "A"), bitInput("b", "B")],
    outputs: [bitOutput()]
  },
  or: {
    kind: "or",
    label: "OR",
    description: "HIGH when any input is HIGH",
    accent: "#16a34a",
    inputs: [bitInput("a", "A"), bitInput("b", "B")],
    outputs: [bitOutput()]
  },
  not: {
    kind: "not",
    label: "NOT",
    description: "Inverts a signal",
    accent: "#dc2626",
    inputs: [bitInput("in", "IN")],
    outputs: [bitOutput()]
  },
  nand: {
    kind: "nand",
    label: "NAND",
    description: "Inverted AND",
    accent: "#0f766e",
    inputs: [bitInput("a", "A"), bitInput("b", "B")],
    outputs: [bitOutput()]
  },
  nor: {
    kind: "nor",
    label: "NOR",
    description: "Inverted OR",
    accent: "#9333ea",
    inputs: [bitInput("a", "A"), bitInput("b", "B")],
    outputs: [bitOutput()]
  },
  xor: {
    kind: "xor",
    label: "XOR",
    description: "HIGH when inputs differ",
    accent: "#f59e0b",
    inputs: [bitInput("a", "A"), bitInput("b", "B")],
    outputs: [bitOutput()]
  },
  xnor: {
    kind: "xnor",
    label: "XNOR",
    description: "HIGH when inputs match",
    accent: "#2563eb",
    inputs: [bitInput("a", "A"), bitInput("b", "B")],
    outputs: [bitOutput()]
  },
  switch: {
    kind: "switch",
    label: "Switch",
    description: "Latched HIGH or LOW source",
    accent: "#ea580c",
    inputs: [],
    outputs: [bitOutput()]
  },
  button: {
    kind: "button",
    label: "Button",
    description: "Momentary HIGH source",
    accent: "#db2777",
    inputs: [],
    outputs: [bitOutput()]
  },
  constant: {
    kind: "constant",
    label: "Constant",
    description: "Fixed HIGH source",
    accent: "#65a30d",
    inputs: [],
    outputs: [bitOutput()]
  },
  led: {
    kind: "led",
    label: "LED",
    description: "Visual logic probe",
    accent: "#e11d48",
    inputs: [bitInput("in", "IN")],
    outputs: []
  },
  clock: {
    kind: "clock",
    label: "Clock",
    description: "Pulsing square wave source",
    accent: "#7c3aed",
    inputs: [],
    outputs: [{ ...bitOutput(), type: "clock" }]
  },
  display: {
    kind: "display",
    label: "Output",
    description: "Large readable output probe",
    accent: "#0284c7",
    inputs: [bitInput("in", "IN")],
    outputs: []
  }
};

export const paletteGroups: { title: string; kinds: ComponentKind[] }[] = [
  { title: "Gates", kinds: ["and", "or", "not", "nand", "nor", "xor", "xnor"] },
  { title: "Inputs", kinds: ["switch", "button", "constant", "clock"] },
  { title: "Outputs", kinds: ["led", "display"] }
];

export function getPinDefinition(kind: ComponentKind, pinId: string) {
  const definition = componentDefinitions[kind];
  return [...definition.inputs, ...definition.outputs].find((pin) => pin.id === pinId);
}
