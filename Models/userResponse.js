const mongoose = require('mongoose');

const userResponseSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true
  },
  complaintType: {
    type: String,
    enum: ['Individual', 'Association', 'Company'],
    required: false
  },
  department: {
    type: String,
    enum: ['PWD', 'Electrical', 'Health'],
    required: false
  },
  responses: {
    type: [String], // Array to store any additional responses
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const UserResponse = mongoose.model('UserResponse', userResponseSchema);

module.exports = UserResponse;
