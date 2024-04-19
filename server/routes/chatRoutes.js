const router = require("express").Router();
const {
  getChats,
  getMessages,
  postMessage,
  createChat,
} = require("../controllers/chatController");

// const verifyJWT = require("../middleware/verifyJWT");

// router.get("/getChats", verifyJWT, getChats);
// router.get("/getMessages", verifyJWT, getMessages);
// router.post("/postMessage", verifyJWT, postMessage);
// router.post("/createChat", verifyJWT, createChat);

module.exports = router;
