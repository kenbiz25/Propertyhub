
// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import AppRouter from "./approuter"; // mount the single RouterProvider-based router
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
