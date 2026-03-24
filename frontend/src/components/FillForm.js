import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./FillForm.css";
 
function FillForm() {
  const { eventId, deptId } = useParams();
  const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
 
  const [department, setDepartment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [revertedIndices, setRevertedIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadError, setLoadError] = useState("");
 
  useEffect(() => {
    const loadData = async () => {
      try {
        setQuestions([]);
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
 
        const verifyRes = await axios.get(`${API}/api/events/verify/${eventId}?token=${token}`);
        const deptRes = await axios.get(`${API}/api/departments/${deptId}`);
 
        setQuestions(deptRes.data?.formQuestions || []);
        setDepartment(deptRes.data);
 
        try {
          const resRes = await axios.get(`${API}/api/responses/event/${eventId}`);
          if (resRes.data?.answers) {
            const tempAnswers = {};
            const tempReverted = [];
            resRes.data.answers.forEach((ans, i) => {
              tempAnswers[i] = ans.answer || "";
              if (!ans.answer || ans.answer.trim() === "") tempReverted.push(i);
            });
            setAnswers(tempAnswers);
            setRevertedIndices(tempReverted);
          }
        } catch (e) {
          console.log("New submission started.");
        }
      } catch (err) {
        setLoadError(err.response?.data?.message || "Link has expired or is invalid.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [eventId, deptId, API]);
 
  const handleFileChange = (index, selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    setFiles({ ...files, [index]: fileArray });
  };
 
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior
    if (submitting) return;
 
    setSubmitting(true);
    try {
      const formData = new FormData();
      const token = new URLSearchParams(window.location.search).get("token");
 
      formData.append("department", deptId);
      formData.append("event", eventId);
      formData.append("token", token);
 
      formData.append("answers", JSON.stringify(questions.map((q, i) => ({
        question: q.text, // Use the text property
        answer: (answers[i] || "").toString()
      }))));
 
      Object.keys(files).forEach(i => {
        files[i].forEach((file) => {
          formData.append(`evidence_${i}`, file);
        });
      });
 
      await axios.post(`${API}/api/responses`, formData);
      setSubmitted(true);
    } catch (err) {
      alert("Submission failed. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };
 
  if (loading) return <div className="loading-state">Initializing secure session...</div>;
  if (loadError) return <div className="error-state" style={{ color: '#ef4444' }}>⚠️ {loadError}</div>;
 
  if (submitted) return (
    <div className="success-state">
      <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
      <h2 style={{ margin: 0 }}>Submission Complete</h2>
      <p style={{ color: '#64748b' }}>Your compliance data has been securely recorded.</p>
    </div>
  );
 
  return (
    <div className="form-container">
      <div className="header-section">
        <h2>Departmental Compliance</h2>
        <p>Entity: <strong>{department?.name}</strong></p>
      </div>
 
      <form onSubmit={handleSubmit}> {/* Wrap in form to use native 'required' validation */}
        {questions.map((q, i) => {
          const isReverted = revertedIndices.includes(i);
          const selectedCount = files[i]?.length || 0;
          const questionText = typeof q === 'string' ? q : q.text;
          const questionHint = q.hint || "Please provide a detailed response.";
 
          return (
            <div key={i} className={`question-card ${isReverted ? 'reverted-card' : ''}`}>
              {isReverted && <span className="revert-badge">Action Required</span>}
 
              <div className="label-wrapper">
                <label className="input-label">{questionText}</label>
                {/* Information Icon */}
                <div className="info-btn-wrapper">
                  <span className="info-icon">i</span>
                  <div className="info-tooltip">
                    <strong>Note:</strong> {questionHint}
                  </div>
                </div>
              </div>
 
              <input
                type="text"
                className="text-input"
                value={answers[i] || ""}
                onChange={(e) => setAnswers({ ...answers, [i]: e.target.value })}
                placeholder="Enter your response here..."
                required // Makes the field mandatory
              />
 
              <div className="file-upload-section">
                <label className="file-input-label">Supporting Evidence (Optional):</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileChange(i, e.target.files)}
                />
                {selectedCount > 0 && (
                  <div className="file-count-badge">
                    {selectedCount} file(s) selected
                  </div>
                )}
              </div>
            </div>
          );
        })}
 
        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "Processing..." : "Finalize and Submit"}
        </button>
      </form>
    </div>
  );
}
 
export default FillForm;
 