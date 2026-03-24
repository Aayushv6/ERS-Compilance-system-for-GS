from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.message import EmailMessage

def email_alert(subject, body, to):
    msg = EmailMessage()
    msg.set_content(body)
    msg["Subject"] = subject
    msg["To"] = to

    user = "avishwakarma9919@gmail.com"
    msg["From"] = user
    password = "xfkr hfjk fadv lcht"  # app password

    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(user, password)
    server.send_message(msg)
    server.quit()

app = Flask(__name__)
CORS(app)

@app.route('/api/send-email', methods=['POST'])
def send_email():
    data = request.json
    try:
        subject = data.get("subject", "Shipment Notification")
        body = data.get("body", "")
        recipient = data.get("recipient")

        if not recipient:
            return jsonify({"error": "Missing recipient email"}), 400

        email_alert(subject, body, recipient)
        return jsonify({"message": "Email sent successfully"}), 200
    except Exception as e:
        print("Email error:", e)
        return jsonify({"error": "Failed to send email"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)