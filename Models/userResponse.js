const mongoose = require('mongoose');

const userResponseSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
  },
  complaintType: {
    type: String,
    enum: ['Individual', 'Association', 'Company'],
    required: false, // Optional until selected
  },
  department: {
    type: String,
    enum: ['PWD', 'Electrical', 'Health'],
    required: false, // Optional until selected
  },
  responses: {
    type: [{ question: String, answer: String }], // Array to store question-answer pairs
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const UserResponse = mongoose.model('UserResponse', userResponseSchema);

module.exports = UserResponse;
