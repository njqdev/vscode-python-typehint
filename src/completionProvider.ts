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
import { paramHintTrigger, returnHintTrigger, PythonType, getDataTypeContainer  } from "./python";
import { TypeHintSettings } from "./settings";
import { WorkspaceSearcher } from "./workspaceSearcher";


export abstract class CompletionProvider {

    protected bottomOfListSortPrefix: number = 999;

    /**
     * Push type hints to the end of an array of completion items.
     */
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
                const documentText = doc.getText();
                const typeContainer = getDataTypeContainer();
                const provider = new TypeHintProvider(typeContainer);
                const wsSearcher = new WorkspaceSearcher(doc.uri, this.settings, typeContainer);
                
                if (param) {
                    const workspaceHintSearch = this.settings.workspaceSearchEnabled
                        ? this.workspaceHintSearch(param, wsSearcher, documentText)
                        : null;
                    try {
                        const estimations = await provider.estimateTypeHints(param, documentText);
                        if (estimations.length > 0) {
                            this.pushEstimationsToItems(estimations, items);
                            wsSearcher.cancel();
                        }
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
                    const hint = await workspaceHintSearch;
                    if (hint && provider.hintNotProvided(hint)) {
                        items.unshift(this.toSelectedCompletionItem(hint));
                    }
                    return Promise.resolve(new CompletionList(items, false));  
                }
            }
        }
        return Promise.resolve(null);
    }

    private async workspaceHintSearch(param: string, ws: WorkspaceSearcher, docText: string): Promise<string | null> {
        try {
            return ws.findHintOfSimilarParam(param, docText);
        } catch {
            return null;
        }
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
            items.push(this.toSelectedCompletionItem(typeHints[0]));

            for (let i = 1; i < typeHints.length; i++) {
                let item = new CompletionItem(this.labelFor(typeHints[i]), CompletionItemKind.TypeParameter);
                item.sortText = `${i}${typeHints[i]}`;
                items.push(item);
            }       
        }
    }

    private toSelectedCompletionItem(typeHint: string): CompletionItem {
        let item = new CompletionItem(this.labelFor(typeHint), CompletionItemKind.TypeParameter);
        item.sortText = `0${typeHint}`;
        item.preselect = true;
        return item;
    }

    private shouldProvideItems(precedingText: string, activePos: Position, doc: TextDocument): boolean {

        if (activePos.character > 0 && !/#/.test(precedingText)) {
            let provide = /^[ \t]*(def |async *def )/.test(precedingText);

            if (!provide) {
                const nLinesToCheck = activePos.line > 4 ? 4 : activePos.line;
                const previousLines = doc.getText(
                    new Range(doc.lineAt(activePos.line - nLinesToCheck).range.start, activePos)
                );
                provide = new RegExp(`^[ \t]*(async *)?def(?![\\s\\S]+(\\):|-> *[^:\\s]+:))`, "m").test(previousLines);
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