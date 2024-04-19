const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    gitId: {
      type: String,
      required: true,
    },
    avatarUrl: String,
   
  
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
