const mongoose = require("mongoose");

const ResponseSchema = new mongoose.Schema({
  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  answers: [{ 
    question: String, 
    answer: String,
    // --- CHANGED TO ARRAY FOR MULTIPLE FILES ---
    evidencePaths: { 
      type: [String], 
      default: [] 
    },
    // --- STATUS PERSISTENCE ---
    status: { 
      type: String, 
      enum: ["red", "green", null], 
      default: null 
    }
  }],
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Response", ResponseSchema);