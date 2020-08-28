import * as vscode from 'vscode';
import { commands, ExtensionContext, TreeItem, TreeItemCollapsibleState, window } from 'vscode';

var clipboardList: Clipboard[] = [];
var selectedItem: TreeItem;

export async function activate(context: ExtensionContext) {
	async function addClipboardItem() {
		let copied = await vscode.env.clipboard.readText();
		copied = copied.replace(/\n/gi, "↵");
		const item = new Clipboard(copied, TreeItemCollapsibleState.None);
		item.command = {
			command: "clipboard.selected",
			title: "Selected Item",
			arguments: [item]
		};

		if (clipboardList.find(c => c.label === copied)) {
			clipboardList = clipboardList.filter(c => c.label !== copied);
		}
		clipboardList.push(item);
	}

	function createTreeView() {
		vscode.window.createTreeView('clipboard.history', {
			treeDataProvider: new ClipboardProvider()
		});
		vscode.window.createTreeView('clipboard.selected', {
			treeDataProvider: new CopiedProvider()
		});
	}

	commands.registerCommand('clipboard.copy', () => {
		commands.executeCommand("editor.action.clipboardCopyAction").then(() => {
			addClipboardItem().then(() => {
				window.setStatusBarMessage('copy!');
				createTreeView();
			});
		});
	});

	commands.registerCommand('clipboard.cut', () => {
		commands.executeCommand("editor.action.clipboardCutAction").then(() => {
			addClipboardItem().then(() => {
				window.setStatusBarMessage('cut!');
				createTreeView();
			});
		});
	});

	commands.registerCommand('clipboard.pasteFromClipboard', () => {
		window.setStatusBarMessage('pasteFromClipboard!');
		createTreeView();
	});

	commands.registerCommand("clipboard.selected", (item: TreeItem) => {
		item.label = (item.label as string).replace(/\n/gi, "↵");
		selectedItem = item;
		createTreeView();
	});

	vscode.commands.registerCommand('clipboard.history.copy', (item: TreeItem) => {
		const label = (item.label as string).replace(/↵/gi, "\n");
		vscode.env.clipboard.writeText(label).then(() => {
			window.setStatusBarMessage("copied in history!");
		});
	});

	vscode.commands.registerCommand('clipboard.history.remove', (item: TreeItem) => {
		clipboardList = clipboardList.filter(c => c.label !== item.label);
		createTreeView();
		window.setStatusBarMessage("removed in history!");
	});
}

export function deactivate() { }


export class ClipboardProvider implements vscode.TreeDataProvider<Clipboard> {
	constructor() { }

	getTreeItem(element: Clipboard): TreeItem {
		return element;
	}

	getChildren(element?: Clipboard): Thenable<Clipboard[]> {
		const temp = Object.assign([], clipboardList);
		return Promise.resolve(temp.reverse());
	}
}

export class CopiedProvider implements vscode.TreeDataProvider<TreeItem> {
	constructor() { }

	getTreeItem(element: TreeItem): TreeItem {
		return element;
	}

	getChildren(element?: TreeItem): Thenable<TreeItem[]> {
		return Promise.resolve([selectedItem]);
	}
}

class Clipboard extends TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.contextValue = "clipHistoryItem:";
	}
}