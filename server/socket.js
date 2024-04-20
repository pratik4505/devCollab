let io;
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

      //console.log('Rooms joined by the socket:', socket.rooms);
    });
  });
};
