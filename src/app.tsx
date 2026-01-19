
// src/App.tsx
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import AgentListings from "./pages/AgentListings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />

      {/* Guarded pages */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/agent" element={<AgentListings />} />
    </Routes>
  );
}
