import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import FormBuilder from "./FormBuilder";

function TriggerEvent() {
  const [departments, setDepartments] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [editingDept, setEditingDept] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", email: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const styles = {
    container: { padding: "40px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: "#fbfcfd", minHeight: "100vh" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", borderBottom: "1px solid #eef2f6", paddingBottom: "24px" },
    title: { fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: 0 },
    subTitle: { color: "#64748b", fontSize: "14px", margin: "4px 0 0 0" },
    addBtn: { backgroundColor: "#0f172a", color: "#fff", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "14px" },
    primaryBtn: { backgroundColor: "#2563eb", color: "#fff", padding: "14px 28px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "15px", width: "100%" },
    secondaryBtn: { backgroundColor: "#f1f5f9", color: "#475569", padding: "12px 24px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px", marginBottom: "120px" },
    deptCard: (isSelected) => ({
      padding: "24px", borderRadius: "12px", backgroundColor: "#fff", position: "relative", cursor: "pointer", transition: "all 0.2s ease",
      border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
      boxShadow: isSelected ? "0 10px 15px -3px rgba(37, 99, 235, 0.1)" : "0 1px 3px rgba(0,0,0,0.05)"
    }),
    searchBar: { padding: "10px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "320px", fontSize: "14px", outline: "none", backgroundColor: "#fff" },
    inputGroup: { marginBottom: "20px" },
    label: { display: "block", fontSize: "11px", fontWeight: "700", color: "#64748b", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" },
    inputField: { padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "100%", fontSize: "14px", boxSizing: "border-box" },
    actionBar: { position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", width: "calc(100% - 80px)", maxWidth: "600px", backgroundColor: "#fff", padding: "20px 32px", borderRadius: "16px", boxShadow: "0 -10px 25px -5px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0", display: "flex", gap: "32px", alignItems: "center", zIndex: 900 },
    overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
    modal: { backgroundColor: "#fff", padding: "32px", borderRadius: "16px", width: "440px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }
  };

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/departments`);
      setDepartments(res.data);
    } catch (err) { console.error("Sync Error:", err); }
  }, [API]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDept.name || !newDept.email) return;
    try {
      await axios.post(`${API}/api/departments`, newDept);
      setNewDept({ name: "", email: "" });
      setShowAddModal(false);
      fetchDepartments();
    } catch (err) { alert("Registration failed."); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("CRITICAL: Permanently delete this entity?")) return;
    try {
      await axios.delete(`${API}/api/departments/${id}`);
      fetchDepartments();
      setSelectedDepartments(prev => prev.filter(item => item !== id));
    } catch (err) { alert("Access Denied: Could not delete entity."); }
  };

  const handleTriggerDispatch = async () => {
    if (selectedDepartments.length === 0) return alert("Select entities first.");
    setIsProcessing(true);

    const payload = {
      departments: selectedDepartments,
      schedule: new Date().toISOString(), // Sends immediate timestamp
      sendType: "once"
    };

    try {
      await axios.post(`${API}/api/events`, payload);
      alert("Email Dispatch Initialized Successfully.");
      setSelectedDepartments([]);
    } catch (err) {
      alert("System Error: Dispatch failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = departments.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>GS Departments</h1>
          <p style={styles.subTitle}>Manage Department onboarding triggers.</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowAddModal(true)}>+ Register New Entity</button>
      </header>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", alignItems: "center" }}>
        <input 
          style={styles.searchBar} 
          placeholder="Search by entity name..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <button 
          onClick={() => setSelectedDepartments(selectedDepartments.length === departments.length ? [] : departments.map(d => d._id))} 
          style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
        >
          {selectedDepartments.length === departments.length ? "Deselect All" : `Select All (${departments.length})`}
        </button>
      </div>

      <div style={styles.grid}>
        {filtered.map(dep => {
          const isSelected = selectedDepartments.includes(dep._id);
          return (
            <div 
              key={dep._id} 
              style={styles.deptCard(isSelected)} 
              onClick={() => setSelectedDepartments(prev => isSelected ? prev.filter(id => id !== dep._id) : [...prev, dep._id])}
            >
              <button 
                style={{ position: "absolute", top: "12px", right: "12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fee2e2", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                onClick={(e) => handleDelete(e, dep._id)}
              >
                X
              </button>
              <div style={{ paddingRight: "20px" }}>
                <span style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", letterSpacing: "0.1em" }}>ID: {dep._id.slice(-6).toUpperCase()}</span>
                <div style={{ fontWeight: "700", fontSize: "18px", color: "#1e293b", marginTop: "4px" }}>{dep.name}</div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>{dep.email}</div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setEditingDept(dep); }} 
                style={{ width: "100%", marginTop: "20px", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: "600", fontSize: "12px", cursor: "pointer" }}
              >
                Configure Questions
              </button>
            </div>
          );
        })}
      </div>

      {/* --- Floating Action Bar (Cleaned) --- */}
      {selectedDepartments.length > 0 && (
        <div style={styles.actionBar}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: "14px", color: "#1e293b" }}>
              Ready to send to <strong>{selectedDepartments.length}</strong> Selected Departments.
            </p>
            <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>Emails will be sent immediately.</p>
          </div>
          <button 
            disabled={isProcessing} 
            onClick={handleTriggerDispatch} 
            style={{ ...styles.primaryBtn, width: "200px", backgroundColor: isProcessing ? "#94a3b8" : "#2563eb" }}
          >
            {isProcessing ? "Processing..." : "Send Email"}
          </button>
        </div>
      )}

      {showAddModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "20px" }}>Register New Department</h2>
            <form onSubmit={handleAddDepartment}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Department Name</label>
                <input style={styles.inputField} placeholder="e.g. Finance" value={newDept.name} onChange={e => setNewDept({...newDept, name: e.target.value})} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <input style={styles.inputField} type="email" placeholder="manager@company.com" value={newDept.email} onChange={e => setNewDept({...newDept, email: e.target.value})} required />
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
                <button type="submit" style={styles.primaryBtn}>Register</button>
                <button type="button" onClick={() => setShowAddModal(false)} style={styles.secondaryBtn}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingDept && (
        <FormBuilder 
          department={editingDept} 
          onClose={() => setEditingDept(null)} 
          onSave={fetchDepartments} 
        />
      )}
    </div>
  );
}

export default TriggerEvent;