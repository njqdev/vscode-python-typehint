import {
    CancellationToken,
    CompletionContext,
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    Position,
    TextDocument
} from "vscode";

import { findParam } from "./codeSearch";
import { TypeResolver } from "./typeResolution";
import { typeHintCharacter, Type } from "./syntax";

/**
 * Provides one or more type hint {@link CompletionItem}.
 */
export class HintCompletionProvider implements CompletionItemProvider {
    public i = 1;
    public provideCompletionItems(
        doc: TextDocument, 
        pos: Position,
        token: CancellationToken,
        context: CompletionContext
    ): Thenable<CompletionItem[]> | null {
        if (context.triggerCharacter !== typeHintCharacter) {
            return null;
        }
        const items: CompletionItem[] = [];
        const line = doc.lineAt(pos);
        const param = findParam(line, pos);

        if (param && param.length > 0) {         
            let hint = new TypeResolver().FindTypeInDocument(doc, param);

            if (hint) {
                items.push(new CompletionItem(" " + hint, CompletionItemKind.TypeParameter));
            } else {
                for (const type of Object.values(Type)) {
                    items.push(new CompletionItem(" " + type, CompletionItemKind.TypeParameter));
                }
            }
        }
        this.i++;
        return Promise.resolve(items);
    }
}