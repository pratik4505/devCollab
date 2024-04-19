const express = require("express");
const passport = require("passport");

const router = express.Router();



router.get("/github", passport.authenticate("github", { session: false }));

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false }),
  (req, res) => {
    console.log(req.user);
    
  }
);


module.exports = router;