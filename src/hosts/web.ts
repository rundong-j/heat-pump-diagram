import m from "mithril";
import { App } from "../app";

export function mountWebApp(root: HTMLElement): void {
  m.mount(root, App);
}
