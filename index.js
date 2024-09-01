const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const UserResponse = require('./Models/userResponse'); // Import schema
const { MessagingResponse } = require('twilio').twiml;

require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSessions = {}; // To track conversation state

app.post('/whatsapp', (req, res) => {
  const twiml = new MessagingResponse();
  const { Body, From } = req.body; // Message body and sender's number
  const phoneNumber = From.replace('whatsapp:', ''); // Clean up sender's phone

  if (!userSessions[phoneNumber]) {
    // Start a new session
    userSessions[phoneNumber] = { step: 1, responses: [] };
    twiml.message('How can I help you?\n1. New complaint\n2. Track complaint\n3. How to use me');
  } else {
    const session = userSessions[phoneNumber];

    switch (session.step) {
      case 1:
        // Handle main options
        if (Body.toLowerCase() === 'new complaint') {
          session.step = 2;
          twiml.message('Please choose one:\n1. Individual\n2. Association\n3. Company');
        } else if (Body.toLowerCase() === 'track complaint') {
          // Handle track complaint logic here
          twiml.message('Please provide your complaint ID to track.');
        } else if (Body.toLowerCase() === 'how to use me') {
          // Provide instructions or help
          twiml.message('Here is how you can use this service:\n1. To register a new complaint, type "New complaint".\n2. To track a complaint, type "Track complaint".\n3. To get help, type "How to use me".');
        } else {
          twiml.message('Invalid option. Please choose:\n1. New complaint\n2. Track complaint\n3. How to use me');
        }
        break;

      case 2:
        // Handle complaint type options
        if (Body.toLowerCase() === 'individual') {
          session.step = 3;
          session.responses.push({ complaintType: 'Individual' });
          twiml.message('Please select the department:\n1. PWD\n2. Electrical\n3. Health');
        } else if (Body.toLowerCase() === 'association' || Body.toLowerCase() === 'company') {
          session.responses.push({ complaintType: Body });
          // Save data to MongoDB
          const userData = new UserResponse({
            phoneNumber: phoneNumber,
            complaintType: Body,
            responses: session.responses
          });
          userData.save();
          session.step = 1; // Reset to main options
          delete userSessions[phoneNumber]; // Clear session
          twiml.message('Thank you for your response. Your complaint is recorded.');
        } else {
          twiml.message('Invalid option. Please choose:\n1. Individual\n2. Association\n3. Company');
        }
        break;

      case 3:
        // Handle department options
        if (['pwd', 'electrical', 'health'].includes(Body.toLowerCase())) {
          session.responses.push({ department: Body });
          // Save data to MongoDB
          const userData = new UserResponse({
            phoneNumber: phoneNumber,
            department: Body,
            responses: session.responses
          });
          userData.save();
          session.step = 1; // Reset to main options
          delete userSessions[phoneNumber]; // Clear session
          twiml.message('Your response is recorded. Thank you!');
        } else {
          twiml.message('Invalid department. Please select:\n1. PWD\n2. Electrical\n3. Health');
        }
        break;

      default:
        twiml.message('Sorry, something went wrong. Please start again.');
        delete userSessions[phoneNumber]; // Clear session
        break;
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
