const mongoose = require('mongoose');

const userResponseSchema = new mongoose.Schema({
  name: String,
  phoneNumber: String,
  responses: [String],
});

const UserResponse = mongoose.model('UserResponse', userResponseSchema);

module.exports = UserResponse;