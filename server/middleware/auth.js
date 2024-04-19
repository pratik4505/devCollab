const axios = require("axios");
const auth=async ()=>{
    
    const accessToken = req.headers['authorization'].split(' ')[1]; // Extract access token from Authorization header

  // Make a request to GitHub's API using the access token
  axios.get('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  .then(response => {
    // If the request to GitHub's API is successful, return the user's data
    res.json(response.data);
  })
  .catch(error => {
    // If there's an error, return an error response
    console.error('Error:', error.response.data);
    res.status(error.response.status).json({ error: 'Failed to fetch user data' });
  });
}
