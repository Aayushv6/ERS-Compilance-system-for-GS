const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", 
  auth: {
    user: "avishwakarma9919@gmail.com",
    pass: "xyha zvpx tqhh hvya" 
  }
});

// Function to send email
async function sendEmail(to, subject, text, html) {
  try {
    await transporter.sendMail({
      from: '"Compliance Team" avishwakarma9919@gmail.com',
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