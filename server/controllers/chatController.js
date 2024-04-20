const Chat=require("../models/Chat")
const Message=require("../models/Message");

const getChats=async(req,res)=>{
  const gitId = req.gitId;
  console.log("GIT ID: " + gitId);
  try {
    // Find all chats where a key of the map in the members field is equal to userId
    const chats = await Chat.find({ [`members.${gitId}`]: { $exists: true } });
   
    res.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
const getMessages=async(req,res)=>{
  try {
    // const limit = parseInt(req.query.limit) || 50;
    // const createdAt = req.query.createdAt
    //   ? new Date(req.query.createdAt)
    //   : new Date();
    const chatId = req.query.chatId;
    //console.log(rideId,req.query.createdAt);
    // Find messages based on chatId and createdAt
    const messages = await Message.find({
        chatId: chatId,
      //  createdAt: { $lt: createdAt },
    })
      .sort({ createdAt: -1 }) // Sort in descending order based on createdAt
      // .limit(limit);

     // console.log(messages)
    const revMessages = messages.reverse();

    res.status(200).json(revMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
const postMessage=async(req,res)=>{
  try {
    const { chatId, message } = req.body;
    const senderId=req.gitId;
    // Create a new message document
    const newMessage = new Message({
      senderId,
      chatId,
      message,
    });

    // Save the message to the database
    await newMessage.save();

    res.status(201).json({ message: "Message saved successfully" });
  } catch (error) {
    //console.error("Error posting message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}


module.exports = {
  getChats,
  getMessages,
  postMessage,
 
};
