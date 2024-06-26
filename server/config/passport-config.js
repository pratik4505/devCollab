const { Strategy: GitHubStrategy } = require("passport-github");
const passport = require("passport");

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL}/auth/github/callback`,
    },
    async (accessToken, refreshToken,profile, cb) => {
      cb(null, {accessToken, refreshToken,profile});
    }
  )
);


module.exports = passport;
