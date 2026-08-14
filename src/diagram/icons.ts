import m from "mithril";

export function fanIcon(radius: number): m.Children {
  const blade = `M0,0 L${radius * 0.22},${-radius * 0.28} L0,${-radius * 0.92} L${-radius * 0.22},${-radius * 0.28} Z`;

  return [
    m("circle.fan-ring", { r: radius, fill: "none" }),
    m("g.fan-blades", [
      m("path", { d: blade }),
      m("path", { d: blade, transform: "rotate(120)" }),
      m("path", { d: blade, transform: "rotate(240)" }),
      m("circle.fan-hub", { r: radius * 0.18 }),
    ]),
  ];
}

export function compressorIcon(): m.Children {
  return m("g.compressor-pulse", [
    m("rect.compressor-can", {
      x: -26,
      y: -36,
      width: 52,
      height: 72,
      rx: 26,
    }),
    m("line", { x1: -12, y1: -16, x2: 12, y2: -16 }),
    m("line", { x1: -12, y1: -4, x2: 12, y2: -4 }),
    m("line", { x1: -12, y1: 8, x2: 12, y2: 8 }),
  ]);
}

export function expansionValveIcon(): m.Children {
  return [
    m("polygon.txv-body", {
      points: "-16,0 14,-12 14,12",
    }),
    m("rect.txv-head", { x: 8, y: -7, width: 12, height: 14, rx: 2 }),
  ];
}

export function reversingValveIcon(): m.Children {
  return [
    m("rect.rv-body", { x: -22, y: -16, width: 44, height: 32, rx: 4 }),
    m("path.rv-slide", { d: "M-12,-6 L4,-6 L12,6 L-4,6 Z" }),
    m("circle.rv-port", { cx: 0, cy: -16, r: 3 }),
    m("circle.rv-port", { cx: 0, cy: 16, r: 3 }),
    m("circle.rv-port", { cx: -22, cy: 0, r: 3 }),
    m("circle.rv-port", { cx: 22, cy: 0, r: 3 }),
  ];
}

export function coilFins(opts: {
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
  axis: "vertical" | "horizontal";
}): m.Vnode {
  const lines: m.Children[] = [];
  const { x, y, width, height, count, axis } = opts;

  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    if (axis === "vertical") {
      const lx = x + t * width;
      lines.push(m("line", { x1: lx, y1: y, x2: lx, y2: y + height }));
    } else {
      const ly = y + t * height;
      lines.push(m("line", { x1: x, y1: ly, x2: x + width, y2: ly }));
    }
  }

  return m("g.coil-fins", lines);
}

export function flowArrow(
  x: number,
  y: number,
  rotation: number,
  key?: string,
): m.Vnode {
  return m("polygon.flow-arrow", {
    key,
    points: "-9,-6 11,0 -9,6",
    transform: `translate(${x} ${y}) rotate(${rotation})`,
  });
}

export function componentBox(opts: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  pulse?: boolean;
}): m.Vnode {
  const { id, x, y, width, height, label, pulse } = opts;
  const body = [
    m("rect.simple-box", {
      x: -width / 2,
      y: -height / 2,
      width,
      height,
      rx: 4,
    }),
    m(
      "text.box-label",
      {
        "text-anchor": "middle",
        dy: "0.35em",
      },
      label,
    ),
  ];

  return m(
    "g.component-box",
    {
      key: id,
      "data-component": id,
      transform: `translate(${x} ${y})`,
    },
    pulse ? m("g.compressor-pulse", body) : body,
  );
}
