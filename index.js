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
    twiml.message('How can I help you? Please choose an option:');
    twiml.message().body('New Complaint').action({
      type: 'postback',
      payload: 'new_complaint',
    }).body('Track Complaint').action({
      type: 'postback',
      payload: 'track_complaint',
    }).body('How to use me?').action({
      type: 'postback',
      payload: 'how_to_use',
    });
  } else {
    const session = userSessions[phoneNumber];

    switch (session.step) {
      case 1:
        // Handle main options
        if (Body === 'new_complaint') {
          session.step = 2;
          twiml.message('Please choose one:');
          twiml.message().body('Individual').action({
            type: 'postback',
            payload: 'individual',
          }).body('Association').action({
            type: 'postback',
            payload: 'association',
          }).body('Company').action({
            type: 'postback',
            payload: 'company',
          });
        } else if (Body === 'track_complaint') {
          // Handle track complaint logic here
          twiml.message('Please provide your complaint ID to track.');
        } else if (Body === 'how_to_use') {
          // Provide instructions or help
          twiml.message('Here is how you can use this service:\n\n' +
            '1. To register a new complaint, click "New complaint".\n' +
            '2. To track a complaint, click "Track complaint".\n' +
            '3. To get help, click "How to use me".');
        } else {
          twiml.message('Invalid option. Please choose:');
          twiml.message().body('New Complaint').action({
            type: 'postback',
            payload: 'new_complaint',
          }).body('Track Complaint').action({
            type: 'postback',
            payload: 'track_complaint',
          }).body('How to use me?').action({
            type: 'postback',
            payload: 'how_to_use',
          });
        }
        break;

      case 2:
        // Handle complaint type options
        if (Body === 'individual') {
          session.step = 3;
          session.complaintType = 'Individual'; // Store selected type
          twiml.message('Please select the department:');
          twiml.message().body('PWD').action({
            type: 'postback',
            payload: 'pwd',
          }).body('Electrical').action({
            type: 'postback',
            payload: 'electrical',
          }).body('Health').action({
            type: 'postback',
            payload: 'health',
          });
        } else if (Body === 'association' || Body === 'company') {
          session.step = 4;
          session.complaintType = Body.charAt(0).toUpperCase() + Body.slice(1); // Store selected type
          twiml.message('Thank you for your response. Your complaint is recorded.');
          // Save data to MongoDB
          const userData = new UserResponse({
            phoneNumber: phoneNumber,
            complaintType: session.complaintType,
            responses: session.responses
          });
          userData.save();
          delete userSessions[phoneNumber]; // Clear session
        } else {
          twiml.message('Invalid option. Please choose:');
          twiml.message().body('Individual').action({
            type: 'postback',
            payload: 'individual',
          }).body('Association').action({
            type: 'postback',
            payload: 'association',
          }).body('Company').action({
            type: 'postback',
            payload: 'company',
          });
        }
        break;

      case 3:
        // Handle department options
        if (['pwd', 'electrical', 'health'].includes(Body)) {
          session.step = 4;
          session.department = Body; // Store selected department
          // Save data to MongoDB
          const userData = new UserResponse({
            phoneNumber: phoneNumber,
            complaintType: session.complaintType || 'N/A',
            department: session.department,
            responses: session.responses
          });
          userData.save();
          delete userSessions[phoneNumber]; // Clear session
          twiml.message('Your response is recorded. Thank you!');
        } else {
          twiml.message('Invalid department. Please select:');
          twiml.message().body('PWD').action({
            type: 'postback',
            payload: 'pwd',
          }).body('Electrical').action({
            type: 'postback',
            payload: 'electrical',
          }).body('Health').action({
            type: 'postback',
            payload: 'health',
          });
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
