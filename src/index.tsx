import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Game from "./Game";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <Game />
  </React.StrictMode>
);
