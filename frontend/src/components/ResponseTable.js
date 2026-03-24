import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";

export default function ResponseTable() {
  const [groupedData, setGroupedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedDeptName, setSelectedDeptName] = useState("all");
  const [showExportModal, setShowExportModal] = useState(false);
  
  // --- PREVIEW STATE ---
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null); 

  // --- REVERT SELECTION ---
  const [revertList, setRevertList] = useState([]); 
  const [reverting, setReverting] = useState(false);

  // --- STATUS SELECTION ---
  const [statusMap, setStatusMap] = useState({}); 
  const [activeMenu, setActiveMenu] = useState(null); 

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const loadResponses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/responses`);
      const data = Array.isArray(res.data) ? res.data : [];
      
      const initialStatusMap = {};
      data.forEach(form => {
        form.answers.forEach((ans, idx) => {
          if (ans.status) {
            initialStatusMap[`${form._id}-${idx}`] = ans.status;
          }
        });
      });
      
      setStatusMap(initialStatusMap);
      setGroupedData(data.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)));
    } catch (e) {
      setErr("Failed to synchronize with server.");
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    loadResponses();
  }, [loadResponses]);

  const handleViewEvidence = (e, filename) => {
    e.preventDefault();
    e.stopPropagation();

    if (!filename) return;

    const base = process.env.REACT_APP_API_URL || "http://localhost:5000";
    const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const url = `${cleanBase}/uploads/${filename}`;
    
    const ext = filename.split('.').pop().toLowerCase();
    let type = 'other';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) type = 'image';
    else if (ext === 'pdf') type = 'pdf';

    setPreviewType(type);
    setPreviewUrl(url);
  };

  const toggleRevert = (formId, qIdx) => {
    const itemKey = `${formId}-${qIdx}`;
    setRevertList(prev => 
      prev.includes(itemKey) 
        ? prev.filter(i => i !== itemKey) 
        : [...prev, itemKey]
    );
  };

  const executeRevert = async () => {
    if (revertList.length === 0) return alert("Select at least one question to revert.");
    if (!window.confirm(`Revert ${revertList.length} questions? This will notify the department.`)) return;

    setReverting(true);
    try {
      await axios.post(`${API_BASE}/api/responses/revert`, { reverts: revertList });
      alert("Questions reverted. Department has been notified.");
      setRevertList([]);
      loadResponses();
    } catch (e) {
      alert("Error reverting questions.");
    } finally {
      setReverting(false);
    }
  };

  const setStatus = async (key, color) => {
    const [formId, index] = key.split("-");
    try {
      setStatusMap(prev => ({ ...prev, [key]: color }));
      await axios.patch(`${API_BASE}/api/responses/status`, {
        formId,
        index: parseInt(index),
        status: color
      });
    } catch (e) {
      alert("Server error: Status could not be saved.");
      loadResponses(); 
    }
    setActiveMenu(null);
  };

  const departmentObjects = useMemo(() => {
    const map = new Map();
    groupedData.forEach(item => {
      if (item.department?._id && item.department?.name) {
        map.set(item.department._id, item.department.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [groupedData]);

  const filteredData = useMemo(() => {
    if (selectedDeptName === "all") return groupedData;
    return groupedData.filter(item => item.department?.name === selectedDeptName);
  }, [selectedDeptName, groupedData]);

  const triggerExport = (deptId) => {
    const query = deptId !== "all" ? `?department=${deptId}` : "";
    window.open(`${API_BASE}/api/responses/export${query}`, "_blank");
    setShowExportModal(false);
  };

  const styles = {
    container: { padding: "40px", backgroundColor: "#f8f9fa", minHeight: "100vh", fontFamily: "'Inter', sans-serif" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" },
    title: { fontSize: "24px", fontWeight: "700", color: "#1a1a1a", margin: 0 },
    controls: { display: "flex", gap: "10px", alignItems: "center" },
    filterSelect: { padding: "10px", borderRadius: "6px", border: "1px solid #e0e0e0", backgroundColor: "#fff" },
    btnRefresh: { padding: "10px 20px", borderRadius: "6px", border: "1px solid #e0e0e0", backgroundColor: "#fff", cursor: "pointer", fontWeight: "600" },
    btnExport: { padding: "10px 20px", borderRadius: "6px", border: "none", backgroundColor: "#000", color: "#fff", cursor: "pointer", fontWeight: "600" },
    btnRevert: { padding: "10px 20px", borderRadius: "6px", border: "none", backgroundColor: "#e03131", color: "#fff", cursor: "pointer", fontWeight: "700" },
    card: { backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", overflow: "hidden" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: "14px" },
    th: { backgroundColor: "#f1f3f5", color: "#666", textAlign: "left", padding: "16px", fontWeight: "600", position: "sticky", top: 0 },
    td: { padding: "16px", borderBottom: "1px solid #f0f0f0", verticalAlign: "top" },
    deptCell: { fontWeight: "700", backgroundColor: "#fafafa", borderRight: "1px solid #f0f0f0" },
    badge: { padding: "4px 10px", borderRadius: "6px", fontSize: "11px", backgroundColor: "#e7f5ff", color: "#228be6", border: "1px solid #d0ebff", cursor: "pointer", fontWeight: "600", display: "block", marginBottom: "4px", textAlign: "center", whiteSpace: "nowrap" },
    
    statusCell: { cursor: "pointer", position: "relative", minWidth: "150px", borderRight: "1px solid #f0f0f0" },
    statusMenu: { position: "absolute", zIndex: 10, top: "40px", left: "10px", backgroundColor: "#fff", padding: "10px", borderRadius: "8px", boxShadow: "0 10px 15px rgba(0,0,0,0.1)", display: "flex", gap: "10px", border: "1px solid #eee" },
    dot: (c) => ({ height: "10px", width: "10px", borderRadius: "50%", backgroundColor: c, display: "inline-block", marginRight: "8px" }),
    btnGreen: { backgroundColor: "#2f9e44", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "700" },
    btnRed: { backgroundColor: "#e03131", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "700" },

    modalOverlay: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
    modalContent: { backgroundColor: "#fff", padding: "30px", borderRadius: "12px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" },
    modalTitle: { marginTop: 0, fontSize: "18px", fontWeight: "700" },
    modalBtn: { width: "100%", padding: "12px", marginBottom: "10px", borderRadius: "6px", border: "1px solid #e0e0e0", backgroundColor: "#fff", cursor: "pointer", textAlign: "left", fontWeight: "500" },
    modalBtnPrimary: { backgroundColor: "#000", color: "#fff", border: "none", textAlign: "center", fontWeight: "700" }
  };

  return (
    <div style={styles.container}>
      {/* EXCEL EXPORT MODAL */}
      {showExportModal && (
        <div style={styles.modalOverlay} onClick={() => setShowExportModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Excel Export</h2>
            <button style={{ ...styles.modalBtn, ...styles.modalBtnPrimary }} onClick={() => triggerExport("all")}>
              Export Master (All Departments)
            </button>
            <div style={{ margin: "15px 0", textAlign: "center", fontSize: "11px", color: "#999", fontWeight: "800" }}>OR SELECT SPECIFIC</div>
            <div style={{ maxHeight: "250px", overflowY: "auto" }}>
              {departmentObjects.map(dept => (
                <button key={dept.id} style={styles.modalBtn} onClick={() => triggerExport(dept.id)}>
                  {dept.name}
                </button>
              ))}
            </div>
            <button style={{ ...styles.modalBtn, border: "none", color: "#999", textAlign: "center", marginTop: "10px" }} onClick={() => setShowExportModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* --- POP-UP PREVIEW --- */}
      {previewUrl && (
        <div 
          style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.9)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999,
          }}
          onClick={() => setPreviewUrl(null)}
        >
          <div 
            style={{
              backgroundColor: "#fff", borderRadius: "16px", width: "90%", maxWidth: "1000px", maxHeight: "90vh",
              display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 25px" }}>
              <span style={{ fontWeight: "800", color: "#0f172a", fontSize: "16px" }}>Evidence Document Preview</span>
              <button onClick={() => setPreviewUrl(null)} style={{ border: "none", background: "#f1f5f9", padding: "8px 16px", borderRadius: "8px", fontWeight: "700", cursor: "pointer", color: "#475569" }}>✕ Close</button>
            </div>
            <div style={{ padding: "20px", display: "flex", justifyContent: "center", backgroundColor: "#cbd5e1", overflowY: "auto", minHeight: "60vh" }}>
              {previewType === 'image' && (
                <img src={previewUrl} alt="Evidence" style={{ maxWidth: "100%", height: "auto", objectFit: "contain", borderRadius: "4px", boxShadow: "0 10px 15px rgba(0,0,0,0.1)" }} />
              )}
              {previewType === 'pdf' && (
                <iframe src={previewUrl} title="PDF Preview" style={{ width: "100%", height: "75vh", border: "none" }} />
              )}
              {previewType === 'other' && (
                <div style={{ padding: "60px", textAlign: "center", backgroundColor: "#fff", borderRadius: "12px" }}>
                  <p style={{ marginBottom: "20px", color: "#64748b" }}>Direct preview not supported for this format.</p>
                  <a href={previewUrl} target="_blank" rel="noreferrer" style={{ backgroundColor: "#2563eb", color: "#fff", padding: "12px 24px", borderRadius: "8px", textDecoration: "none", fontWeight: "700" }}>Download/Open File</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Response Hub</h1>
          <p style={{ color: "#64748b", marginTop: "5px", fontSize: "14px" }}>Audit trail and departmental evidence management.</p>
        </div>
        <div style={styles.controls}>
          {revertList.length > 0 && (
            <button onClick={executeRevert} style={styles.btnRevert} disabled={reverting}>
              {reverting ? "Reverting..." : `Notify Reversal (${revertList.length})`}
            </button>
          )}
          <select style={styles.filterSelect} value={selectedDeptName} onChange={(e) => setSelectedDeptName(e.target.value)}>
            <option value="all">All Departments</option>
            {departmentObjects.map(dept => <option key={dept.id} value={dept.name}>{dept.name}</option>)}
          </select>
          <button onClick={loadResponses} style={styles.btnRefresh}>Sync Data</button>
          <button onClick={() => setShowExportModal(true)} style={styles.btnExport}>Generate Master Excel</button>
        </div>
      </header>

      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{...styles.th, width: "50px", textAlign: "center"}}>Rev.</th>
              <th style={styles.th}>Evaluation</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Question</th>
              <th style={styles.th}>Response</th>
              <th style={{...styles.th, width: "180px"}}>Evidence (Artifacts)</th>
              <th style={styles.th}>Sub. Date</th>
              <th style={styles.th}>Time</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="8" style={{ ...styles.td, textAlign: "center", padding: "60px", color: "#94a3b8" }}>No compliance records found for this criteria.</td></tr>
            ) : (
              filteredData.map((form) => {
                const ts = new Date(form.submittedAt);
                return form.answers.map((ans, idx) => {
                  const itemKey = `${form._id}-${idx}`;
                  const currentStatus = statusMap[itemKey];
                  const hasFiles = ans.evidencePaths && ans.evidencePaths.length > 0;

                  return (
                    <tr key={itemKey} style={{ backgroundColor: revertList.includes(itemKey) ? "#fff1f2" : "transparent" }}>
                      <td style={{ ...styles.td, textAlign: "center" }}>
                        <input 
                          type="checkbox" 
                          checked={revertList.includes(itemKey)}
                          onChange={() => toggleRevert(form._id, idx)}
                          style={{ cursor: "pointer" }}
                        />
                      </td>

                      <td 
                        style={{ ...styles.td, ...styles.statusCell }} 
                        onClick={() => setActiveMenu(activeMenu === itemKey ? null : itemKey)}
                      >
                        {currentStatus ? (
                          <div style={{ fontWeight: "700", color: currentStatus === "red" ? "#e11d48" : "#16a34a", fontSize: "13px" }}>
                            <span style={styles.dot(currentStatus === "red" ? "#e11d48" : "#16a34a")}></span>
                            {currentStatus === "red" ? "Action Required" : "Verified"}
                          </div>
                        ) : <span style={{ color: "#cbd5e1", fontSize: "12px" }}>Set Status...</span>}

                        {activeMenu === itemKey && (
                          <div style={styles.statusMenu} onClick={(e) => e.stopPropagation()}>
                            <button style={styles.btnGreen} onClick={() => setStatus(itemKey, "green")}>Verify</button>
                            <button style={styles.btnRed} onClick={() => setStatus(itemKey, "red")}>Reject</button>
                          </div>
                        )}
                      </td>

                      {idx === 0 && (
                        <td rowSpan={form.answers.length} style={{ ...styles.td, ...styles.deptCell }}>
                          {form.department?.name || "Unassigned"}
                        </td>
                      )}
                      
                      <td style={{...styles.td, color: "#475569"}}>{ans.question}</td>
                      <td style={{ ...styles.td, fontWeight: "600", color: "#1e293b" }}>{ans.answer || "—"}</td>
                      
                      {/* --- MULTIPLE FILE HANDLER --- */}
                      <td style={styles.td}>
                        {hasFiles ? (
                          <div>
                            {ans.evidencePaths.map((file, fIdx) => (
                              <button 
                                key={fIdx}
                                onClick={(e) => handleViewEvidence(e, file)} 
                                style={styles.badge}
                              >
                                File {ans.evidencePaths.length > 1 ? fIdx + 1 : ""} Preview
                              </button>
                            ))}
                            <div style={{fontSize: "10px", color: "#94a3b8", marginTop: "4px", textAlign: "center"}}>
                               {ans.evidencePaths.length} document(s)
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#e2e8f0", fontSize: "12px", fontStyle: "italic" }}>No files uploaded</span>
                        )}
                      </td>

                      {idx === 0 && (
                        <>
                          <td rowSpan={form.answers.length} style={styles.td}>
                            {ts.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td rowSpan={form.answers.length} style={{ ...styles.td, color: "#94a3b8" }}>
                            {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                });
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}