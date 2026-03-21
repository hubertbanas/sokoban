import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Game from "./Game";
import { ThemeProvider } from "./hooks/theme";
import { preloadGameAssets } from "./utils/preload-assets";

async function bootstrap() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  const loadingElement = document.getElementById("boot-loading");

  await preloadGameAssets();

  createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <Game />
      </ThemeProvider>
    </React.StrictMode>
  );

  loadingElement?.remove();
}

void bootstrap();
