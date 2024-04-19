const express = require("express");
const passport = require("passport");
const axios = require("axios");

const router = express.Router();

router.get("/github", passport.authenticate("github", { session: false }));

router.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;
  console.log("Code:", code);

  // Optional: Validate state parameter for CSRF protection

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: "http://localhost:4000/",
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;
    console.log("Access Token:", accessToken);

    // You can now use the accessToken to make requests to GitHub APIs on behalf of the user

    // Redirect or respond with success message
    res.send("Authentication successful. You can now use the access token.");
  } catch (error) {
    console.error("Failed to exchange code for access token:", error);
    res.status(500).send("Failed to exchange code for access token.");
  }
});

module.exports = router;
