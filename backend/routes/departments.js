const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Department = require("../models/Department");
 
// 1. Get all departments
router.get("/", async (req, res) => {
  try {
    const depts = await Department.find().lean();
    res.json(depts);
  } catch (err) {
    console.error("GET /api/departments error:", err);
    res.status(500).json({ message: "Server error" });
  }
});
 
// 2. Get single department by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid department id" });
    }
    const dept = await Department.findById(id).lean();
    if (!dept) return res.status(404).json({ message: "Department not found" });
    res.json(dept);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
   // DELETE: Remove a department by ID
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Department ID format." });
    }

    // 2. Execute Deletion
    const deletedDept = await Department.findByIdAndDelete(id);

    if (!deletedDept) {
      return res.status(404).json({ message: "Department not found in database." });
    }

    // 3. Optional: Cleanup linked data
    // If you want to delete all responses associated with this dept:
    // await Response.deleteMany({ department: id });

    res.status(200).json({ 
      message: "Department and associated metadata purged successfully.",
      id: id 
    });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "Internal Server Error during deletion.", error: err.message });
  }
});

// POST: Register a new department
router.post("/", async (req, res) => {
  try {
    const { name, email } = req.body;

    // Professional Validation
    if (!name || !email) {
      return res.status(400).json({ message: "Name and Email are required." });
    }

    // Check if department already exists
    const existing = await Department.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Department with this email already exists." });
    }

    const newDept = new Department({ name, email });
    await newDept.save();

    res.status(201).json(newDept);
  } catch (err) {
    console.error("Error saving department:", err);
    res.status(500).json({ message: "Database Error: Could not save department." });
  }
});
// ✅ Update form questions in departments.js
router.put("/:id/form-questions", async (req, res) => {
  try {
    const { id } = req.params;
    // Get both arrays from the frontend request
    const { formQuestions, allQuestions } = req.body;
 
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid department id" });
    }
 
    // If formQuestions is missing, default to an empty array to prevent crashes
    const cleaned = Array.isArray(formQuestions)
      ? formQuestions.filter(q => typeof q === "string" && q.trim() !== "")
      : [];
 
    // Update both the active selection and the full bank
    const updated = await Department.findByIdAndUpdate(
      id,
      {
        formQuestions: Array.isArray(formQuestions) ? formQuestions : [],
        allQuestions: Array.isArray(allQuestions) ? allQuestions : []
      },
      { new: true, runValidators: true }
    );
 
    if (!updated) {
      return res.status(404).json({ message: "Department not found" });
    }
 
    res.json({ message: "Form questions updated", department: updated });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({ message: "Server error updating form questions" });
  }
});
 
module.exports = router;