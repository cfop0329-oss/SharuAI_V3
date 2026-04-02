// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SubsidyApplication from "./pages/SubsidyApplication";
import ExpertQueue from "./pages/ExpertQueue";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subsidy-application" element={<SubsidyApplication />} />
        <Route path="/expert-queue" element={<ExpertQueue />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);