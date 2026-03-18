import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTheme, getStoredTheme } from "@/hooks/useTheme";

applyTheme(getStoredTheme());
createRoot(document.getElementById("root")!).render(<App />);
