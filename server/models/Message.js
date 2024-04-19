
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const textSchema = new Schema(
  {
    chatId: {
      
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

textSchema.index({ chatId: 1 });

const Message = mongoose.model("Message", textSchema);

module.exports = Message;
