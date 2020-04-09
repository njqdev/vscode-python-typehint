import { workspace, Event, EventEmitter } from "vscode";

/**
 * Container of user settings.
 */
export class TypeHintSettings {

    private searchLimit = 20;

    public get fileSearchLimit() {
        return this.searchLimit;
    }

    constructor() {
        workspace.onDidChangeConfiguration(() => {
            this.initialize();
            this.settingsUpdated.fire();
        });
        this.initialize();
    }
    
    
    public readonly settingsUpdated = new EventEmitter<void>();

    public get onDidChangeConfiguration(): Event<void> {
        return this.settingsUpdated.event;
    }

    private initialize() {
        const searchLimit: number | undefined = workspace.getConfiguration('workspace.search').get('limit');
        if (searchLimit) {
            this.searchLimit = Number.isInteger(searchLimit) ? searchLimit : Math.round(searchLimit);
        }
    }

}