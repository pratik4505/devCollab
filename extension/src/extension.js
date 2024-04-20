const vscode = require("vscode");

const axios = require("axios");

let globalContext;

function activate(context) {
  console.log('Congratulations, your extension "devcollab" is now active!');
  globalContext = context;
  // Register command for starting the authentication process
  let disposable = vscode.commands.registerCommand("devcollab.start", () => {
    console.log("hello");
    authenticateWithGitHub();
  });

  // Add the disposable to context subscriptions
  context.subscriptions.push(disposable);

  // Create UI elements (e.g., a button)
  let loginButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  loginButton.text = "$(sign-in) Login with GitHub";
  loginButton.command = "devcollab.start"; // Bind the command to the button

  // Show the button in the status bar
  loginButton.show();
}

function deactivate() {
  console.log('your extension "devcollab" is now deactivated!');
}

async function startAuthenticationTimer(gitId) {
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
          "http://localhost:4000/auth/getToken",
          {
            params: { gitId },
          }
        );

        if (response.status === 200) {
          // Extract token from the response
          const token = response.data.token;

          //@ts-ignore
          const secrets = globalContext["secrets"]; //SecretStorage-object
          await secrets.store("token", token); //Save a secret

         
          console.log("token set");
          clearInterval(timerInterval);
          vscode.window.showInformationMessage("Authentication successful!");
        }
      } catch (error) {
        console.error("Failed to fetch token:", error);
        clearInterval(timerInterval);
        vscode.window.showErrorMessage("Failed to fetch token");
      }
    }
  }, 3000);
}

async function authenticateWithGitHub() {
  const githubAuthUrl = "http://localhost:4000/auth/github"; // Replace this with your actual GitHub authentication URL

  try {
    // Open the GitHub authentication URL in the default web browser
    const gitId = await vscode.window.showInputBox({
      prompt: "Enter your GitHub username",
      placeHolder: "GitHub username",
      validateInput: (value) => (value ? null : "GitHub username is required"),
    });

    if (gitId) {
      startAuthenticationTimer(gitId);
      await vscode.env.openExternal(vscode.Uri.parse(githubAuthUrl));
    }
  } catch (error) {
    console.error("Failed to open GitHub authentication URL:", error);
    vscode.window.showErrorMessage("Failed to open GitHub authentication URL");
  }
}

// function getWebviewContent() {
//   return `
//         <!DOCTYPE html>
//         <html lang="en">
//         <head>
//             <meta charset="UTF-8">
//             <meta name="viewport" content="width=device-width, initial-scale=1.0">
//             <title>Chat Webview</title>
//             <style>
//                 #messages { margin-top: 10px; }
//                 .message { margin-bottom: 5px; }
//             </style>
//         </head>
//         <body>
//             <div id="messages"></div>
//             <input type="text" id="input" />
//             <button id="sendButton">Send</button>

//             <script>
//                 const vscode = acquireVsCodeApi();
//                 const messagesElement = document.getElementById('messages');

//                 document.getElementById('sendButton').addEventListener('click', () => {
//                     const input = document.getElementById('input').value;
//                     if (input) {
//                         const messageElement = document.createElement('div');
//                         messageElement.textContent = input;
//                         messageElement.className = 'message';
//                         messagesElement.appendChild(messageElement);

//                         vscode.postMessage({ text: input });
//                         document.getElementById('input').value = '';
//                     }
//                 });
//             </script>
//         </body>
//         </html>
//     `;
// }

module.exports = {
  activate,
  deactivate,
};
