const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const UserResponse = require("./Models/userResponse"); // Import schema
const { MessagingResponse } = require("twilio").twiml;

require("dotenv").config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSessions = {}; // To track conversation state

app.post("/whatsapp", (req, res) => {
  console.log("Received WhatsApp message");
  const twiml = new MessagingResponse();
  const { Body, From } = req.body; // Message body and sender's number
  console.log(`Message body: ${Body}, Sender's number: ${From}`);
  const phoneNumber = From.replace("whatsapp:", ""); // Clean up sender's phone
  console.log(`Cleaned phone number: ${phoneNumber}`);

  if (!userSessions[phoneNumber]) {
    console.log("Starting new session");
    userSessions[phoneNumber] = { step: 1, responses: [] };
    twiml.message(
      "How can I help you?\n1. New complaint\n2. Track complaint\n3. How to use me"
    );
  } else {
    console.log("Existing session found");
    const session = userSessions[phoneNumber];
    console.log(`Session step: ${session.step}`);

    switch (session.step) {
      case 1:
        console.log("Handling main options");
        if (Body.toLowerCase() === "new complaint") {
          console.log("New complaint selected");
          session.step = 2;
          twiml.message(
            "Please choose one:\n1. Individual\n2. Association\n3. Company"
          );
        } else if (Body.toLowerCase() === "track complaint") {
          console.log("Track complaint selected");
          // Handle track complaint logic here
          twiml.message("Please provide your complaint ID to track.");
        } else if (Body.toLowerCase() === "how to use me") {
          console.log("How to use me selected");
          // Provide instructions or help
          twiml.message(
            'Here is how you can use this service:\n1. To register a new complaint, type "New complaint".\n2. To track a complaint, type "Track complaint".\n3. To get help, type "How to use me".'
          );
        } else {
          console.log("Invalid option");
          twiml.message(
            "Invalid option. Please choose:\n1. New complaint\n2. Track complaint\n3. How to use me"
          );
        }
        break;

      case 2:
        console.log("Handling complaint type options");
        const complaintType = normalizeComplaintType(Body);
        if (complaintType) {
          console.log("Complaint type selected");
          session.step = 3;
          session.responses.push(`Complaint Type: ${complaintType}`);
          twiml.message(
            "Please select the department:\n1. PWD\n2. Electrical\n3. Health"
          );
        } else {
          console.log("Invalid option");
          twiml.message(
            "Invalid option. Please choose:\n1. Individual\n2. Association\n3. Company"
          );
        }
        break;

      case 3:
        console.log("Handling department options");
        const department = normalizeDepartment(Body);
        if (department) {
          console.log("Department selected");
          session.responses.push(`Department: ${department}`);
          const userData = new UserResponse({
            phoneNumber: phoneNumber,
            responses: session.responses
          });
          console.log("Saving data to MongoDB");
          userData.save((err) => {
            if (err) {
              console.log(`Error saving data: ${err}`);
            } else {
              console.log("Data saved successfully");
            }
          });
          delete userSessions[phoneNumber]; // Clear session
          twiml.message("Your response is recorded. Thank you!");
        } else {
          console.log("Invalid department");
          twiml.message(
            "Invalid department. Please select:\n1. PWD\n2. Electrical\n3. Health"
          );
        }
        break;

      default:
        console.log("Invalid session step");
        twiml.message("Sorry, something went wrong. Please start again.");
        delete userSessions[phoneNumber]; // Clear session
        break;
    }
  }

  console.log("Sending response");
  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

// Helper functions
const normalizeComplaintType = (type) => {
  switch (type.toLowerCase()) {
    case 'individual':
      return 'Individual';
    case 'association':
      return 'Association';
    case 'company':
      return 'Company';
    default:
      return null;
  }
};

const normalizeDepartment = (dept) => {
  switch (dept.toLowerCase()) {
    case 'pwd':
      return 'PWD';
    case 'electrical':
      return 'Electrical';
    case 'health':
      return 'Health';
    default:
      return null;
  }
};
