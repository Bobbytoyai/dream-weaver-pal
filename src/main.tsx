import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Signal that React loaded successfully — disables HTML sleep fallback
(window as any).__bobby_loaded = true;
const fallback = document.getElementById("bobby-sleep-fallback");
if (fallback) fallback.classList.remove("visible");

createRoot(document.getElementById("root")!).render(<App />);
