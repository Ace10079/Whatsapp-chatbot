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
    twiml.message('How can I help you?\n1. New complaint\n2. Track complaint\n3. How to use me\n\nPlease reply with the number of your choice.');
  } else {
    const session = userSessions[phoneNumber];

    switch (session.step) {
      case 1:
        // Handle main options
        switch (Body) {
          case '1':
            session.step = 2;
            twiml.message('Please choose one:\n1. Individual\n2. Association\n3. Company\n\nReply with the number of your choice.');
            break;
          case '2':
            // Handle track complaint logic here
            twiml.message('Please provide your complaint ID to track.');
            break;
          case '3':
            // Provide instructions or help
            twiml.message('Here is how you can use this service:\n1. To register a new complaint, reply with "1".\n2. To track a complaint, reply with "2".\n3. To get help, reply with "3".');
            break;
          default:
            twiml.message('Invalid option. Please choose:\n1. New complaint\n2. Track complaint\n3. How to use me\n\nReply with the number of your choice.');
            break;
        }
        break;
        
      case 2:
        // Handle complaint type options
        switch (Body) {
          case '1':
            session.step = 3;
            twiml.message('Please select the department:\n1. PWD\n2. Electrical\n3. Health\n\nReply with the number of your choice.');
            break;
          case '2':
          case '3':
            // Handle Association or Company responses
            twiml.message('Thank you for your response. Your complaint is recorded.');
            // Save data to MongoDB if needed
            session.responses.push({ type: Body });
            const userData = new UserResponse({
              phoneNumber: phoneNumber,
              complaintType: Body === '2' ? 'Association' : 'Company',
              responses: session.responses
            });
            userData.save();
            delete userSessions[phoneNumber]; // Clear session
            break;
          default:
            twiml.message('Invalid option. Please choose:\n1. Individual\n2. Association\n3. Company\n\nReply with the number of your choice.');
            break;
        }
        break;

      case 3:
        // Handle department options
        switch (Body) {
          case '1':
            session.responses.push({ department: 'PWD' });
            break;
          case '2':
            session.responses.push({ department: 'Electrical' });
            break;
          case '3':
            session.responses.push({ department: 'Health' });
            break;
          default:
            twiml.message('Invalid department. Please select:\n1. PWD\n2. Electrical\n3. Health\n\nReply with the number of your choice.');
            return;
        }
        // Save data to MongoDB
        const userData = new UserResponse({
          phoneNumber: phoneNumber,
          complaintType: 'Individual',
          department: Body === '1' ? 'PWD' : (Body === '2' ? 'Electrical' : 'Health'),
          responses: session.responses
        });
        userData.save();
        delete userSessions[phoneNumber]; // Clear session
        twiml.message('Your response is recorded. Thank you!');
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
