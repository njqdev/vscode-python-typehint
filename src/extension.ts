import * as vscode from 'vscode';
import { ParamHintCompletionProvider, ReturnHintCompletionProvider } from './completionProvider';
import { paramHintTrigger, returnHintTrigger } from "./python";
import { TypeHintSettings } from './settings';

// Called when the extension is activated.
export function activate(context: vscode.ExtensionContext) {

    // Not used yet
	function registerCommand(commandId: string, func: (...args: any[]) => void): void {
		context.subscriptions.push(vscode.commands.registerCommand(commandId, func));
    }

    const settings = new TypeHintSettings();

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            'python',
            new ParamHintCompletionProvider(settings),
            paramHintTrigger
        ),
        vscode.languages.registerCompletionItemProvider(
            'python',
            new ReturnHintCompletionProvider(),
            returnHintTrigger
        )
    );
}

// Called when the extension is deactivated.
export function deactivate() {}
