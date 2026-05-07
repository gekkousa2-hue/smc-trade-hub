import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";

// Apply theme before render to avoid flash
try {
  const t = localStorage.getItem("app_theme");
  if (t === "light") document.documentElement.classList.add("light");
} catch {}

createRoot(document.getElementById("root")!).render(<App />);
