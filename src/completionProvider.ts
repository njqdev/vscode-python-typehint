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
import { paramHintTrigger, returnHintTrigger, PythonType, simpleIdentifier  } from "./python";
import { TypeHintSettings } from "./settings";


export abstract class CompletionProvider {

    protected bottomOfListSortPrefix: number = 999;

    protected pushHintsToItems(typeHints: string[], completionItems: CompletionItem[]) {
        const sortTextPrefix = this.bottomOfListSortPrefix.toString();
        for (const hint of typeHints) {
            const item = new CompletionItem(this.labelFor(hint), CompletionItemKind.TypeParameter);
            item.sortText = sortTextPrefix + hint;
            completionItems.push(item);
        }
    }

    protected labelFor(typeHint: string): string {
        return " " + typeHint;
    }

    abstract async provideCompletionItems(
        doc: TextDocument, 
        pos: Position,
        token: CancellationToken,
        context: CompletionContext
    ): Promise<CompletionList | null>;
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
                const param = this.getParam(precedingText);
                const provider = new TypeHintProvider(doc, this.settings);
        
                if (param) {
                    try {
                        this.pushEstimationsToItems(await provider.getTypeHints(param), items); 
                    } catch {
                    }

                    const sortTextPrefix = (this.bottomOfListSortPrefix - 1).toString();
                    for (const hint of provider.remainingTypeHints()) {
                        let item = new CompletionItem(this.labelFor(hint), CompletionItemKind.TypeParameter);
                        item.sortText = sortTextPrefix + hint;
                        items.push(item);
                    }
                    
                    if (provider.typingImported) {
                        this.pushHintsToItems(provider.remainingTypingHints(), items);
                    }
                    
                    return Promise.resolve(new CompletionList(items, false));  
                }
            }
        }
        return Promise.resolve(null);
    }

    /**
     * Returns the parameter which is about to be type hinted.
     * 
     * @param precedingText The text before the active position.
     */
    private getParam(precedingText: string): string | null {
        const split = precedingText.split(/[,(*]/);
        let param = split.length > 1 ? split[split.length - 1].trim() : precedingText;
        return !param || /[!:?/\\{}.+/=)'";@&£%¤|<>$^~¨ -]/.test(param) ? null : param;
    }
    
    private pushEstimationsToItems(typeHints: string[], items: CompletionItem[]) {

        if (typeHints.length > 0) {
            let item = new CompletionItem(this.labelFor(typeHints[0]), CompletionItemKind.TypeParameter);
            item.sortText = `0${typeHints[0]}`;
            item.preselect = true;
            items.push(item);

            for (let i = 1; i < typeHints.length; i++) {
                item = new CompletionItem(this.labelFor(typeHints[i]), CompletionItemKind.TypeParameter);
                item.sortText = `${i}${typeHints[i]}`;
                items.push(item);
            }       
        }
    }

    private shouldProvideItems(precedingText: string, activePos: Position, doc: TextDocument): boolean {

        if (activePos.character > 0 && !/#/.test(precedingText)) {
            let provide = /^[ \t]*def /.test(precedingText);

            if (!provide) {
                const nLinesToCheck = activePos.line > 4 ? 4 : activePos.line;
                const previousLines = doc.getText(
                    new Range(doc.lineAt(activePos.line - nLinesToCheck).range.start, activePos)
                );
                provide = new RegExp(`^[ \t]*def(?![\\s\\S]+(\\):|-> *${simpleIdentifier}:))`, "m").test(previousLines);
            }
            return provide;
        }
        return false;
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
            this.pushHintsToItems(Object.values(PythonType), items);
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