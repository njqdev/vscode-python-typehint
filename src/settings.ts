import { workspace, Event, EventEmitter } from "vscode";

/**
 * Container of user settings.
 */
export class TypeHintSettings {

    private _workspaceSearchEnabled = true;
    private _workspaceSearchLimit = 10;

    constructor() {
        workspace.onDidChangeConfiguration(() => {
            this.initialize();
            this.settingsUpdated.fire();
        });
        this.initialize();
    }

    public get workspaceSearchLimit() {
        return this._workspaceSearchLimit;
    }
    public get workspaceSearchEnabled() {
        return this._workspaceSearchEnabled;
    }
    
    public readonly settingsUpdated = new EventEmitter<void>();

    public get onDidChangeConfiguration(): Event<void> {
        return this.settingsUpdated.event;
    }

    private initialize() {
        const wsEnable: boolean | undefined = workspace.getConfiguration('workspace').get('searchEnabled');
        const searchLimit: number | undefined = workspace.getConfiguration('workspace').get('searchLimit');
        if (wsEnable !== undefined) {
            this._workspaceSearchEnabled = wsEnable;
        }
        if (searchLimit !== undefined) {
            this._workspaceSearchLimit = Number.isInteger(searchLimit) ? searchLimit : Math.round(searchLimit);
        }
    }

}