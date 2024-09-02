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

app.post("/whatsapp", async (req, res) => {
  console.log("Received WhatsApp message");
  const twiml = new MessagingResponse();
  const { Body, From } = req.body; // Message body and sender's number
  console.log(`Message body: ${Body}, Sender's number: ${From}`);
  const phoneNumber = From.replace("whatsapp:", ""); // Clean up sender's phone
  console.log(`Cleaned phone number: ${phoneNumber}`);

  if (!userSessions[phoneNumber]) {
    console.log("Starting new session");
    userSessions[phoneNumber] = { step: 1, responses: [] };
    twiml.message({
      body: "How can I help you?",
      buttons: [
        { value: "new complaint" },
        { value: "track complaint" },
        { value: "how to use me" },
      ],
    });
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
          twiml.message({
            body: "Please choose one:",
            buttons: [
              { value: "individual" },
              { value: "association" },
              { value: "company" },
            ],
          });
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
          twiml.message({
            body: "Invalid option. Please choose:",
            buttons: [
              { value: "new complaint" },
              { value: "track complaint" },
              { value: "how to use me" },
            ],
          });
        }
        break;

      case 2:
        console.log("Handling complaint type options");
        if (["individual", "association", "company"].includes(Body.toLowerCase())) {
          console.log(`${Body} selected`);
          session.step = 3;
          session.responses.push({ question: "Complaint Type", answer: Body });
          session.complaintType = Body; // Save complaint type
          twiml.message({
            body: "Please select the department:",
            buttons: [
              { value: "pwd" },
              { value: "electrical" },
              { value: "health" },
            ],
          });
        } else {
          console.log("Invalid option");
          twiml.message({
            body: "Invalid option. Please choose:",
            buttons: [
              { value: "individual" },
              { value: "association" },
              { value: "company" },
            ],
          });
        }
        break;

      case 3:
        console.log("Handling department options");
        if (["pwd", "electrical", "health"].includes(Body.toLowerCase())) {
          console.log(`${Body} selected`);
          session.responses.push({ question: "Department", answer: Body });
          session.department = Body; // Save department

          // Save data to MongoDB
          const userData = new UserResponse({
            phoneNumber: phoneNumber,
            complaintType: session.complaintType,
            department: session.department,
            responses: session.responses,
          });
          console.log("Saving data to MongoDB");
          try {
            await userData.save();
            console.log("Data saved successfully");
          } catch (err) {
            console.error(`Error saving data: ${err}`);
          }

          delete userSessions[phoneNumber]; // Clear session
          twiml.message("Your response is recorded. Thank you!");
        } else {
          console.log("Invalid department");
          twiml.message({
            body: "Invalid department. Please select:",
            buttons: [
              { value: "pwd" },
              { value: "electrical" },
              { value: "health" },
            ],
          });
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