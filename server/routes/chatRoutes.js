const router = require("express").Router();
const {
  getChats,
  getMessages,
  postMessage,
  createChat,
} = require("../controllers/chatController");
const {authMiddleware}=require('../middleware/authMiddleware')

router.get("/getChats", authMiddleware, getChats); 
router.get("/getMessages", authMiddleware, getMessages); 
router.post("/postMessage", authMiddleware, postMessage); 
// router.post("/createChat", authMiddleware, createChat); 

module.exports = router;
