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

  socket.on("receiveMessage", (data) => {
    const { senderId, message, createdAt, repoName, chatId, avatarUrl } = data;
    console.log("receiveMessage", data);

    if (chatPanels[chatId]) chatPanels[chatId].webview.postMessage({...data ,command:'message'});

    if (!chatPanels[chatId])
      vscode.window.showInformationMessage(
        `New Message Received:\nRepo: ${repoName}\nSender: ${senderId}\nMessage: ${message}`
      );
  });

  // Socket event handler for 'online'
  socket.on("online", (data) => {
    console.log(data);
    Object.entries(data).forEach(([key, value]) => {
      value.webview.postMessage({
        command:'online',
        gitId: data.gitId,
      });
    });
  });

  let startCommand = vscode.commands.registerCommand(
    "devcollab.start",
    async () => {
      const secrets = context["secrets"];
      const token = await secrets.get("token");
      const gitId = await secrets.get("gitId");

      if (token) {
        socket.emit("setup", gitId);
      } else {
        authenticateWithGitHub(context, socket);
      }
    }
  );

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
      let startLineNumber;
      let endLineNumber;
      // Get the selected line numbers
      const selectedLinesInfo = editor.selections.map((selection) => {
        startLineNumber = selection.start.line + 1; // Convert from 0-based index to 1-based line number
        endLineNumber = selection.end.line + 1; // Convert from 0-based index to 1-based line number
      });
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
        const linki = `${url}/blob/${words[1]}/${relativeFilePath}/#L${startLineNumber}-L${endLineNumber}`;
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
              selectedChat,
              socket
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
  // let loginButton = vscode.window.createStatusBarItem(
  //   vscode.StatusBarAlignment.Left
  // );
  // loginButton.text = "$(sign-in) Login with GitHub";
  // loginButton.command = "devcollab.start"; // Bind the command to the button

  // // Show the button in the status bar
  // loginButton.show();
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
          body {
              font-family: Arial, sans-serif;
              // background-color: #f0f0f0;
              margin: 0;
              padding: 0;
          }
          
          h1 {
              color: white;
              text-align: center;
          }
          
          ul {
              list-style-type: none;
              padding: 0;
          }
          
          li {
              margin-bottom: 10px;
          }
          
          .chat-link {
              display: block;
              width: 100%;
              padding: 10px;
              background-color: #fff;
              border: 1px solid #ccc;
              border-radius: 5px;
              text-align: center;
              text-decoration: none;
              color: #333;
              cursor: pointer;
              transition: background-color 0.3s ease;
          }
          
          .chat-link:hover {
              background-color: #f0f0f0;
          }
          
          </style>
      </head>
      <body>
          <h1>Repo Room</h1>
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
function getMessagesWebviewContent(messages, gitId, chat, socket) {
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
              body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
              }
              h1 {
                  color: #333;
                  text-align: center;
              }
              .message {
                  list-style-type: none;
                  padding: 0;
              }
              .message li {
                  margin-bottom: 20px;
                  padding: 10px;
              }
              .message-sender {
                  display: flex;
                  align-items: center;
                  margin-bottom: 5px;
              }
              .sender-avatar {
                  width: 30px;
                  height: 30px;
                  border-radius: 50%;
                  margin-right: 10px;
              }
              .sender-name {
                  font-weight: bold;
                  margin-right: 10px;
              }
              .message-text {
                  word-wrap: break-word;
              }
              .message-input {
                  display: flex;
                  margin-top: 20px;
              }
              #messageInput {
                  flex: 1;
                  padding: 10px;
                  border: 1px solid #ccc;
                  border-radius: 5px;
                  margin-right: 10px;
              }
              #sendMessageButton {
                  padding: 10px 20px;
                  background-color: #007bff;
                  border: none;
                  border-radius: 5px;
                  color: #fff;
                  cursor: pointer;
                  transition: background-color 0.3s ease;
              }
              #sendMessageButton:hover {
                  background-color: #0056b3;
              }
          </style>
      </head>
      <body>
          <h1>Messages</h1>
          
          <!-- Online members dropdown -->
          <select id="onlineMembers">
              <option value="" disabled selected>Select a member</option>
              ${Object.keys(chat.members)
                .map(
                  (key) => `
                  <option value="${key}" data-online="false">${key} (Offline)</option>
              `
                )
                .join("")}
          </select>
          
          <ul id="messageList" class="message">
  `;

  // Add each message to the list
  messages.forEach((message) => {
    const messageClass = message.senderId === gitId ? "outgoing" : "incoming";

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
          <div class="message-input">
              <input type="text" id="messageInput" placeholder="Type your message...">
              <button type="submit" id="sendMessageButton">Send</button>
          </div>

          <script>
              const vscode = acquireVsCodeApi();
              const messageList = document.getElementById('messageList');
              const onlineMembers = document.getElementById('onlineMembers');
              
              // Helper function to update the dropdown
              function updateOnlineStatus(gitId, online) {
                  const options = onlineMembers.children;
                  for (let i = 0; i < options.length; i++) {
                      if (options[i].value === gitId) {
                          options[i].setAttribute('data-online', online);
                          options[i].innerHTML = gitId + (online ? ' (Online)' : ' (Offline)');
                      }
                  }
              }
              
            
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
                      listItem.classList.add('message', 'outgoing');
                      messageList.appendChild(listItem);
                      
                      vscode.postMessage({ command: 'sendMessage', message: message, chatId: "${chat._id}", gitId: "${gitId}", repoName: "${chat.repoName}" });
                      messageInput.value = '';
                  }
              });

              window.addEventListener('message', event => {
                const messageData = event.data;
                if(messageData.command === 'online') {
                  updateOnlineStatus(messageData.gitId,true);
                }else{
                  const listItem = document.createElement('li');
                listItem.innerHTML = 
                    '<div class="message-sender">' +
                    '<img src="' + messageData.avatarUrl + '" alt="' + messageData.senderId + '" class="sender-avatar">' +
                    '<span class="sender-name">' + messageData.senderId + '</span>' +
                    '</div>' +
                    '<div class="message-text">' + messageData.message + '</div>';
                listItem.classList.add('message', 'incoming');
                messageList.appendChild(listItem);
                }
                
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
