
const vscode = require("vscode");
const { authenticateWithGitHub } = require("./authenticate");
const axios = require("axios");


async function activate(context) {
  console.log('Congratulations, your extension "devcollab" is now active!');

  let startCommand = vscode.commands.registerCommand("devcollab.start", () => {
    authenticateWithGitHub(context);
  });

  let chatCommand = vscode.commands.registerCommand(
    "devcollab.chat",
    async () => {
      try {
        //@ts-ignore
        const secrets = context["secrets"];
        const token = await secrets.get("token");
        if (!token) {
          vscode.window.showErrorMessage("Token not found");
          return;
        }
        console.log("token", token);
        const response = await axios.get(
          "http://localhost:4000/chat/getChats",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const chats = response.data;
        //console.log(chats);

        // Display chat messages when a chat is clicked
        let panel = vscode.window.createWebviewPanel(
          "chatsPanel",
          "Chats",
          vscode.ViewColumn.Two,
          {}
        );

        // Handle message fetching when a chat is clicked
        panel.webview.onDidReceiveMessage(async (chat) => {
          console.log(chat);
          try {
            const messagesResponse = await axios.get(
              `http://localhost:4000/chat/getMessages?chatId=${chat.chatId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            const messages = messagesResponse.data;
            console.log(messages);

            // Dispose of the previous webview panel
            if (panel) {
              panel.dispose();
            }

            // Create a new webview panel to display messages
            panel = vscode.window.createWebviewPanel(
              "messagesPanel",
              "Messages",
              vscode.ViewColumn.Two,
              {}
            );

            // Display messages in the new webview panel
            panel.webview.html = getMessagesWebviewContent(messages);
          } catch (error) {
            vscode.window.showErrorMessage(
              "Failed to fetch messages: " + error.message
            );
          }
        });

    
        panel.webview.html = getWebviewContent(chats);
      } catch (error) {
        vscode.window.showErrorMessage(
          "Failed to fetch chats: " + error.message
        );
      }
    }
  );

  // Add the disposable to context subscriptions
  context.subscriptions.push(startCommand);
  context.subscriptions.push(chatCommand);
  

  // Create UI elements (e.g., a button)
  let loginButton = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left
  );
  loginButton.text = "$(sign-in) Login with GitHub";
  loginButton.command = "devcollab.start"; // Bind the command to the button

  // Show the button in the status bar
  loginButton.show();
}

function getWebviewContent(chats) {
  // Construct HTML content to display chats
  let htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Chats</title>
          <style>
              /* Add your CSS styles here */
          </style>
      </head>
      <body>
          <h1>Chats</h1>
          <ul>
  `;

  chats.forEach((chat) => {
      htmlContent += `<li><button href="#" id="${chat._id}" class="chat-link">${chat.repoName}</button></li>`;
  });

  htmlContent += `
          </ul>
          <script>
              // Add click event listener for each chat link
              const chatLinks = document.querySelectorAll('.chat-link');
              chatLinks.forEach(link => {
                  link.addEventListener('click', function(event) {
                      event.preventDefault();
                      const chatId = event.target.id;
                      vscode.postMessage({ command: 'chatClicked', chatId: chatId });
                  });
              });
          </script>
      </body>
      </html>
  `;

  return htmlContent;
}

function getMessagesWebviewContent(messages) {
  // Construct HTML content to display messages
  let htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Messages</title>
          <style>
              /* Add your CSS styles here */
          </style>
      </head>
      <body>
          <h1>Messages</h1>
          <ul>
  `;

  // Add each message to the list
  messages.forEach((message) => {
    htmlContent += `<li>${message.message}</li>`;
  });

  htmlContent += `
          </ul>
      </body>
      </html>
  `;

  return htmlContent;
}

function deactivate() {
  console.log('your extension "devcollab" is now deactivated!');
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
