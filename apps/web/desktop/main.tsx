import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StudioApp } from "../src/features/editor/StudioApp";

const root = document.getElementById("root");

if (!root) {
  throw new Error("找不到桌面入口节点");
}

createRoot(root).render(
  <StrictMode>
    <StudioApp />
  </StrictMode>,
);
