const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const moment = require("moment");
const Event = require("../models/Event");

/**
 * @route   POST /api/events
 * @desc    Initialize a batch dispatch for multiple departments.
 * Each department gets its own independent tracking document.
 */


// Add this to your routes file or server.js

router.post("/", async (req, res) => {
  try {
    const { departments, schedule, sendType, selectedQuestions } = req.body;

    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return res.status(400).json({ message: "No departments selected for dispatch." });
    }

    // Ensure we have a valid starting date
    const initialSchedule = schedule ? new Date(schedule) : new Date();

    // Create a unique event document for every selected department
    const eventPromises = departments.map((deptId) => {
      // Generate a unique token for the form link
      const uniqueToken = crypto.randomBytes(16).toString("hex");

      const event = new Event({
        department: deptId,
        send_at: initialSchedule,
        sendType: sendType || "once",
        status: "pending",
        selectedQuestions: selectedQuestions || [], 
        token: uniqueToken,
        // Set expiry for 7 days after the scheduled send time
        expiresAt: moment(initialSchedule).add(7, "days").toDate(),
      });

      return event.save();
    });

    await Promise.all(eventPromises);

    res.status(201).json({ 
      message: `Successfully initialized dispatches for ${departments.length} departments.`,
      count: departments.length 
    });
  } catch (err) {
    console.error("Batch Scheduling Error:", err);
    res.status(500).json({ 
      message: "Internal Server Error during scheduling", 
      error: err.message 
    });
  }
});

/**
 * @route   GET /api/events/history
 * @desc    Fetch all logs, including upcoming (pending) and completed (sent) dispatches.
 */
router.get("/history", async (req, res) => {
  try {
    // Populate the department details (name/email) for the frontend table
    const events = await Event.find()
      .populate("department", "name email") 
      .sort({ send_at: -1 }); // Newest first

    res.json(events);
  } catch (err) {
    console.error("History Fetch Error:", err);
    res.status(500).json({ message: "Failed to retrieve communication logs." });
  }
});

/**
 * @route   DELETE /api/events/:id
 * @desc    Revokes a pending dispatch. 
 * Since the recurrence is a "chain," deleting the pending seed stops the cycle.
 */
router.delete("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: "Dispatch record not found." });
    }

    // Prevent deleting events that have already been sent (to keep history intact)
    if (event.status === "sent") {
      return res.status(400).json({ 
        message: "Archived dispatches cannot be deleted. You can only revoke pending ones." 
      });
    }

    await Event.findByIdAndDelete(req.params.id);
    
    res.json({ message: "Dispatch successfully revoked. Recurrence cycle stopped." });
  } catch (err) {
    console.error("Revocation Error:", err);
    res.status(500).json({ message: "Error deleting the scheduled dispatch." });
  }
});

/**
 * @route   GET /api/events/verify/:id
 * @desc    Public route used by the Form page to check if a link is valid/expired.
 */

router.get("/verify/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    const { token } = req.query;

    if (!event) return res.status(404).json({ message: "Link not found." });

    // 1. Security Check
    if (event.token && event.token !== token) {
      return res.status(403).json({ message: "Security token mismatch." });
    }

    // 2. BLOCK ACCESS IF SUBMITTED
    // We only allow access if status is 'sent' (initial) or 'reverted' (needs fix).
    // If status is 'submitted', we lock the form.
    if (event.status === "submitted") {
      return res.status(403).json({ 
        message: "This form has already been submitted and is currently under review." 
      });
    }

    // 3. Expiration Check
    const isExpired = event.expiresAt ? new Date() > event.expiresAt : false;
    if (isExpired) {
      return res.status(403).json({ message: "This link has expired." });
    }

    // 4. If all checks pass, send the snapshot questions
    res.json({ 
      status: event.status,
      selectedQuestions: event.selectedQuestions || [] 
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;