const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");
const ExcelJS = require("exceljs");
const Response = require("../models/Response");
const Event = require("../models/Event");
const { saveResponsesToExcel } = require("../utils/excelService");
 const sendEmail = require("../utils/sendEmail");

router.post("/revert", async (req, res) => {
  const { reverts } = req.body; 
  console.log("Revert request received:", reverts);
  
  try {
    const groupMap = {};
    reverts.forEach(item => {
      const [formId, index] = item.split("-");
      if (!groupMap[formId]) groupMap[formId] = [];
      groupMap[formId].push(parseInt(index));
    });

    for (const formId of Object.keys(groupMap)) {
      // Find the response and populate department for the email address
      const responseDoc = await Response.findById(formId).populate("department");
      if (!responseDoc) {
        console.log(`Response ${formId} not found`);
        continue;
      }

      // 1. Reset the specific answers
      groupMap[formId].forEach(idx => {
        if (responseDoc.answers[idx]) {
          responseDoc.answers[idx].answer = ""; 
          responseDoc.answers[idx].evidencePaths = [];
        }
      });
      
      await responseDoc.save();

      // 2. Update the Event status
      // 2. Find the associated Event
      const eventDoc = await Event.findById(responseDoc.event);
      if (eventDoc) {
        // Set to "pending" to satisfy the Mongoose Enum
        eventDoc.status = "pending"; 
        
        // CRITICAL: Set isSubmitted to false so the frontend allows the user to fill it again
        eventDoc.isSubmitted = false;

        /**
         * PREVENT CRON CONFLICT:
         * Update 'send_at' to 1 hour from now. 
         * This gives your manual email time to arrive first, 
         * and prevents the Cron from sending a duplicate immediately.
         */
        eventDoc.send_at = new Date(Date.now() + 60 * 60 * 1000); 
        
        await eventDoc.save();

        // 3. Send the manual "Update" email
        const domain = process.env.FRONTEND_URL || "http://localhost:3000";
        const link = `${domain}/fill-form/${eventDoc._id}/${responseDoc.department._id}?token=${eventDoc.token}`;
        
        try {
          await sendEmail(
            responseDoc.department.email,
            "Action Required: Compliance Revision",
            `Dear ${responseDoc.department.name} Team,\n\nYour previous submission requires updates for specific items. Please use the link below to revise your response:\n\nLink: ${link}`
          );
          console.log(` Revert email sent to: ${responseDoc.department.email}`);
        } catch (mErr) { 
          console.error(" Email failed but database was updated:", mErr.message); 
        }
      }
    }
    res.json({ success: true, message: "Records reverted successfully" });
  } catch (error) {
    console.error(" Revert Route Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- MULTER CONFIG ---
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
 
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage: storage });
 
// --- HELPERS ---
function formatDateYYYYMMDD(dateObj) {
    if (!dateObj) return "-";
    const d = new Date(dateObj);
    return d.toISOString().split('T')[0];
}
 
function toFlatRows(doc) {
    const rows = [];
    const ts = doc.submittedAt ? new Date(doc.submittedAt) : null;
    const dateStr = ts ? formatDateYYYYMMDD(ts) : "-";

    if (Array.isArray(doc.answers)) {
        doc.answers.forEach((a, index) => {
            rows.push({
                _id: doc._id,
                index: index, // Useful for the GAP logic
                department: doc.department,
                question: a?.question || "-",
                answer: a?.answer || "-",
                // Change: Look for the array 'evidencePaths', not the string 'evidencePath'
                evidencePaths: a?.evidencePaths || [], 
                // New: Add the status field
                status: a?.status || null, 
                date: dateStr,
                timestamp: ts
            });
        });
    }
    return rows;
}

// GET: Read responses for the dashboard
router.get("/", async (req, res) => {
    try {
        const { department } = req.query;
        const filter = {};
 
        if (department && mongoose.Types.ObjectId.isValid(department)) {
            filter.department = department;
        }
 
        const responses = await Response.find(filter)
            .populate({ path: "department", select: "name" })
            .sort({ submittedAt: -1 })
            .lean();
 
        res.json(responses);
    } catch (err) {
        console.error("Fetch error:", err);
        res.status(500).send("Error fetching from MongoDB");
    }
});
 
// GET: Export to Excel
router.get("/export", async (req, res) => {
    try {
        const { department } = req.query;
        const filter = (department && mongoose.Types.ObjectId.isValid(department))
            ? { department }
            : {};

        // Update your query sort to keep departments together
const docs = await Response.find(filter)
    .populate("department", "name")
    .sort({ "department.name": 1, submittedAt: -1 }) // Added department sort
    .lean();
        const rows = docs.flatMap(toFlatRows);

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Responses");

        // 1. ADDED "Status" TO COLUMNS
        ws.columns = [
            { header: "Status", key: "status", width: 18 }, // Added column
            { header: "Department", key: "dept", width: 25 },
            { header: "Questionnaire Item", key: "q", width: 35 },
            { header: "Response", key: "a", width: 35 },
            { header: "Evidence File", key: "ev", width: 20 },
            { header: "Submission Date", key: "d", width: 15 },
            { header: "Timestamp", key: "ts", width: 15 }
        ];

        // Style the header row
        ws.getRow(1).font = { bold: true };

        // Keep track of the department we just processed
let lastDeptId = null;

rows.forEach(r => {
    const timeStr = r.timestamp instanceof Date
        ? r.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : "-";

    let statusText = "Pending Review";
    if (r.status === "green") statusText = "Satisfied";
    if (r.status === "red") statusText = "Gap Identified (Reverted)";

    // Determine if we should show the department name or leave it blank
    const currentDeptId = r.department?._id?.toString() || r.department?.name;
    const showDept = currentDeptId !== lastDeptId ? (r.department?.name || "-") : "";
    
    // Update the tracker for the next iteration
    lastDeptId = currentDeptId;

    const row = ws.addRow({
        status: statusText,
        dept: showDept, // This will be empty if it's the same department as the row above
        q: r.question,
        a: r.answer,
        ev: r.evidencePaths && r.evidencePaths.length > 0 
            ? r.evidencePaths.join(", ") 
            : "No Evidence",
        d: r.date,
        ts: timeStr
    });

    // Apply specific styling if it's a "Header" row for a new department
    if (showDept !== "") {
        row.getCell('dept').font = { bold: true };
        // Optional: Add a top border to visually separate departments
        row.lineStyle = 'thin'; 
    }

    // Color the Status Cell
    const statusCell = row.getCell('status');
    if (r.status === "green") {
        statusCell.font = { color: { argb: 'FF006400' }, bold: true };
    } else if (r.status === "red") {
        statusCell.font = { color: { argb: 'FFFF0000' }, bold: true };
    }

    // Evidence Links logic
    if (r.evidencePaths && r.evidencePaths.length > 0) {
        const evCell = row.getCell('ev');
        const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        
        // Use the formula approach to support multiple links in one cell if needed
        const formulaParts = r.evidencePaths.map((file, idx) => {
            return `HYPERLINK("${baseUrl}/uploads/${file}", "File ${idx + 1}")`;
        });

        if (formulaParts.length > 1) {
            evCell.value = { formula: `=${formulaParts.join('&", "&')}` };
        } else {
            evCell.value = {
                text: "View File",
                hyperlink: `${baseUrl}/uploads/${r.evidencePaths[0]}`
            };
        }
        evCell.font = { color: { argb: 'FF0000FF' }, underline: true };
    }
});
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", 'attachment; filename="Compliance_Report.xlsx"');

        await wb.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("Export Error:", err);
        res.status(500).json({ message: "Export failed", error: err.message });
    }
});

router.post("/", upload.any(), async (req, res) => {
  try {
    const { department, event, answers } = req.body;
    const incomingAnswers = JSON.parse(answers || "[]");

    // Helper to extract all files for a specific question index
    const getFilesForIndex = (index) => {
      return req.files
        .filter(f => f.fieldname === `evidence_${index}`)
        .map(f => f.filename);
    };

    let existingDoc = await Response.findOne({ event: event });

    if (existingDoc) {
      // SMART MERGE: This runs when a user is fixing a REVERTED form
      const updatedAnswers = existingDoc.answers.map((oldAns, index) => {
        const newAns = incomingAnswers[index];
        const newFiles = getFilesForIndex(index);

        return {
          question: oldAns.question,
          // Only update text if the new text isn't empty
          answer: (newAns && newAns.answer !== "") ? newAns.answer : oldAns.answer,
          // If new files uploaded, replace old ones. Otherwise keep old ones.
          evidencePaths: newFiles.length > 0 ? newFiles : (oldAns.evidencePaths || []),
          // Reset status to null so Admin knows it needs re-review
          status: null 
        };
      });

      existingDoc.answers = updatedAnswers;
      existingDoc.submittedAt = new Date();
      await existingDoc.save();
    } else {
      // NEW DOCUMENT: Initial submission
      const processedAnswers = incomingAnswers.map((a, index) => {
        const newFiles = getFilesForIndex(index);
        return {
          question: a.question,
          answer: a.answer,
          evidencePaths: newFiles,
          status: null
        };
      });

      existingDoc = new Response({
        department,
        event,
        answers: processedAnswers,
        submittedAt: new Date()
      });
      await existingDoc.save();
    }

    // --- CRITICAL LOCKING LOGIC ---
    // We update BOTH status and isSubmitted to lock the link
    await Event.findByIdAndUpdate(event, { 
        status: "submitted", 
        isSubmitted: true 
    });

    res.status(200).json({ success: true, dbId: existingDoc._id });
  } catch (err) {
    console.error("Submission Error:", err);
    res.status(500).json({ error: "Failed to process upload. Check if Event ID is valid." });
  }
});
// GET: Export only GAP items (Red marked)
router.get("/export-gap", async (req, res) => {
    try {
        const { department, reverts } = req.query;
        const revertKeys = JSON.parse(reverts || "[]");

        let filter = {};
        if (department && mongoose.Types.ObjectId.isValid(department)) {
            filter.department = department;
        }

        const docs = await Response.find(filter).populate("department", "name").lean();
        
        // Filter rows to only include those in the revertKeys list
        const rows = docs.flatMap(doc => {
            return toFlatRows(doc).filter(row => revertKeys.includes(`${row._id}-${doc.answers.indexOf(doc.answers.find(a => a.question === row.question))}`));
        });

        // Generate Excel as usual using rows...
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet("Gap Analysis Report");
        
        // ... (Same column and row logic as your existing /export route)
        
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", 'attachment; filename="Gap_Analysis_Report.xlsx"');
        await wb.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).send("Export failed");
    }
});

// Add this to your routes/responses.js
router.get("/event/:eventId", async (req, res) => {
  try {
    const response = await Response.findOne({ event: req.params.eventId });
    if (!response) return res.status(404).json({ message: "No previous response" });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/status", async (req, res) => {
  const { formId, index, status } = req.body; 

  // Validation: Ensure we have a valid ID and a number
  if (!mongoose.Types.ObjectId.isValid(formId)) {
      return res.status(400).json({ error: "Invalid Form ID" });
  }

  try {
    const updatedResponse = await Response.findByIdAndUpdate(
      formId,
      { $set: { [`answers.${index}.status`]: status } }, // Index must be a number or string-digit
      { new: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("DB Error:", err); // Check your terminal for this log!
    res.status(500).json({ error: err.message });
  }
});

const setStatus = async (key, color) => {
  const [formId, index] = key.split("-");
  
  try {
    // Update local UI immediately (Optimistic Update)
    setStatusMap(prev => ({ ...prev, [key]: color }));
    
    // Save to Database
    await axios.patch(`${API_BASE}/api/responses/status`, {
      formId,
      index,
      status: color
    });
  } catch (e) {
    alert("Failed to save status to server.");
  }
  setActiveMenu(null);
};

module.exports = router;
 