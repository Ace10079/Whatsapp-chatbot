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
    twiml.message('How can I help you?', {
      'interactive': {
        'type': 'button',
        'body': {
          'text': 'Please choose an option:'
        },
        'action': {
          'buttons': [
            {
              'type': 'reply',
              'reply': {
                'id': 'new_complaint',
                'title': 'New complaint'
              }
            },
            {
              'type': 'reply',
              'reply': {
                'id': 'track_complaint',
                'title': 'Track complaint'
              }
            },
            {
              'type': 'reply',
              'reply': {
                'id': 'how_to_use',
                'title': 'How to use me'
              }
            }
          ]
        }
      }
    });
  } else {
    const session = userSessions[phoneNumber];

    switch (session.step) {
      case 1:
        // Handle main options
        if (Body === 'new_complaint') {
          session.step = 2;
          twiml.message('Please choose one:', {
            'interactive': {
              'type': 'button',
              'body': {
                'text': 'Select complaint type:'
              },
              'action': {
                'buttons': [
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'individual',
                      'title': 'Individual'
                    }
                  },
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'association',
                      'title': 'Association'
                    }
                  },
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'company',
                      'title': 'Company'
                    }
                  }
                ]
              }
            }
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
          twiml.message('Invalid option. Please choose:', {
            'interactive': {
              'type': 'button',
              'body': {
                'text': 'Please choose an option:'
              },
              'action': {
                'buttons': [
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'new_complaint',
                      'title': 'New complaint'
                    }
                  },
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'track_complaint',
                      'title': 'Track complaint'
                    }
                  },
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'how_to_use',
                      'title': 'How to use me'
                    }
                  }
                ]
              }
            }
          });
        }
        break;

      case 2:
        // Handle complaint type options
        if (Body === 'individual') {
          session.step = 3;
          session.complaintType = 'Individual'; // Store selected type
          twiml.message('Please select the department:', {
            'interactive': {
              'type': 'button',
              'body': {
                'text': 'Select department:'
              },
              'action': {
                'buttons': [
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'pwd',
                      'title': 'PWD'
                    }
                  },
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'electrical',
                      'title': 'Electrical'
                    }
                  },
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'health',
                      'title': 'Health'
                    }
                  }
                ]
              }
            }
          });
        } else if (Body === 'association') {
          session.step = 4;
          session.complaintType = 'Association'; // Store selected type
          twiml.message('Thank you for your response. Your complaint is recorded.');
          // Save data to MongoDB
          const userData = new UserResponse({
            phoneNumber: phoneNumber,
            complaintType: session.complaintType,
            responses: session.responses
          });
          userData.save();
          delete userSessions[phoneNumber]; // Clear session
        } else if (Body === 'company') {
          session.step = 4;
          session.complaintType = 'Company'; // Store selected type
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
          twiml.message('Invalid option. Please choose:', {
            'interactive': {
              'type': 'button',
              'body': {
                'text': 'Please choose one:'
              },
              'action': {
                'buttons': [
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'individual',
                      'title': 'Individual'
                    }
                  },
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'association',
                      'title': 'Association'
                    }
                  },
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'company',
                      'title': 'Company'
                    }
                  }
                ]
              }
            }
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
          twiml.message('Invalid department. Please select:', {
            'interactive': {
              'type': 'button',
              'body': {
                'text': 'Select department:'
              },
              'action': {
                'buttons': [
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'pwd',
                      'title': 'PWD'
                    }
                  },
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'electrical',
                      'title': 'Electrical'
                    }
                  },
                  {
                    'type': 'reply',
                    'reply': {
                      'id': 'health',
                      'title': 'Health'
                    }
                  }
                ]
              }
            }
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
