let io;
const Chat = require("./models/Chat");
exports.init = (httpServer) => {
  io = require("socket.io")(httpServer);
  return io;
};

exports.getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

exports.runIO = (io) => {
  io.on("connection", (socket) => {
    console.log("client connected");

    socket.on("setup", async (room) => {
      // console.log("setup");
      socket.join(room.toString());

      const onlineInterval = setInterval(() => {
        socket.emit("online", { gitId: room });
        console.log('online',room);
      }, 5000);

      // Ensure you clear the interval when the user disconnects
      socket.on("disconnect", () => {
        clearInterval(onlineInterval);

        console.log("socket disconnected");
      });

      try {
        const chats = await Chat.find({
          [`members.${room}`]: { $exists: true },
        });
        // console.log(chats);
        chats.forEach((chat) => {
          // Add the socket to the room based on the _id of each matching chat
          socket.join(chat._id.toString());
        });
      } catch (error) {
        console.error("Error searching chat collection:", error);
      }
    });

    socket.on("sendMessage", (data) => {
      console.log(data);
      socket.to(data.room).emit("receiveMessage", {
        senderId: data.senderId,
        message: data.message,
        createdAt: data.createdAt,
        repoName: data.repoName,
        chatId: data.room,
        avatarUrl: data.avatarUrl,
      });
    });
  });
};
