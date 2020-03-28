import {
    CancellationToken,
    CompletionContext,
    CompletionList,
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    Position,
    TextLine,
    TextDocument
} from "vscode";
import { TypeResolver } from "./typeResolver";
import { paramHintTrigger, returnHintTrigger, Type } from "./syntax";

/**
 * Provides one or more parameter type hint {@link CompletionItem}.
 */
export class ParamHintCompletionProvider implements CompletionItemProvider {

    public provideCompletionItems(
        doc: TextDocument, 
        pos: Position,
        token: CancellationToken,
        context: CompletionContext
    ): Thenable<CompletionList> | null {
        if (context.triggerCharacter !== paramHintTrigger) {
            return null;
        }
        const items: CompletionItem[] = [];
        const line = doc.lineAt(pos);
        const param = this.findParam(line, pos);

        if (param && param.length > 0) {         
            let hint = new TypeResolver().EstimateType(doc, param);

            if (hint) {
                items.push(new CompletionItem(" " + hint, CompletionItemKind.TypeParameter));
            } else {
                pushDefaultCompletionItems(items);
            }
        }
        return Promise.resolve(new CompletionList(items, false));
    }

    /**
     * Finds the parameter which is about to be type hinted.
     * 
     * @param line The active line.
     * @param pos The active position.
     */
    private findParam(line: TextLine, pos: Position): string | null {
        let param = null;
        let split = line.text.substr(0, pos.character).split(new RegExp("[,(]"));
        if (split.length > 1) {
            param = split[split.length - 1].trim();
            param = param.substr(0, param.length - 1);
        }
        return param;
    }
}

/**
 * Provides one or more return type hint {@link CompletionItem}.
 */
export class ReturnHintCompletionProvider implements CompletionItemProvider {

    public provideCompletionItems(
        doc: TextDocument, 
        pos: Position,
        token: CancellationToken,
        context: CompletionContext
    ): Thenable<CompletionList> | null {
        if (context.triggerCharacter !== returnHintTrigger) {
            return null;
        }
        const items: CompletionItem[] = [];
        const line = doc.lineAt(pos);

        if (this.shouldProvideReturnHint(line, pos)) {         
            pushDefaultCompletionItems(items);
        }
        return Promise.resolve(new CompletionList(items, false));
    }

    private shouldProvideReturnHint(line: TextLine, pos: Position): boolean {

        if (pos.character > 0 && line.text.substr(pos.character - 2, 2) === "->") {
            
            return new RegExp("^[*\t]*def.*\\) *->[: ]*$", "m").test(line.text);
        }
        return false;
    }
}

function pushDefaultCompletionItems(items: CompletionItem[]) {
    for (const type of Object.values(Type)) {
        items.push(new CompletionItem(" " + type, CompletionItemKind.TypeParameter));
    }
}