require("dotenv").config();
const vscode = require("vscode");
const { authenticateWithGitHub } = require("./authenticate");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const io = require("socket.io-client");
const SERVER_URL = "https://devcollab-w48p.onrender.com";
const NodeDependenciesProvider = require("./Nodepack");
const socket = io(SERVER_URL.replace("http", "ws"), {
  transports: ["websocket"],
  upgrade: false,
  withCredentials: true,
  pingInterval: 1000 * 60,
  pingTimeout: 1000 * 60 * 3,
});

let chatPanels = {};

async function activate(context) {
  console.log('Congratulations, your extension "devcollab" is now active!');
  const nodeDependenciesProvider = new NodeDependenciesProvider();
  vscode.window.registerTreeDataProvider(
    "nodeDependencies",
    nodeDependenciesProvider
  );
  socket.on("connect", () => {
    console.log("Connected to Socket.IO server");
  });
  socket.on("connect_error", (error) => {
    console.error("Socket.IO connection error:", error);
  });
  socket.emit("setup", "pratik4505");

  socket.on("receiveMessage", (data) => {
    const { senderId, message, createdAt, repoName, chatId, avatarUrl } = data;
    console.log("receiveMessage", data);
    // Check if a webview panel exists for this chatId
    // if (chatPanels[chatId]) {
    // If the panel is open, send the message to the webview
    chatPanels[chatId].webview.postMessage(data);
    // } else {
    //   vscode.window.showInformationMessage(
    //     `New Message Received:\nRepo: ${repoName}\nSender: ${senderId}\nMessage: ${message}`
    //   );
    // }
    vscode.window.showInformationMessage(
      `New Message Received:\nRepo: ${repoName}\nSender: ${senderId}\nMessage: ${message}`
    );
  });

  let startCommand = vscode.commands.registerCommand("devcollab.start", () => {
    authenticateWithGitHub(context);
  });
  context.subscriptions.push(
    vscode.commands.registerCommand("devcollab.getData", async () => {
      // Get the active workspace folder
      const workspaceFolder = vscode.workspace.workspaceFolders[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage("No workspace folder found.");
        return;
      }
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active text editor found.");
        return;
      }

      // Get the selected line numbers
      const selectedLineNumbers = editor.selections.map(
        (selection) => selection.start.line + 1
      );
      // Path to the .git directory
      const gitPath = path.join(workspaceFolder.uri.fsPath, ".git");

      // Path to the logs/HEAD file
      // const commitIdPath = path.join(gitPath, "refs", "heads", "main");
      const commitIdPath = path.join(gitPath, "logs", "HEAD");
      const headFilePath = path.join(gitPath, "config");

      try {
        // Read the contents of the HEAD file
        const headFileContent = fs.readFileSync(commitIdPath, "utf-8");

        // Split the content by lines
        const line = headFileContent.trim().split("\n");

        // Get the last line
        const lastLine = line[line.length - 1];

        // Split the last line by whitespace
        const words = lastLine.trim().split(/\s+/);

        // Check if there are at least two words
        // const commitId = fs.readFileSync(commitIdPath, "utf-8");
        const headFile = fs.readFileSync(headFilePath, "utf-8");
        // Show the contents in a new document
        const lines = headFile.trim().split("\n");

        // Initialize variable to store URL
        let url = "";

        // Loop through each line to find the URL
        for (const line of lines) {
          if (line.trim().startsWith("url =")) {
            // Extract the URL from the line and remove ".git" from it
            url = line
              .trim()
              .split("=")[1]
              .trim()
              .replace(/\.git$/, "");
            break; // Exit the loop once URL is found
          }
        }

        if (!url) {
          vscode.window.showWarningMessage("URL not found in HEAD file.");
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage("No active text editor found.");
          return;
        }
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(
          editor.document.uri
        );
        if (!workspaceFolder) {
          vscode.window.showErrorMessage(
            "No workspace folder found for the active file."
          );
          return;
        }

        // Get the relative file path
        const relativeFilePath = path.relative(
          workspaceFolder.uri.fsPath,
          editor.document.uri.fsPath
        );
        const linki = `${url}/blob/${words[1]}/${relativeFilePath}/#L${selectedLineNumbers}`;
        const convertedPermalink = linki
          .replace(/%5C/g, "/")
          .replace(/\\/g, "/");
        vscode.env.clipboard.writeText(convertedPermalink).then(() => {
          // Inform the user that the permalink has been copied
          vscode.window.showInformationMessage(
            "Converted permalink copied to clipboard"
          );
        });

        // vscode.env.openExternal(vscode.Uri.parse(convertedPermalink));
      } catch (error) {
        vscode.window.showErrorMessage("Error reading file: " + error.message);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("devcollab.start", () => {
      authenticateWithGitHub();
    })
  );

  let chatCommand = vscode.commands.registerCommand(
    "devcollab.chat",
    async () => {
      try {
        //@ts-ignore
        const secrets = context["secrets"];
        const token = await secrets.get("token");
        const gitId = await secrets.get("gitId");
        if (!token) {
          vscode.window.showErrorMessage("Token not found");
          return;
        }
        console.log(SERVER_URL);
        console.log("token", token);
        const response = await axios.get(`${SERVER_URL}/chat/getChats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const chats = response.data;
        //console.log(chats);

        // Display chat messages when a chat is clicked
        let panel = vscode.window.createWebviewPanel(
          "chatsPanel",
          "Chats",
          vscode.ViewColumn.Two,
          { enableScripts: true }
        );

        // Handle message fetching when a chat is clicked
        panel.webview.onDidReceiveMessage(async (data) => {
          console.log(data);
          try {
            const messagesResponse = await axios.get(
              `${SERVER_URL}/chat/getMessages?chatId=${data.chatId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            const messages = messagesResponse.data;
            console.log(messages);
            const selectedChat = chats.find((chat) => chat._id === data.chatId);

            // Dispose of the previous webview panel

            // Create a new webview panel to display messages
            let newPanel = vscode.window.createWebviewPanel(
              "messagesPanel",
              "Messages",
              vscode.ViewColumn.Three,
              { enableScripts: true }
            );
            chatPanels[data.chatId] = newPanel;

            newPanel.webview.onDidReceiveMessage(async (data) => {
              // Extract chatId and message from the received data
              const { chatId, message, repoName } = data;

              socket.emit("sendMessage", {
                senderId: gitId,
                message,
                room: chatId,
                createdAt: new Date().toISOString(),
                repoName: repoName,
                avatarUrl: selectedChat.members[gitId],
              });

              try {
                // Assuming you have the token variable defined somewhere

                // Send a POST request to the server
                const response = await axios.post(
                  `${SERVER_URL}/chat/postMessage`,
                  {
                    chatId: chatId,
                    message: message,
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${token}`,
                    },
                  }
                );

                // Handle the response
                console.log("Response from server:", response.data);
              } catch (error) {
                // Handle errors
                console.error("Error:", error.message);
              }
            });

            newPanel.onDidDispose(() => {
              chatPanels[data.chatId] = null;
            });

            // Display messages in the new webview panel
            newPanel.webview.html = getMessagesWebviewContent(
              messages,
              gitId,
              selectedChat
            );
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
    htmlContent += `<li><button id="${chat._id}" class="chat-link">${chat.repoName}</button></li>`;
  });

  htmlContent += `
          </ul>
          <button id="sendButton">Send Message to Extension</button>
          
          <script>
          const vscode = acquireVsCodeApi();
              // Add click event listener for each chat link
              const chatLinks = document.querySelectorAll('.chat-link');
              chatLinks.forEach(link => {
                  link.addEventListener('click', function(event) {
                      event.preventDefault();
                      const chatId = event.target.id;
                     
                     
                   
                          vscode.postMessage({ command: 'chatClicked', chatId: chatId });
                      
                     
                  });
              });

              // Add click event listener for sendButton
              document.getElementById('sendButton').addEventListener('click', () => {
                  vscode.postMessage({ text: 'Hello from Webview!' });
              });
          </script>
      </body>
      </html>
  `;

  return htmlContent;
}
function getMessagesWebviewContent(messages, gitId, chat) {
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
              .message {
                  display: flex;
                  padding: 20px;
                  border-radius: 4px;
                  margin-bottom: 40px;
                  max-width: 50%;
              }

              .incoming {
                  background: #63ceff;
                  color: #fff;
                  margin-right: auto;
              }

              .outgoing {
                  background: #e9eafd;
                  color: #787986;
                  margin-left: auto;
              }

              /* Add style for input and button */
              .message-input {
                  display: flex;
                  margin-top: 20px;
              }

              .message-input input[type="text"] {
                  flex: 1;
                  padding: 10px;
                  border: 1px solid #ccc;
                  border-radius: 4px;
                  margin-right: 10px;
              }

              .message-input button[type="submit"] {
                  padding: 10px 20px;
                  border: none;
                  background-color: #007bff;
                  color: #fff;
                  border-radius: 4px;
                  cursor: pointer;
              }
          </style>
      </head>
      <body>
          <h1>Messages</h1>
          <ul id="messageList" class="message">
  `;

  // Add each message to the list
  //console.log("In messae panel",messages,chat)
  messages.forEach((message) => {
    const messageClass = message.senderId === gitId ? "outgoing" : "incoming";

    // Construct the HTML for the message including sender's name and avatar
    htmlContent += `
          <li class="message ${messageClass}">
              <div class="message-sender">
                   <img src="${
                     chat.members[message.senderId].avatarUrl
                   }" alt="${message.senderId}" class="sender-avatar">
                  <span class="sender-name">${message.senderId}</span>
              </div>
              <div class="message-text">${message.message}</div>
          </li>`;
  });

  htmlContent += `
          </ul>

          <!-- Input box and send button -->
          <div class="message-input">
              <input type="text" id="messageInput" placeholder="Type your message...">
              <button type="submit" id="sendMessageButton">Send</button>
          </div>

          <script>
              // Add event listener for sending message
              const vscode = acquireVsCodeApi();
              const messageList = document.getElementById('messageList');

              document.getElementById('sendMessageButton').addEventListener('click', function() {
                  const messageInput = document.getElementById('messageInput');
                  const message = messageInput.value.trim();
                  if (message) {
                      const listItem = document.createElement('li');
                      listItem.innerHTML = 
                          '<div class="message-sender">' +
                          '<img src="' + "${chat.members[gitId].avatarUrl}" + '" alt="' + "${gitId}" + '" class="sender-avatar">' +
                          '<span class="sender-name">' + "${gitId}" + '</span>' +
                          '</div>' +
                          '<div class="message-text">' + message + '</div>';
                      listItem.classList.add('message', 'outgoing'); // Add both classes to the listItem
                      messageList.appendChild(listItem);
                      
                      vscode.postMessage({ command: 'sendMessage', message: message, chatId: "${chat._id}", gitId: "${gitId}", repoName: "${chat.repoName}" });
                      messageInput.value = '';
                  }
              });

              // Listen for messages from the extension
              window.addEventListener('message', event => {
                const messageData = event.data;
                const listItem = document.createElement('li');
                listItem.innerHTML = 
                    '<div class="message-sender">' +
                    '<img src="' + messageData.avatarUrl + '" alt="' + messageData.senderId + '" class="sender-avatar">' +
                    '<span class="sender-name">' + messageData.senderId + '</span>' +
                    '</div>' +
                    '<div class="message-text">' + messageData.message + '</div>';
                listItem.classList.add('message', 'incoming'); // Assume all received messages are incoming
                messageList.appendChild(listItem);
            });
            
          </script>
      </body>
      </html>
  `;

  return htmlContent;
}

function deactivate() {
  console.log('your extension "devcollab" is now deactivated!');
  socket.disconnect();
}

module.exports = {
  activate,
  deactivate,
};
