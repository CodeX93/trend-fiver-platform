import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Force new build hash - admin profile fix v2

createRoot(document.getElementById("root")!).render(<App />);
