import m from "mithril";

/** Always-mounted SVG layer. Visibility is CSS / data-* / classList, never unmount. */
export function layer(name: string, children: m.Children): m.Vnode {
  return m(`g.layer-${name}`, { key: name, "data-role": name }, children);
}
