import * as vscode from 'vscode';
import { HintCompletionProvider } from './completionProvider';
import { typeHintCharacter } from "./syntax";

// Called when the extension is activated.
export function activate(context: vscode.ExtensionContext) {

    // Not used yet
	function registerCommand(commandId: string, func: (...args: any[]) => void): void {
		context.subscriptions.push(vscode.commands.registerCommand(commandId, func));
    }
    
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider('python', new HintCompletionProvider(), typeHintCharacter)
    );
}

// Called when the extension is deactivated.
export function deactivate() {}
