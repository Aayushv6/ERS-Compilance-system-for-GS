import React, { useState } from "react";
import axios from "axios";
import "./AIChat.css";
const AIChat = () => {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

const handleAsk = async (e) => {
  e.preventDefault();
  if (!question.trim()) return;

  // Add user message to history
  setChatHistory((prev) => [...prev, { role: "user", text: question }]);
  setLoading(true);

  try {
    // Note: Python FastAPI usually runs on 8000, while Node runs on 5000. 
    // Ensure this matches your Python app's port.
    const res = await axios.post("http://localhost:8000/ask", { question });
    
    setChatHistory((prev) => [...prev, { role: "ai", text: res.data.answer }]);
  } catch (err) {
    setChatHistory((prev) => [...prev, { role: "ai", text: "I'm having trouble connecting to the database right now." }]);
  } finally {
    setLoading(false);
    setQuestion("");
  }
};

  return (
    <div className="ai-chat-container">
      <h2>Compliance AI Assistant</h2>
      <div className="chat-window">
       {chatHistory.map((msg, idx) => (
  <div key={idx} className={`chat-bubble ${msg.role}`}>
    <strong>{msg.role === "user" ? "You" : "Assistant"}</strong>
    {msg.text.split('\n').map((line, i) => (
      <div key={i} style={{ marginBottom: '8px' }}>
        {line}
      </div>
    ))}
  </div>
))}
        {loading && <p className="loading-text">AI is thinking...</p>}
      </div>
      
      <form onSubmit={handleAsk} className="chat-input-area">
        <input 
          type="text" 
          value={question} 
          onChange={(e) => setQuestion(e.target.value)} 
          placeholder="Ask me anything about compliance records..."
        />
        <button type="submit" disabled={loading}>Send</button>
      </form>
    </div>
  );
};

export default AIChat;