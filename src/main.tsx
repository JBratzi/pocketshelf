import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Self-hosted open fonts (design-system.md §2) — no CDN, no proprietary fonts.
import "@fontsource-variable/nunito";
import "@fontsource-variable/manrope";
import "@fontsource/jetbrains-mono";

// Tailwind v4 entry + PocketShelf theme tokens.
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
