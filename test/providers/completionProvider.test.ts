import * as assert from 'assert';
import * as vsc from 'vscode';
import { paramHintTrigger, PythonType } from "../../src/python";
import { CompletionProvider, ParamHintCompletionProvider } from "../../src/completionProvider";
import { TypeHintSettings } from '../../src/settings';
import { messageFor } from '../common';

suite('ParamHintCompletionProvider', () => {
    const provider = new ParamHintCompletionProvider(new TypeHintSettings());

    test("provides items for first param", async () => {
        let param = "param_1:";
        let actual = await providerResult(provider, param);
        assert.notEqual(actual, null);
    });

    test("provides items for non-first param", async () => {
        let param = "first: str, paramName:";
        let actual = await providerResult(provider, param, "\n\nparamName = 12");
        assert.notEqual(actual, null);
        assert.equal(actual?.items[0].label.trim(), PythonType.Int);
    });

    test("provides items for param on new line", async () => {
        let param = "\n    paramName:";
        let actual = await providerResult(provider, param);
        assert.notEqual(actual, null);

        param = "\n\tparamName:";
        actual = await providerResult(provider, param);
        assert.notEqual(actual, null);
    });
    
    test("provides items for param with legal non-ascii chars", async () => {
        let param = "a変な:";
        let actual = await providerResult(provider, param);
        assert.notEqual(actual, null);
    });

    test("provides items for nestled function", async () => {
        let data = `):
    x = 1
    def nestled(multiple_lines,
                paramName:`;
        let actual = await providerResult(provider, data);
        assert.notEqual(actual, null);
    });

    test("provides items for async function", async () => {
        let data = "async def func(test:";
        let pos = new vsc.Position(0, data.length);
        let expected = null;
        let actual = await provideCompletionItems(provider, data, pos);
        assert.notEqual(actual, null, messageFor(data, expected, actual));

        let line2 = "        test:";
        data = "async def func(\n" + line2;
        pos = new vsc.Position(1, line2.length);
        actual = await provideCompletionItems(provider, data, pos);
        assert.notEqual(actual, null, messageFor(data, expected, actual));
    });
    
    test("provides default items", async () => {
        let param = "notFound:";
        let expected = Object.values(PythonType).sort();
        let result = await providerResult(provider, param);
        
        assert.notEqual(result, null);
        let actual: string[] = [];
        result?.items.forEach((item) => { actual.push(item.label.trim()); });

        assert.deepEqual(actual, expected);
    });

    test("provides type estimations + default items", async () => {
        let param = "param:";
        let expected = Object.values(PythonType).length + 1;
        let result = await providerResult(provider, param, "\n\nparam = Class()");
        assert.equal(result?.items.length, expected);
    });
    
    test("does not provide items unless a function def is detected", async () => {
        let text = " :";
        let pos = new vsc.Position(0, text.length);
        let actual = await provideCompletionItems(provider, text, pos);
        assert.equal(actual, null);
    });

    test("does not provide items for ':' without a param (within function brackets)", async () => {
        let actual = await providerResult(provider, "param, :");
        assert.equal(actual, null);
    });

    test("does not provide items for ':' under a function def", async () => {
        let data = "):\n    d = ', not_a_param:";
        let expected = null;
        let actual = await providerResult(provider, data);
        assert.equal(actual, expected, messageFor(data, expected, actual));

        data = `self,
                s: str,
                f: float,
                i: int):
    v = ', not_a_param:`;
        actual = await providerResult(provider, data);
        assert.equal(actual, null, messageFor(data, expected, actual));
        
        data = "):\n    :";
        actual = await providerResult(provider, data);
        assert.equal(actual, expected, messageFor(data, expected, actual));

        data = "):\n d = { key:";
        actual = await providerResult(provider, data);
        assert.equal(actual, null, messageFor(data, expected, actual));
    });

    test("does not provide items for end of function definition", async () => {
        let actual = await providerResult(provider, "):");
        assert.equal(actual, null);
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
    let content = `    def func(${functionText}`;
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

async function provideCompletionItems(
    provider: CompletionProvider, 
    documentContent: string,
    pos: vsc.Position
): Promise<vsc.CompletionList | null> {
    const doc = await vsc.workspace.openTextDocument({ language, content: documentContent });
    const token = new vsc.CancellationTokenSource().token;
    const ctx = { triggerCharacter: paramHintTrigger, triggerKind: vsc.CompletionTriggerKind.TriggerCharacter };

    return provider.provideCompletionItems(doc, pos, token, ctx);
}