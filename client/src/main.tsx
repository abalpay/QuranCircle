import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  // Prevent the default browser behavior which would log the error to the console
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <App />
);
