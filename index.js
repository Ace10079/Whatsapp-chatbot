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
    userSessions[phoneNumber] = { step: 1, responses: [] };
    twiml.message('Hi! What\'s your name?');
  } else {
    const session = userSessions[phoneNumber];
    if (session.step === 1) {
      session.name = Body;
      session.step++;
      twiml.message('Thanks! Now, please answer the first question:');
    } else {
      session.responses.push(Body);
      if (session.step < 3) { // Customize based on number of questions
        session.step++;
        twiml.message('Next question:');
      } else {
        // Save data to MongoDB
        const userData = new UserResponse({
          name: session.name,
          phoneNumber: phoneNumber,
          responses: session.responses
        });
        userData.save();

        delete userSessions[phoneNumber]; // Clear session
        twiml.message('Thanks for your responses!');
      }
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});