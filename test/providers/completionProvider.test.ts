import * as assert from 'assert';
import * as vsc from 'vscode';
import { paramHintTrigger, PythonType } from "../../src/python";
import { CompletionProvider, ParamHintCompletionProvider } from "../../src/completionProvider";
import { TypeHintSettings } from '../../src/settings';
import { messageFor } from '../common';

suite('ParamHintCompletionProvider', () => {
    const provider = new ParamHintCompletionProvider(new TypeHintSettings());

    test("provides items for first param", async () => {
        let param = "paramName:";
        let actual = await providerResult(provider, param, "):\n\nparamName = 12");

        // Multiple asserts, so if the test fails it is more obvious why.
        assert.notEqual(actual, null);
        assert.equal(actual?.items[0].label.trim(), PythonType.Int);
    });

    test("provides items for non-first param", async () => {
        let param = "first: str, paramName:";
        let actual = await providerResult(provider, param, "\n\nparamName = 12");
        assert.notEqual(actual, null);
        assert.equal(actual?.items[0].label.trim(), PythonType.Int);
    });

    test("provides items for param on new line", async () => {
        let param = "\n    paramName:";
        let actual = await providerResult(provider, param, "\n\nparamName = 12");
        assert.notEqual(actual, null);
        assert.equal(actual?.items[0].label.trim(), PythonType.Int);

        param = "\n\tparamName:";
        actual = await providerResult(provider, param, "\n\nparamName = 12");
        assert.notEqual(actual, null);
        assert.equal(actual?.items[0].label.trim(), PythonType.Int);
    });
    
    test("provides items for param with legal non-ascii chars", async () => {
        let param = "a変な:";
        let actual = await providerResult(provider, param, "\n\na変な = 12");
        assert.notEqual(actual, null);
        assert.equal(actual?.items[0].label.trim(), PythonType.Int);
    });

    test("does not provide items for dict keys", async () => {
        let expected = null;
        let actual = await providerResult(provider, "):\n d = { key:");
        assert.equal(actual, expected);
    });

    test("does not provide items for ':' without a param (within function brackets)", async () => {
        let expected = null;
        let actual = await providerResult(provider, "param, :");
        assert.equal(actual, expected);
    });

    test("does not provide items for ':' under a function def", async () => {
        let data = "):\n    d = 'val:";
        let expected = null;
        let actual = await providerResult(provider, data);
        assert.equal(actual, expected, messageFor({ data, expected }, actual));
        
        data = "):\n    :";
        actual = await providerResult(provider, data);
        assert.equal(actual, expected, messageFor({ data, expected }, actual));
    });

    test("does not provide items for end of function definition", async () => {
        let expected = null;
        let actual = await providerResult(provider, "):");
        assert.equal(actual, expected);
    });

    test("does not include * in parameter name", async () => {
        let param = "*paramName:";
        let actual = await providerResult(provider, param, "\n\nparamName = 12");
        assert.equal(actual?.items[0].label.trim(), PythonType.Int);
    });

});

const language = "python";

async function providerResult(
    provider: CompletionProvider,
    functionText: string,
    trailingText?: string
): Promise<vsc.CompletionList | null> {
    let content = `def func(${functionText}`;
    const lines: string[] = content.split("\n");
    const lastLineIdx = lines.length - 1;
    const lastPos = new vsc.Position(lastLineIdx, lines[lastLineIdx].length);

    if (trailingText) {
        content += trailingText;
    }

    const doc = await vsc.workspace.openTextDocument({ language, content });
    const token = new vsc.CancellationTokenSource().token;
    const ctx = { triggerCharacter: paramHintTrigger, triggerKind: vsc.CompletionTriggerKind.TriggerCharacter };

    return provider.provideCompletionItems(doc, lastPos, token, ctx);
}