const User = require('../models/User');
const Chat = require('../models/Chat');
const Token=require('../models/Token')
const axios = require("axios");

const loginController = async (req, res) => {
  const { profile, accessToken } = req.user;
  const userName = profile.username;
  const avatarUrl = profile._json.avatar_url;

  // console.log(profile, accessToken, avatarUrl);

  try {
    //console.log("Access Token:", accessToken);

    // Check if the user exists in the database

    let user = await User.findOne({ gitId: userName });

    let token = await Token.findOne({ gitId:userName });

    if (token) {
        // If a token already exists, update it with the new accessToken
        token.token = accessToken;
        await token.save();
    } else {
        // If no token exists, create a new one
        token = new Token({  gitId:userName, token: accessToken });
        await token.save();
    }

    // If user doesn't exist, create a new user
    if (!user) {
      user = await User.create({
        gitId: userName, // Using GitHub username as gitId
        avatarUrl: avatarUrl,
      });
    }

    //console.log("User:", user);

    // Use the accessToken to make authenticated requests to the GitHub API
    const reposResponse = await axios.get(
      `https://api.github.com/users/${userName}/repos`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    //console.log("Repos:", reposResponse.data);
   
    // For each repository, get contributors and add them to the chat schema
    for (const repo of reposResponse.data) {
      const contributorsResponse = await axios.get(
        `https://api.github.com/repos/${userName}/${repo.name}/contributors`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      

      const contributors = contributorsResponse.data.map(contributor => ({
        gitId: contributor.login.toString(),
        avatarUrl: contributor.avatar_url,
      }));
     
      await Chat.create({
        members: contributors.reduce((acc, contributor) => {
          acc[contributor.gitId] = {
            avatarUrl: contributor.avatarUrl,
          };
          return acc;
        }, {}),
        repoName: repo.name,
      });
    }
    
    // Redirect or respond with success message
    res.send("Authentication successful. You can now use the access token.");
  } catch (error) {
    console.error("Failed to exchange code for access token:", error);
    res.status(500).send("Failed to exchange code for access token.");
  }
};
const getToken = async (req, res) => {
    const gitId = req.query.gitId; // Assuming gitId is provided as a query parameter
  console.log("Getting access token",gitId);
    try {
        // Check if a document with the provided gitId exists in the database
        const token = await Token.findOne({ gitId });

        if (token) {
            // If a document is found, send it in the response
            res.status(200).json(token);
        } else {
            // If no matching document is found, send an appropriate response
            res.status(404).json({ error: "Token not found" });
        }
    } catch (error) {
        // Handle any errors that occur during the database operation
        console.error("Error fetching token:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
  loginController,
  getToken
};
