import * as assert from 'assert';
import * as vsc from 'vscode';
import { paramHintTrigger } from "../../src/python";
import { CompletionProvider, ParamHintCompletionProvider } from "../../src/completionProvider";
import { TypeHintSettings } from '../../src/settings';

suite('ParamHintCompletionProvider', () => {
    const provider = new ParamHintCompletionProvider(new TypeHintSettings());

    test("provides items for first param", async () => {
        let param = "paramName: ";
        let actual = providerResult(provider, param, "\nparamName = 123");
        assert.notEqual(actual, null);
    });

    test("provides items for non-first param", async () => {
        let param = "first: str, paramName: ";
        let actual = await providerResult(provider, param, "\nparamName = 123");
        assert.notEqual(actual, null);
    });

    test("provides items for param on new line", async () => {
        let param = "\n    paramName: ";
        let actual = await providerResult(provider, param, "\nparamName = 123");
        assert.notEqual(actual, null);

        param = "\n\tparamName: ";
        actual = await providerResult(provider, param, "\nparamName = 123");
        assert.notEqual(actual, null);
    });


    test("does not provide items for dict keys", async () => {
        let expected = null;
        let actual = await providerResult(provider, "):\n d = { key:");
        assert.equal(actual, expected);
    });

    test("does not provide items for ':' within strings under function def", async () => {
        let expected = null;
        let actual = await providerResult(provider, "):\n d = { key: 'val:'");
        assert.equal(actual, expected);
    });

    test("does not provide items for end of function definition", async () => {
        let expected = null;
        let actual = await providerResult(provider, "):");
        assert.equal(actual, expected);
    });

});

const language = "python";

async function providerResult(
    provider: CompletionProvider,
    functionText: string,
    postFunctionText?: string
): Promise<vsc.CompletionList | null> {
    let content = `def func(${functionText}`;
    if (postFunctionText) {
        content += postFunctionText;
    }

    const doc = await vsc.workspace.openTextDocument({ language, content });
    const token = new vsc.CancellationTokenSource().token;
    const ctx = { triggerCharacter: paramHintTrigger, triggerKind: vsc.CompletionTriggerKind.TriggerCharacter };

    const lines: string[] = content.split("\n");
    const lastLineIdx = lines.length - 1;
    const lastPos = new vsc.Position(lastLineIdx, lines[lastLineIdx].length);

    return provider.provideCompletionItems(doc, lastPos, token, ctx);
}