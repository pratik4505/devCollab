const vscode = require("vscode");

class NodeDependenciesProvider {
  constructor() {
    // Initialize tree data
    this.treeData = [
      {
        label: "Login Using GitHub",
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        command: {
          command: "devcollab.start",
          title: "Click Me",
        },
      },
      {
        label: "Copy the selected code",
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        command: {
          command: "devcollab.getData",
          title: "Click Me",
        },
      },
      {
        label: "Open Repo Room",
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        command: {
          command: "devcollab.chat",
          title: "Click Me",
        },
      },
    ];
  }

  // Refresh method to update tree data
  refresh() {
    // Here, you can fetch updated data or modify existing data
    // For demonstration, let's just change the label of the existing item
    this.treeData[0].label = "Refreshed!";
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    return element ? element.children : this.treeData;
  }
}

module.exports = NodeDependenciesProvider;
