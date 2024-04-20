const vscode = require("vscode");
const axios = require("axios");
const SERVER_URL ="https://devcollab-w48p.onrender.com";
async function startAuthenticationTimer(gitId,globalContext,socket) {
    let duration = 0;
    let timerInterval;
  
    timerInterval = setInterval(async () => {
      duration += 3;
  
      if (duration >= 60) {
        clearInterval(timerInterval);
        vscode.window.showErrorMessage("Authentication failed: Timeout");
      } else {
        try {
          // Send request to localhost:4000/auth/getToken
           const response = await axios.get(
            `${SERVER_URL}/auth/getToken`,
            {
              params: { gitId },
            }
          );
  
          if (response.status === 200) {
            // Extract token from the response
            const data = response.data;
           
            //@ts-ignore
            const secrets = globalContext["secrets"]; //SecretStorage-object
            await secrets.store("token", data.token); //Save a secret
            await secrets.store("gitId", data.gitId);
  
            socket.emit("setup", data.gitId);
            console.log("token set");
            clearInterval(timerInterval);
            vscode.window.showInformationMessage("Authentication successful!");
          }
        } catch (error) {
          console.error("Trying to fetch token:", error);
          
          vscode.window.showErrorMessage("Trying to fetch token");
        }
      }
    }, 3000);
  }
  
  async function authenticateWithGitHub(globalContext,socket) {
    const githubAuthUrl = `${SERVER_URL}/auth/github`; // Replace this with your actual GitHub authentication URL
  
    try {
      // Open the GitHub authentication URL in the default web browser
      const gitId = await vscode.window.showInputBox({
        prompt: "Enter your GitHub username",
        placeHolder: "GitHub username",
        validateInput: (value) => (value ? null : "GitHub username is required"),
      });
  
      if (gitId) {
        startAuthenticationTimer(gitId,globalContext,socket);
        await vscode.env.openExternal(vscode.Uri.parse(githubAuthUrl));
      }
    } catch (error) {
      console.error("Failed to open GitHub authentication URL:", error);
      vscode.window.showErrorMessage("Failed to open GitHub authentication URL");
    }
  }

  module.exports={
    authenticateWithGitHub,
    startAuthenticationTimer
  }