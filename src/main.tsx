import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./app.css";
import "../node_modules/@ginger-society/ginger-ui/dist/esm/index.css";

import { AuthProvider } from "./shared/AuthContext";
import router from "./shared/router";

const rootElement = document.querySelector('[data-js="root"]') as HTMLElement;

if (!rootElement) {
  throw new Error("Failed to find the root element");
}

const root = createRoot(rootElement);
root.render(
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);
