const express = require("express");
const passport = require("passport");


const router = express.Router();
const {loginController,getToken}=require('../controllers/gitHubController')
router.get("/github", passport.authenticate("github", { session: false ,scope:['user', 'repo']}));

router.get("/github/callback", passport.authenticate("github", { session: false ,scope:['user', 'repo']}),loginController);

router.get('/getToken',getToken);

module.exports = router;
