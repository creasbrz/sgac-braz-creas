// frontend/src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Agora SÓ usa o index.css (que contém todo o tema)
import "./styles/index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Elemento #root não encontrado no index.html");
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);