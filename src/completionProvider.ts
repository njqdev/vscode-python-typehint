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
import { TypeResolver, TypeResolution } from "./typeResolver";
import { paramHintTrigger, returnHintTrigger, Types } from "./python";


abstract class CompletionProvider {

    protected pushTypesToItems(types: string[], completionItems: CompletionItem[]) {
        for (const type of types) {
            const item = new CompletionItem(" " + type, CompletionItemKind.TypeParameter);
    
            // Prioritize type estimations and sort remaining items alphabetically
            item.sortText = `999${type}`;   
            completionItems.push(item);
        }
    }
}

/**
 * Provides one or more parameter type hint {@link CompletionItem}.
 */
export class ParamHintCompletionProvider extends CompletionProvider implements CompletionItemProvider {

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
            const resolution = new TypeResolver().ResolveTypes(param, doc);
            this.pushTypeResolutionToItems(resolution, items);
        } else {
            this.pushTypesToItems(Object.values(Types), items);
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
    
    private pushTypeResolutionToItems(resolution: TypeResolution, items: CompletionItem[]) {

        if (resolution.estimations) {
            for (let i = 0; i < resolution.estimations.length; i++) {
                const typeName = resolution.estimations[i];
                const item = new CompletionItem(" " + typeName, CompletionItemKind.TypeParameter);
                item.sortText = `${i}${typeName}`;
                item.preselect = true;
                items.push(item);
            }       

        }
        this.pushTypesToItems(resolution.remainingTypes, items);
    }
}

/**
 * Provides one or more return type hint {@link CompletionItem}.
 */
export class ReturnHintCompletionProvider extends CompletionProvider implements CompletionItemProvider {

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
            this.pushTypesToItems(Object.values(Types), items);
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