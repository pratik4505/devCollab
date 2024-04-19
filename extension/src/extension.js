const vscode = require('vscode');
const vsls = require('vsls');
function activate(context) {
    console.log('Congratulations, your extension "devcollab" is now active!');

   
    let disposable = vscode.commands.registerCommand('devcollab.start', () => {
        // Create and show a new webview
        const panel = vscode.window.createWebviewPanel(
            'webview', // Identifies the type of the webview. Used internally
            'Input Webview', // Title of the panel displayed to the user
            vscode.ViewColumn.Two, // Editor column to show the new webview panel in
            {
                enableScripts: true // Enable JavaScript in the webview
            }
        );

        // Set the HTML content for the webview
        panel.webview.html = getWebviewContent();

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(message => {
            if (message.text) {
                const messageElement = document.createElement('div');
                messageElement.textContent = `Received: ${message.text}`;
                document.body.appendChild(messageElement);
            }
        });
    });

    context.subscriptions.push(disposable);
}

function deactivate() {
    console.log('your extension "devcollab" is now deactivated!');
}

async function authenticateWithGitHub() {
    const githubAuthUrl = 'http://localhost:4000/auth/github'; // Replace this with your actual GitHub authentication URL

    try {
        // Open the GitHub authentication URL in the default web browser
        await vscode.env.openExternal(vscode.Uri.parse(githubAuthUrl));
    } catch (error) {
        console.error('Failed to open GitHub authentication URL:', error);
        vscode.window.showErrorMessage('Failed to open GitHub authentication URL');
    }
}
function getWebviewContent() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Chat Webview</title>
            <style>
                #messages { margin-top: 10px; }
                .message { margin-bottom: 5px; }
            </style>
        </head>
        <body>
            <div id="messages"></div>
            <input type="text" id="input" />
            <button id="sendButton">Send</button>

            <script>
                const vscode = acquireVsCodeApi();
                const messagesElement = document.getElementById('messages');

                document.getElementById('sendButton').addEventListener('click', () => {
                    const input = document.getElementById('input').value;
                    if (input) {
                        const messageElement = document.createElement('div');
                        messageElement.textContent = input;
                        messageElement.className = 'message';
                        messagesElement.appendChild(messageElement);

                        vscode.postMessage({ text: input });
                        document.getElementById('input').value = '';
                    }
                });
            </script>
        </body>
        </html>
    `;
}

module.exports = {
    activate,
    deactivate
};
