import { mountWebApp } from "./hosts/web";
import "./style.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Missing #app root");
}

mountWebApp(root);
