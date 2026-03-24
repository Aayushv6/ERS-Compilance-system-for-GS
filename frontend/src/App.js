import React from "react";
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from "react-router-dom";
import TriggerEvent from "./components/TriggerEvent";
import DepartmentList from "./components/DepartmentList";
import ResponseTable from "./components/ResponseTable";
import FillForm from "./components/FillForm";
import ScheduledHistory from "./components/ScheduledHistory";
import AIChat from "./components/AIChat";
import "./App.css";
 
/* ---------- Navbar ---------- */
function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-left">
        <img src="/logo.jpg" alt="Company Logo" className="nav-logo" />
      </div>
 
      <div className="nav-right">
        <NavLink className="nav-link" to="/trigger">GS Scheduler</NavLink>
        <NavLink className="nav-link" to="/history">Audit Logs</NavLink>
        <NavLink className="nav-link" to="/departments">Departments</NavLink>
        <NavLink className="nav-link" to="/responses">Responses</NavLink>
        <NavLink className="nav-link ai-nav-link" to="/ai-chat">AI Assistant</NavLink>
      </div>
    </nav>
  );
}
 
/* ---------- Wrapper to hide navbar on form page ---------- */
function Layout({ children }) {
  const location = useLocation();
  // hide navbar ONLY on form link
  const hideNavbar = location.pathname.startsWith("/fill-form");
 
  return (
    <>
      {!hideNavbar && <Navbar />}
      <main className={!hideNavbar ? "container container--white" : ""}>
        {children}
      </main>
    </>
  );
}
 
/* ---------- Final App Structure ---------- */
export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Default Route */}
          <Route path="/" element={<TriggerEvent />} />
         
          {/* Admin Routes */}
          <Route path="/trigger" element={<TriggerEvent />} />
          <Route path="/history" element={<ScheduledHistory />} /> {/* ADDED ROUTE */}
          <Route path="/departments" element={<DepartmentList />} />
          <Route path="/responses" element={<ResponseTable />} />
          <Route path="/ai-chat" element={<AIChat />} />
         
          {/* External Link Route (No Navbar) */}
          <Route path="/fill-form/:eventId/:deptId" element={<FillForm />} />
        </Routes>
      </Layout>
    </Router>
  );
}