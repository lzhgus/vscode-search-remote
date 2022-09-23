"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSelectedText = exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import open = require("open");
var orgName = "";
var selectedText = "";
var selectedProvider = "";
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context: any) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "search-remote" is now active!');
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand(
		"search-remote.search",
		() => {
			// The code you place here will be executed every time your command is executed
			// Display a message box to the user
			selectedText = getSelectedText();
			let config = vscode.workspace.getConfiguration("search-remote");
			let useDefaultOnly = config.get("useDefaultProviderOnly");
			let defaultProvider = config.get<string>("defaultProvider");
			if (useDefaultOnly) {
				if (isNullOrEmpty(defaultProvider)) {
					showConfigWarning("Invalid default provider.");
					return;
				}
				selectedProvider = defaultProvider?.toLowerCase()!;
				searchHelper(defaultProvider);
			} else {
				let providers = ["Azure", "Bing", "Google", "Github", "StackOverflow"];
				let providerInput = vscode.window.showQuickPick(providers);
				providerInput.then(searchFrom);
			}
		}
	);
	context.subscriptions.push(disposable);
}
exports.activate = activate;

function searchHelper(provider: string | undefined) {
	if (!provider) {
		return;
	}

	let orgNameInput = vscode.window.showInputBox({
		placeHolder: "Please input the org name",
		prompt: "Search",
		value: "",
	});
	let config = vscode.workspace.getConfiguration("search-remote");
	let defaultOrgName = config.get<string>("defaultOrgName");
	if (provider.toLowerCase() === "azure") {
		selectedProvider = provider.toLowerCase();
		if (
			config.get("noInputBoxIfTextSelected") &&
			!isNullOrEmpty(defaultOrgName)
		) {
			orgName = defaultOrgName!;
			searchFor(selectedText);
		} else {
			orgNameInput.then(searchInput);
		}
	} else {
		searchFor(selectedText);
	}
}

function searchFrom(provider: string | undefined) {
	if (!provider) {
		return;
	}
	selectedProvider = provider.toLowerCase();
	searchHelper(selectedProvider);
}

function searchInput(value: string | undefined) {
	if (!value) {
		return;
	}
	orgName = value;
	let options = vscode.window.showInputBox({
		placeHolder: "Search Query, Filters(e.g. Activity ext:cs) ",
		prompt: "Search",
		value: selectedText,
	});
	options.then(searchFor);
}
function searchFor(query: string | undefined) {
	if (!query) {
		return;
	}
	open(getSearchUrl(query));
}
function getSearchUrl(query: string | undefined): string {
	let config = vscode.workspace.getConfiguration("search-remote");
	let searchProviders = config.get("ProviderMapping") as {
		[id: string]: string;
	};
	let searchUrl = searchProviders[selectedProvider];
	if (!searchUrl) {
		showConfigWarning("Invalid provider.");
	}
	if (selectedProvider === "azure") {
		searchUrl = searchUrl.replace("{orgName}", orgName);
		query = query?.replace(" ", "%20").replace(":", "%3A");
	}
	// Insert query and strip out invalid characters.
	searchUrl = searchUrl.replace("{query}", query!).replace(/[\r\n]/g, "");
	return searchUrl !== null && searchUrl !== void 0 ? searchUrl : "";
}
// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;
function getSelectedText() {
	let editor = vscode.window.activeTextEditor;
	let text = "";
	if (editor) {
		let selection = editor.selection;
		text = editor.document.getText(selection);
	}
	return text;
}
exports.getSelectedText = getSelectedText;

function showConfigWarning(warning: string) {
	interface CmdItem extends vscode.MessageItem {
		cmd: string;
	}
	let openGlobalSettings: CmdItem = {
		title: "Open global settings",
		cmd: "workbench.action.openGlobalSettings",
	};
	let openWorkspaceSettings: CmdItem = {
		title: "Open workspace settings",
		cmd: "workbench.action.openWorkspaceSettings",
	};
	// Only show "Open workspace settings" if a folder is open
	(vscode.workspace.rootPath == undefined
		? vscode.window.showWarningMessage(warning, openGlobalSettings)
		: vscode.window.showWarningMessage(
				warning,
				openGlobalSettings,
				openWorkspaceSettings
		  )
	).then((c) => {
		if (c) vscode.commands.executeCommand(c.cmd);
	});
}

function isNullOrEmpty(s: string | undefined): boolean {
	return s === undefined || s === null || s === "" || s?.trim() === "";
}
