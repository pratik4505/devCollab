const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  
  members: {
    type: Map,
    of: {
      
      avatarUrl: String,
    },
  },
  repoName: {
    type: String,
    required: true,
  },
 
},
{
  timestamps: true,
});

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
