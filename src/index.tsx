import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Game from "./Game";
import { ThemeProvider } from "./hooks/theme";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <Game />
    </ThemeProvider>
  </React.StrictMode>
);
