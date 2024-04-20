const router = require("express").Router();
const {
  getChats,
  getMessages,
  postMessage,
  createChat,
} = require("../controllers/chatController");
const {authMiddleware}=require('../middleware/authMiddleware')

router.get("/getChats", authMiddleware, getChats); // Middleware applied to this route
router.get("/getMessages", authMiddleware, getMessages); // Middleware applied to this route
// router.post("/postMessage", authMiddleware, postMessage); // Middleware applied to this route
// router.post("/createChat", authMiddleware, createChat); // Middleware applied to this route

module.exports = router;
