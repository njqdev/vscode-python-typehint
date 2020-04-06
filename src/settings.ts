import { workspace, Event, EventEmitter, window } from "vscode";

export class TypeHintSettings {

    private searchLimit = 50;

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
        const searchLimit: number | undefined = workspace.getConfiguration('pyTypehint.search').get('limit');
        if (searchLimit) {
            this.searchLimit = searchLimit;
        }
    }

}