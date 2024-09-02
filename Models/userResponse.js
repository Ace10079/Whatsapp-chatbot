const mongoose = require('mongoose');

const userResponseSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true
  },
  complaintType: {
    type: String,
    required: false
  },
  department: {
    type: String,
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
