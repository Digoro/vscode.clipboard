import * as vscode from 'vscode';
import { commands, ExtensionContext, TreeItem, TreeItemCollapsibleState, window } from 'vscode';

var clipboardList: Clipboard[] = [];
var command: string;
var isInBrowseClipboardPasteMode: boolean;

export async function activate(context: ExtensionContext) {
	const config = vscode.workspace.getConfiguration("clipboard");
	let maximumClips = config.get('maximumClips', 200);

	vscode.workspace.onDidChangeConfiguration(event => {
		let affected = event.affectsConfiguration("clipboard.maximumClips");
		if (affected) {
			const config = vscode.workspace.getConfiguration("clipboard");
			maximumClips = config.get('maximumClips', 200);
		}
	});

	async function addClipboardItemBak() {
		let copied = await vscode.env.clipboard.readText();
		copied = copied.replace(/\n/gi, "↵");
		const item = new Clipboard(copied, TreeItemCollapsibleState.None);

		if (clipboardList.find(c => c.label === copied)) {
			clipboardList = clipboardList.filter(c => c.label !== copied);
		}

		clipboardList.push(item);
		if (maximumClips > 0) {
			clipboardList = clipboardList.reverse().slice(0, maximumClips).reverse();
		}
	}

	function createTreeView() {
		vscode.window.createTreeView('clipboard.history', {
			treeDataProvider: new ClipboardProvider()
		});
	}

	async function addClipboardItem() {
		let copied = await vscode.env.clipboard.readText();
		copied = copied.replace(/\n/gi, "↵");
		addItem(copied);
	}

	async function addItem(str: string) {
		const item = new Clipboard(str, TreeItemCollapsibleState.None);

		if (clipboardList.find(c => c.label === str)) {
			clipboardList = clipboardList.filter(c => c.label !== str);
		}

		clipboardList.push(item);
		if (maximumClips > 0) {
			clipboardList = clipboardList.reverse().slice(0, maximumClips).reverse();
		}
	}

	async function delItem(str: string) {
		const item = new Clipboard(str, TreeItemCollapsibleState.None);
		if (clipboardList.find(c => c.label === str)) {
			clipboardList = clipboardList.filter(c => c.label !== str);
		}
	}

	async function pasteString(label: string) {
		vscode.env.clipboard.writeText(label).then(() => {
			if (!!window.activeTextEditor) {
				vscode.commands.executeCommand("editor.action.clipboardPasteAction");
			}
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

		const items = clipboardList.map(c => {
			return {
				label: c.label,
				description: ''
			};
		}).reverse();

		window.showQuickPick(items).then(item => {
			const label = ((item as vscode.QuickPickItem).label as string).replace(/↵/gi, "\n");
			vscode.env.clipboard.writeText(label).then(() => {
				window.setStatusBarMessage("copied in history!");
				if (!!window.activeTextEditor) {
					vscode.commands.executeCommand("editor.action.clipboardPasteAction");
				}
			});
		});
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

	commands.registerCommand('clipboard.openQuickPick', () => {
		createTreeView();

		const items = clipboardList.map(c => {
			return {
				label: c.label,
				description: ''
			};
		}).reverse();

		isInBrowseClipboardPasteMode = true;
		command = "pastemove";
		window.showQuickPick(items).then(item => {
			isInBrowseClipboardPasteMode = false;
			if (item === undefined) { return; }
			let str = ((item as vscode.QuickPickItem).label as string);
			const label = str.replace(/↵/gi, "\n");
			switch (command) {
				case "pastemove":
					addItem(str);
					pasteString(label);
					break;
				case "pasteonly":
					pasteString(label);
					break;
				case "copy":
					vscode.env.clipboard.writeText(label);
					break;
				case "cut":
					vscode.env.clipboard.writeText(label);
					delItem(str);
					break;
				case "delete":
					delItem(str);
					break;
				default:
					//
			}
		});
	});

	commands.registerCommand('clipboard.quickpick.pasteonly', () => {
		if (!isInBrowseClipboardPasteMode) { return; }
		command = "pasteonly";
		vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
	});

	commands.registerCommand('clipboard.quickpick.copy', () => {
		if (!isInBrowseClipboardPasteMode) { return; }
		command = "copy";
		vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
	});

	commands.registerCommand('clipboard.quickpick.cut', () => {
		if (!isInBrowseClipboardPasteMode) { return; }
		command = "cut";
		vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
	});

	commands.registerCommand('clipboard.quickpick.delete', () => {
		if (!isInBrowseClipboardPasteMode) { return; }
		command = "delete";
		vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
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

class Clipboard extends TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.contextValue = "clipHistoryItem:";
	}
}