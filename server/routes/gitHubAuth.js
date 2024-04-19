const express = require("express");
const passport = require("passport");


const router = express.Router();
const {loginController}=require('../controllers/gitHubController')
router.get("/github", passport.authenticate("github", { session: false }));

router.get("/github/callback", passport.authenticate("github", { session: false }),loginController);

module.exports = router;
