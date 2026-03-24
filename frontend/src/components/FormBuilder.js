import React, { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
 
export default function FormBuilder({ department, onClose, onSave }) {
  // Ensure we are working with objects {text, hint}
  const formatInitialData = (data) => {
    if (!data || !Array.isArray(data)) return [];
    return data.map(q => typeof q === 'string' ? { text: q, hint: "" } : q);
  };
 
  const [bank, setBank] = useState(formatInitialData(department.allQuestions || department.formQuestions));
  const [selected, setSelected] = useState(formatInitialData(department.formQuestions));
  const [newQuestion, setNewQuestion] = useState("");
  const [newHint, setNewHint] = useState("");
  const [saving, setSaving] = useState(false);
 
  const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
 
  // --- 1. Excel Import Logic ---
const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
 
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
       
        // Convert to JSON
        const rawRows = XLSX.utils.sheet_to_json(ws);
 
        if (rawRows.length === 0) {
          alert("The Excel file seems to be empty.");
          return;
        }
 
        const extracted = rawRows.map(row => {
          // Normalize keys: trim spaces and convert to lowercase
          const normalizedRow = {};
          Object.keys(row).forEach(key => {
            normalizedRow[key.trim().toLowerCase()] = row[key];
          });
 
          return {
            text: (normalizedRow["question"] || normalizedRow["text"] || "").toString().trim(),
            hint: (normalizedRow["hint"] || normalizedRow["sample"] || "").toString().trim()
          };
        }).filter(q => q.text !== "");
 
        // Prevent duplicates
        const newItems = extracted.filter(newItem =>
          !bank.some(existing => existing.text.toLowerCase() === newItem.text.toLowerCase())
        );
 
        if (newItems.length === 0) {
            alert("No new questions found. Check if questions already exist or if headers are 'Question' and 'Hint'.");
            return;
        }
 
        setBank(prev => [...prev, ...newItems]);
        setSelected(prev => [...prev, ...newItems]);
       
        // Reset file input so same file can be uploaded again if needed
        e.target.value = "";
        alert(`Successfully imported ${newItems.length} questions!`);
      } catch (err) {
        console.error("Import Error:", err);
        alert("Error reading Excel file. Make sure it's a valid .xlsx or .xls file.");
      }
    };
    reader.readAsArrayBuffer(file); // Modern way to read files
  };
 
  // --- 2. Selection & Removal ---
  const toggleSelect = (item) => {
    const isSelected = selected.some(s => s.text === item.text);
    if (isSelected) {
      setSelected(selected.filter(s => s.text !== item.text));
    } else {
      setSelected([...selected, item]);
    }
  };
 
  const removePermanently = (indexToRemove) => {
    const itemToRemove = bank[indexToRemove];
    setBank(bank.filter((_, idx) => idx !== indexToRemove));
    setSelected(selected.filter(s => s.text !== itemToRemove.text));
  };
 
  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    const newItem = { text: newQuestion.trim(), hint: newHint.trim() };
   
    // Check for duplicates
    if (bank.some(existing => existing.text === newItem.text)) {
        alert("This question already exists.");
        return;
    }
 
    setBank([...bank, newItem]);
    setSelected([...selected, newItem]);
    setNewQuestion("");
    setNewHint("");
  };
 
  // --- 3. Save to Backend ---
  const saveForm = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/departments/${department._id}/form-questions`, {
        formQuestions: selected,
        allQuestions: bank
      });
      alert("Form configuration saved successfully!");
      onSave();
      onClose();
    } catch (err) {
      alert("Failed to save. Check backend connection.");
    } finally {
      setSaving(false);
    }
  };
 
  const styles = {
    overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 },
    modal: { width: "550px", backgroundColor: "#fff", borderRadius: "12px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", maxHeight: "90vh", display: "flex", flexDirection: "column" },
    title: { margin: "0 0 8px 0", fontSize: "20px", fontWeight: "700" },
    subtitle: { color: "#64748b", fontSize: "14px", marginBottom: "20px" },
    scrollArea: { flex: 1, overflowY: "auto", border: "1px solid #f1f5f9", borderRadius: "8px", padding: "12px", marginBottom: "16px", backgroundColor: "#f8fafc" },
    questionRow: { display: "flex", alignItems: "center", gap: "10px", padding: "10px", backgroundColor: "#fff", marginBottom: "8px", borderRadius: "6px", border: "1px solid #e2e8f0" },
    inputGroup: { display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px", borderTop: "1px solid #eee", paddingTop: "16px" },
    primaryBtn: { padding: "10px 20px", borderRadius: "6px", background: "#2563eb", color: "#fff", border: "none", cursor: "pointer", fontWeight: "600" },
    secondaryBtn: { padding: "10px 20px", borderRadius: "6px", background: "#fff", border: "1px solid #cbd5e1", cursor: "pointer" },
    hintTag: { fontSize: "11px", color: "#2563eb", fontStyle: "italic", marginLeft: "auto" }
  };
 
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.title}>Configure Form: {department.name}</h3>
        <p style={styles.subtitle}>Select questions from the bank or upload via Excel.</p>
 
        <div style={{ marginBottom: "15px" }}>
          <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} id="excel-upload" style={{ display: "none" }} />
          <label htmlFor="excel-upload" style={{ ...styles.secondaryBtn, display: "inline-block", fontSize: "13px" }}>
             Import from Excel (Question & Hint)
          </label>
        </div>
 
        <div style={styles.scrollArea}>
          {bank.length === 0 && <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>Bank is empty.</p>}
          {bank.map((q, idx) => (
            <div key={idx} style={styles.questionRow}>
              <input
                type="checkbox"
                checked={selected.some(s => s.text === q.text)}
                onChange={() => toggleSelect(q)}
                style={{ cursor: "pointer" }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "500" }}>{q.text}</div>
                {q.hint && <div style={{ fontSize: "12px", color: "#64748b" }}>💡 {q.hint}</div>}
              </div>
              <button
                onClick={() => removePermanently(idx)}
                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "12px" }}>
                Delete
              </button>
            </div>
          ))}
        </div>
 
        <div style={styles.inputGroup}>
          <input
            type="text"
            placeholder="Question text..."
            value={newQuestion}
            onChange={e => setNewQuestion(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
          />
          <input
            type="text"
            placeholder="Hint/Sample Answer (Optional)..."
            value={newHint}
            onChange={e => setNewHint(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
          />
          <button onClick={addQuestion} style={{ ...styles.secondaryBtn, background: "#f8fafc" }}>+ Add Manually</button>
        </div>
 
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onClose} style={styles.secondaryBtn}>Cancel</button>
          <button onClick={saveForm} disabled={saving} style={styles.primaryBtn}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
 