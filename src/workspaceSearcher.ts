import { CancellationTokenSource, CancellationToken, Uri, workspace } from "vscode";
import { TypeHintSettings } from "./settings";
import { TypeSearch } from "./typeSearch";
import { DataTypeContainer } from "./python";

/**
 * Searches Python files in the workspace.
 */
export class WorkspaceSearcher {

    private search: boolean = true;
    private activeDocUri: Uri;
    private typeContainer: DataTypeContainer;
    private tokenSource: CancellationTokenSource;
    private settings: TypeHintSettings;

    constructor(activeDocumentUri: Uri, settings: TypeHintSettings, typeContainer: DataTypeContainer) {
        this.activeDocUri = activeDocumentUri;
        this.settings = settings;
        this.tokenSource = new CancellationTokenSource();
        this.typeContainer = typeContainer;
    }

    /**
     * Searches documents, excluding the active one, for a previously hinted parameter with the same name.
     * 
     * @param param The parameter name.
     * @param activeDocumentText The source code of the active document.
     * @returns The type of the found parameter or null.
     */
    public async findHintOfSimilarParam(param: string, activeDocumentText: string): Promise<string | null> {
        this.search = true;
        const maxResults = this.settings.workspaceSearchLimit;

        if (maxResults > 0 && workspace.workspaceFolders) {
            const uriSplit = this.activeDocUri.path.split("/");
            const glob = `**/${uriSplit[uriSplit.length - 1]}`;
            const uris = await workspace.findFiles("**/*.py", glob, maxResults, this.tokenSource.token);

            for (let i = 0; this.search && i < uris.length; i++) {
                let doc = await workspace.openTextDocument(uris[i]);
                let docText = doc.getText();
                let type = TypeSearch.hintOfSimilarParam(param, docText);
                if (this.search && type) {
                    if (!(type in this.typeContainer)) {
                        type = TypeSearch.findImport(type, activeDocumentText, false);
                    }
                    if (type) {
                        return type;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Stops all searches.
     */
    public cancel() {
        if (this.search) {
            this.search = false;
            this.tokenSource.cancel();
        }
    }
}