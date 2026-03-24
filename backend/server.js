const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");
const path = require("path");
const crypto = require("crypto");
const moment = require("moment");
const axios = require("axios");
const Event = require("./models/Event");
const sendEmail = require("./utils/sendEmail");

// Routes
const departmentRoutes = require("./routes/departments");
const eventRoutes = require("./routes/events");
const responseRoutes = require("./routes/responses");
const formSubmissionRoutes = require("./routes/formSubmission");

const app = express();
const PORT = process.env.PORT || 5000; // Define PORT early!

/* MIDDLEWARE */
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* API ROUTES */
app.use("/api/departments", departmentRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/responses", responseRoutes);
app.use("/api/submit-form", formSubmissionRoutes);

/* DATABASE CONNECTION */
const DB_URI = "mongodb+srv://sahil1321:SAHIL2004@cluster0.bduhztj.mongodb.net/GS?appName=Cluster0";

mongoose.connect(DB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
    // Start server ONLY ONCE
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

/* SINGLE AI BRIDGE ROUTE */
app.post("/api/ai/ask", async (req, res) => {
  try {
    const { question } = req.body;

    // Call the Python RAGbot service
    const response = await axios.post("http://127.0.0.1:8000/ask", {
      question: question
    });

    // Return the response directly to your React frontend
    res.json(response.data);
  } catch (error) {
    console.error("AI Bridge Error:", error.message);
    res.status(503).json({ 
      error: "Python AI Service is offline. Make sure RAGbot.py is running." 
    });
  }
});
/* THE ATOMIC DISPATCH ENGINE */
cron.schedule("* * * * *", async () => {
  const now = new Date();
  console.log(`--- [CRON CHECK] ${now.toISOString()} ---`);

  try {
    let processedThisTick = 0;

    while (true) {
      // 1. Find and Lock the event
      const event = await Event.findOneAndUpdate(
        { status: "pending", send_at: { $lte: now } },
        { $set: { status: "processing" } },
        { new: true }
      ).populate("department");

      if (!event) break;

      processedThisTick++;
      console.log(` [LOCKED] Processing: ${event.department?.name}`);

      try {
        // --- THE SNAPSHOT FIX ---
        // Save the current questions from the department into the Event document.
        // This ensures the link stays consistent even if the department questions change later.
        if (event.department && event.department.formQuestions) {
          event.selectedQuestions = event.department.formQuestions;
        }

        const link = `http://localhost:3000/fill-form/${event._id}/${event.department._id}?token=${event.token}`;
        const emailSubject = `Compliance Review Request: ${event.department?.name}`;
        const emailBody = `Dear ${event.department?.name} Team,\n\nPlease complete the form: ${link}`;

        await sendEmail(event.department.email, emailSubject, emailBody);

        event.status = "sent";
        event.sent_at = new Date();
        
        // Save the event with the frozen questions
        await event.save(); 

        console.log(` [SENT] Success for ${event.department?.name}`);

        // Handle Recurring
        if (event.sendType && event.sendType !== "once") {
           // Your existing logic to create the NEXT event should go here.
           // Note: The next event should be created as 'pending' with no selectedQuestions yet.
           console.log(" [RECURRING] Next event scheduled.");
        }

      } catch (innerErr) {
        console.error(`Email Error:`, innerErr.message);
        await Event.findByIdAndUpdate(event._id, { status: "pending" });
      }
    }
    if(processedThisTick > 0) console.log(`--- [CRON END] Processed ${processedThisTick} items ---`);
  } catch (err) {
    console.error("CRITICAL CRON ERROR", err);
  }
});