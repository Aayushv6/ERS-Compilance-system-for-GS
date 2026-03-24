const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: "your mail id",
    pass: " " #app password 
  }
});

// Function to send email
async function sendEmail(to, subject, text, html) {
  try {
    await transporter.sendMail({
      from: '"Compliance Team" your mail id',
      to,
      subject,
      text,
      html
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error("Error sending email", err);
  }
}

module.exports = sendEmail;
