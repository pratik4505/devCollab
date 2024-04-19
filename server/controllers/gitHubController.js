const User = require('../models/User');
const Chat = require('../models/Chat');
const axios = require("axios");

const loginController = async (req, res) => {
  const { profile, accessToken } = req.user;
  const userName = profile.username;
  const avatarUrl = profile._json.avatar_url;

  console.log(profile, accessToken, avatarUrl);

  try {
    //console.log("Access Token:", accessToken);

    // Check if the user exists in the database
    let user = await User.findOne({ gitId: userName });

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
    let x;
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
      x=contributors;
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
    console.log(x);
    // Redirect or respond with success message
    res.send("Authentication successful. You can now use the access token.");
  } catch (error) {
    console.error("Failed to exchange code for access token:", error);
    res.status(500).send("Failed to exchange code for access token.");
  }
};

module.exports = {
  loginController,
};
