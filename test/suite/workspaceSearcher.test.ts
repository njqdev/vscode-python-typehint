import * as assert from 'assert';
import * as vsc from 'vscode';
import { getDataTypeContainer } from '../../src/python';
import { TypeHintSettings } from '../../src/settings';
import { WorkspaceSearcher } from "../../src/workspaceSearcher";
import { messageFor } from "../common";

suite('findHintOfSimilarParam', () => {

    test("doesn't search if workspaceFolders is undefined", async () => {
        const param = "i";
        const activeDocument = `def func(${param}: int):\ndef test(${param}:`;
        const searcher = await newWorkspaceSearcher(activeDocument);

        const actual = await searcher.findHintOfSimilarParam(param, activeDocument);

        assert.strictEqual(actual, null);
    });
});

const language = "python";

async function addDocumentToWorkspace(documentText: string) {
    await vsc.workspace.openTextDocument({ language, content: documentText });
}

async function setup() {
    var r = vsc.workspace.updateWorkspaceFolders(0, undefined, { 
        uri: vsc.Uri.parse(`${__dirname}`),
        name: "test"
    });
    for (let i = 0; i < 4; i++) {
        await vsc.workspace.openTextDocument({ language, content: "pass" });
    }
}

async function newWorkspaceSearcher(documentContent: string): Promise<WorkspaceSearcher> {
    const doc = await vsc.workspace.openTextDocument({ language, content: documentContent });
    return new WorkspaceSearcher(doc.uri, new TypeHintSettings(), getDataTypeContainer());
}