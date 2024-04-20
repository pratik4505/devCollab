const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tokenSchema = new Schema({
  gitId: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // Set expireAfterSeconds to 300 (5 minutes)
    expires: 300,
  },
});

const Token = mongoose.model("Token", tokenSchema);

module.exports = Token;
