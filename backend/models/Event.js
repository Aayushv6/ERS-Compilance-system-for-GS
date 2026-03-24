const mongoose = require("mongoose");
const EventSchema = new mongoose.Schema({
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
  send_at: { type: Date, required: true },
  status: { type: String, enum: ["pending", "sent", "processing"], default: "pending" },
  sent_at: { type: Date },
  // This is your SNAPSHOT. It stores the questions exactly as they were 
  // at the time this specific link was generated.
  selectedQuestions: [{ type: String }], 
  sendType: { type: String },
  token: { type: String },
  expiresAt: { type: Date }
});

module.exports = mongoose.model("Event", EventSchema);