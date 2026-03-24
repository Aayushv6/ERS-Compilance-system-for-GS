const mongoose = require("mongoose");
 
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
    allQuestions: [{
    text: { type: String, required: true },
    hint: { type: String, default: "" }
  }],
  formQuestions: [{
    text: { type: String, required: true },
    hint: { type: String, default: "" }
  }]
});
 
module.exports = mongoose.model("Department", departmentSchema);
