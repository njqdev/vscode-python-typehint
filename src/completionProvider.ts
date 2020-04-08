import {
    CancellationToken,
    CompletionContext,
    CompletionList,
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    Position,
    TextLine,
    TextDocument,
    Range
} from "vscode";
import { TypeHintProvider } from "./typeHintProvider";
import { paramHintTrigger, returnHintTrigger, PythonType, anyClassOrFunctionName } from "./python";
import { TypeHint, labelFor } from "./typeHint";
import { TypeHintSettings } from "./settings";


abstract class CompletionProvider {

    protected pushTypesToItems(typeNames: PythonType[], completionItems: CompletionItem[]) {
        for (const typeName of typeNames) {
            const item = new CompletionItem(labelFor(typeName), CompletionItemKind.TypeParameter);
    
            // Add 999 to ensure they're sorted to the bottom of the CompletionList.
            item.sortText = `999${typeName}`;
            completionItems.push(item);
        }
    }
}

/**
 * Provides one or more parameter type hint {@link CompletionItem}.
 */
export class ParamHintCompletionProvider extends CompletionProvider implements CompletionItemProvider {

    private settings: TypeHintSettings;

    constructor(settings: TypeHintSettings) {
        super();
        this.settings = settings;
    }

    public async provideCompletionItems(
        doc: TextDocument, 
        pos: Position,
        token: CancellationToken,
        context: CompletionContext
    ): Promise<CompletionList | null> {
        if (context.triggerCharacter === paramHintTrigger) {
            const items: CompletionItem[] = [];
            const line = doc.lineAt(pos);
            const precedingText = line.text.substring(0, pos.character - 1).trim();

            if (this.shouldProvideItems(precedingText, pos, doc)) {
                const param: string = this.findParam(precedingText, pos);
                const provider = new TypeHintProvider(doc, this.settings);
        
                if (param.length > 0) {
                    try {
                        this.pushEstimationsToItems(await provider.getTypeHints(param), items); 
                    } catch (error) {
                    }     
                }
                this.pushTypesToItems(provider.getRemainingTypes(), items);
                return Promise.resolve(new CompletionList(items, false));
            }
        }
        return Promise.resolve(null);
    }

    /**
     * Finds the parameter which is about to be type hinted.
     * 
     * @param precedingText Text preceding the active position.
     * @param pos The active position.
     * @returns The parameter.
     */
    private findParam(precedingText: string, pos: Position): string {
        let param = "";

        let i = precedingText.length - 1;
        let last = precedingText[i];
        while (last !== "," && last !== "(" && i >= 0) {
            param = precedingText[i] + param;
            i--;
            last = precedingText[i];
        }
        return param.trim();
    }
    
    private pushEstimationsToItems(typeHints: TypeHint[], items: CompletionItem[]) {

        if (typeHints.length > 0) {
            let typeHint = typeHints[0].label;
            let item = new CompletionItem(typeHint, CompletionItemKind.TypeParameter);
            item.sortText = `0${typeHint}`;
            item.preselect = true;
            item.insertText = typeHints[0].insertText;
            items.push(item);

            for (let i = 1; i < typeHints.length; i++) {
                typeHint = typeHints[i].label;
                item = new CompletionItem(typeHint, CompletionItemKind.TypeParameter);
                item.sortText = `${i}${typeHint}`;
                item.insertText = typeHints[i].insertText;
                items.push(item);
            }       
        }
    }

    private shouldProvideItems(precedingText: string, activePos: Position, doc: TextDocument): boolean {

        if (activePos.character > 0 && !this.isInvalid(precedingText)) {
            let provide = new RegExp("^[ \t]*def", "m").test(precedingText);

            if (!provide) {
                const nLinesToCheck = activePos.character > 4 ? 4 : activePos.line;
                const range = new Range(doc.lineAt(activePos.line - nLinesToCheck).range.start, activePos);
                provide = new RegExp(
                    `^[ \t]*def(?![\s\S]+(\\):|-> *${anyClassOrFunctionName}:))`,
                    "m"
                ).test(doc.getText(range));
            }
            return provide;
        }
        return false;
    }

    /**
     * The text is invalid if it is a comment, dict or the end of the function definition.
     */
    private isInvalid(precedingText: string): boolean {
        if (precedingText) {
            return new RegExp("#|\\)$|{ *[a-zA-Z0-9.+*/\\(\\)-]+$").test(precedingText);
        }
        return true;
    }
}

/**
 * Provides one or more return type hint {@link CompletionItem}.
 */
export class ReturnHintCompletionProvider extends CompletionProvider implements CompletionItemProvider {

    public async provideCompletionItems(
        doc: TextDocument, 
        pos: Position,
        token: CancellationToken,
        context: CompletionContext
    ): Promise<CompletionList | null> {
        if (context.triggerCharacter !== returnHintTrigger) {
            return null;
        }
        const items: CompletionItem[] = [];
        const line = doc.lineAt(pos);

        if (this.shouldProvideItems(line, pos)) {         
            this.pushTypesToItems(Object.values(PythonType), items);
        }
        return Promise.resolve(new CompletionList(items, false));
    }

    private shouldProvideItems(line: TextLine, pos: Position): boolean {

        if (pos.character > 0 && line.text.substr(pos.character - 2, 2) === "->") {

            return new RegExp("\\) *->[: ]*$", "m").test(line.text);
        }
        return false;
    }
}