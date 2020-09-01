import * as vscode from 'vscode';
import { commands, ExtensionContext, TreeItem, TreeItemCollapsibleState, window } from 'vscode';

var clipboardList: Clipboard[] = [];

export async function activate(context: ExtensionContext) {
	const config = vscode.workspace.getConfiguration("clipboard");
	let maximumClips = config.get('maximumClips', 200);

	vscode.workspace.onDidChangeConfiguration(event => {
		let affected = event.affectsConfiguration("clipboard.maximumClips");
		if (affected) {
			const config = vscode.workspace.getConfiguration("clipboard");
			maximumClips = config.get('maximumClips', 200);
		}
	})

	async function addClipboardItem() {
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
					const editor = window.activeTextEditor;
					editor.edit((textInserter => textInserter.delete(editor.selection))).then(() => {
						editor.edit((textInserter => textInserter.insert(editor.selection.start, label)));
					});
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