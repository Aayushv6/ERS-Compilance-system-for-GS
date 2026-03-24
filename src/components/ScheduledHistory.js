import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

const ScheduledHistory = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  // --- Corporate Design System ---
  const styles = {
    container: { padding: "40px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Inter', sans-serif", backgroundColor: "#fbfcfd", minHeight: "100vh" },
    headerSection: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" },
    title: { fontSize: "24px", fontWeight: "700", color: "#1a202c", margin: 0 },
    card: { background: "#fff", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", overflow: "hidden", marginBottom: "40px", border: "1px solid #e2e8f0" },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { textAlign: "left", padding: "16px", background: "#f8fafc", color: "#4a5568", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" },
    td: { padding: "16px", borderBottom: "1px solid #f1f5f9", fontSize: "14px", color: "#2d3748" },
    refreshBtn: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontWeight: "600", transition: "0.2s" },
    cancelBtn: { background: "#fff5f5", color: "#c53030", border: "1px solid #feb2b2", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" },
    freqBadge: (type) => ({
      padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase",
      background: type === "once" ? "#f1f5f9" : "#ebf8ff",
      color: type === "once" ? "#475569" : "#2b6cb0"
    }),
    statusBadge: (type) => ({
      padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700", textTransform: "uppercase",
      background: type === "pending" ? "#fffaf3" : "#f0fff4",
      color: type === "pending" ? "#9c4221" : "#22543d"
    })
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/events/history`);
      setEvents(res.data);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  }, [API]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCancel = async (id) => {
    if (!window.confirm("Terminate this scheduled task? Future recurrences will stop.")) return;
    try {
      await axios.delete(`${API}/api/events/${id}`);
      fetchHistory();
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || "Action failed"));
    }
  };

  const upcoming = events.filter(e => e.status === "pending");
  const past = events.filter(e => e.status === "sent");

  if (loading && events.length === 0) return <div style={{ padding: "100px", textAlign: "center", color: "#718096" }}>Synchronizing logs...</div>;

  return (
    <div style={styles.container}>
      <header style={styles.headerSection}>
        <div>
          <h2 style={styles.title}>Audit Logs</h2>
          <p style={{ color: "#718096", margin: "4px 0 0 0", fontSize: "14px" }}>Monitor Upcoming Logs and History.</p>
        </div>
        <button onClick={fetchHistory} style={styles.refreshBtn}>
          Refresh Logs
        </button>
      </header>

      {/* --- UPCOMING DISPATCHES --- */}
      <h3 style={{ fontSize: "16px", color: "#9c4221", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ height: "10px", width: "10px", borderRadius: "50%", background: "#ed8936" }}></span>
        Upcoming Mails
      </h3>
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Frequency</th>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Next Release</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.length === 0 ? (
              <tr><td colSpan="5" style={{ ...styles.td, textAlign: "center", padding: "40px", color: "#a0aec0" }}>No pending Mails found.</td></tr>
            ) : (
              upcoming.map(event => (
                <tr key={event._id}>
                  <td style={styles.td}>
                    <span style={styles.freqBadge(event.sendType)}>{event.sendType}</span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: "600" }}>{event.department?.name || "N/A"}</td>
                  <td style={styles.td}>{new Date(event.send_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td style={styles.td}><span style={styles.statusBadge("pending")}>Queued</span></td>
                  <td style={styles.td}>
                    <button onClick={() => handleCancel(event._id)} style={styles.cancelBtn}>Revoke</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- HISTORICAL LOGS --- */}
      <h3 style={{ fontSize: "16px", color: "#22543d", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ height: "10px", width: "10px", borderRadius: "50%", background: "#48bb78" }}></span>
        Successful Mails
      </h3>
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Department</th>
              <th style={styles.th}>Sent Date</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Result</th>
            </tr>
          </thead>
          <tbody>
            {past.length === 0 ? (
              <tr><td colSpan="4" style={{ ...styles.td, textAlign: "center", padding: "40px", color: "#a0aec0" }}>No historical records found.</td></tr>
            ) : (
              past.map(event => (
                <tr key={event._id}>
                  <td style={{ ...styles.td, fontWeight: "500" }}>{event.department?.name || "N/A"}</td>
                  <td style={styles.td}>{new Date(event.sent_at || event.send_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td style={styles.td}><span style={{ color: "#718096", fontSize: "12px" }}>{event.sendType.toUpperCase()}</span></td>
                  <td style={styles.td}><span style={styles.statusBadge("sent")}>Delivered</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduledHistory;