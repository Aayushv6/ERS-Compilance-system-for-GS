const axios = require("axios");

const sendEmail = async (to, subject, body) => {
  try {
    await axios.post("http://localhost:5001/api/send-email", {
      recipient: to,
      subject,
      body
    });
    console.log(`Email sent to: ${to}`);
  } catch (err) {
    console.error("Failed to send email:", err.message);
  }
};

module.exports = sendEmail;