const axios = require("axios");

const authMiddleware = async (req, res, next) => {
    try {
        const accessToken = req.headers['authorization'].split(' ')[1]; // Extract access token from Authorization header

        // Make a request to GitHub's API using the access token
        const response = await axios.get('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // Set the user data on the request object
        req.gitId = response.data.login; // Assuming "login" is the GitHub username

        next(); // Call the next middleware
    } catch (error) {
        // If there's an error, return an error response
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(error.response ? error.response.status : 500).json({ error: 'Failed to fetch user data' });
    }
};

module.exports = authMiddleware;
