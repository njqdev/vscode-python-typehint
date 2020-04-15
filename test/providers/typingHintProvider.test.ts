import * as assert from 'assert';
import * as vsc from 'vscode';
import { getDataTypeContainer, DataType, PythonType } from "../../src/python";
import { TypingHintProvider } from "../../src/typingHintProvider";
import { TypeHintSettings } from '../../src/settings';
import { SetupError, varSearchResult, messageFor, TestCase } from '../common';

suite('TypingHintProvider', () => {

    const importTyping: string = "import x\nimport typing";
    const importTypingAsX: string = "import x\nimport typing as x";
    const fromTypingImport: string = "import x\nfrom typing import List";
    const typeContainer = getDataTypeContainer();

    suite('containsTyping', () => {

        test("returns true for 'import typing'", async () => {
            const provider = new TypingHintProvider(importTyping, typeContainer);
            const actual = await provider.containsTyping();
            assert.equal(actual, true);
        });

        test("returns true for 'import typing as x'", async () => {
            const provider = new TypingHintProvider(importTypingAsX, typeContainer);
            const actual = await provider.containsTyping();
            assert.equal(actual, true);
        });

        test("returns true for 'from typing import x'", async () => {
            const provider = new TypingHintProvider(fromTypingImport, typeContainer);
            const actual = await provider.containsTyping();
            assert.equal(actual, true);
        });
    });

    suite("getTypingHint", () => {
   
        test("returns typing.Type[", async () => {
            const provider = new TypingHintProvider(importTyping, typeContainer);
            const expected = "typing.List[";
            providerTest(getTypingHint, await provider.containsTyping(), provider, expected);
        });

        test("returns x.Type[ for 'import typing as x'", async () => {
            const provider = new TypingHintProvider(importTypingAsX, typeContainer);
            const expected = "x.List[";
            providerTest(getTypingHint, await provider.containsTyping(), provider, expected);
        });

        test("returns Type[ for 'from typing' import", async () => {
            const provider = new TypingHintProvider(fromTypingImport, typeContainer);
            const expected = "List[";
            providerTest(getTypingHint, await provider.containsTyping(), provider, expected);
        });

        function getTypingHint(provider: TypingHintProvider, expected: string) {
            const actual = provider.getTypingHint(PythonType.List);
            assert.equal(actual, expected);
        }
    });

    suite("getTypingHints", () => {

        const provider = new TypingHintProvider(fromTypingImport, typeContainer);
        let typingImported: boolean;

        setup(async () => {
            typingImported = await provider.containsTyping();    
        });

        test("returns Type[ for empty collection", () => {
            const data = "[]";
            const expected = ["List["];
            providerTest(getTypingHints, typingImported, provider, {data, expected }, PythonType.List);
        });

        test("returns Dict[ and 'Dict[key,' for dicts", () => {
            let data = "{ 1: 2 }";
            let expected = ["Dict[", "Dict[int"];
            providerTest(getTypingHints, typingImported, provider, { data, expected }, PythonType.Dict);
        });

        test("handles nestled dicts", () => {
            let data = "[ { 1: 2 } ]";
            let expected = ["List[", "List[Dict[int"];
            providerTest(getTypingHints, typingImported, provider, { data, expected }, PythonType.List);
        });

        test("returns Type[ and Type[type] for non-dicts", () => {
            let data = "['str']";
            let expected = ["List[", "List[str]"];
            providerTest(getTypingHints, typingImported, provider, { data, expected }, PythonType.List);

            data = "(1, {'ignore': 'this'})";
            expected = ["Tuple[", "Tuple[int]"];
            providerTest(getTypingHints, typingImported, provider, { data, expected }, PythonType.Tuple);

            data = "{ 1, 2 }";
            expected = ["Set[", "Set[int]"];
            providerTest(getTypingHints, typingImported, provider, { data, expected }, PythonType.Set);
        });

        test("adds typing prefixes for 'import typing' imports", async () => {
            let p = new TypingHintProvider(importTyping, typeContainer);
            let data = "[ { 1: 2 } ]";
            let expected = ["typing.List[", "typing.List[typing.Dict[int"];
            providerTest(getTypingHints, await p.containsTyping(), p, { data, expected }, PythonType.List);
        });
        
        function getTypingHints(provider: TypingHintProvider, testCase: TestCase, type: PythonType) {
            const actual = provider.getTypingHints(varSearchResult(type, testCase.data));
            assert.deepEqual(actual, testCase.expected, messageFor(testCase, actual));
        }
    });

    function providerTest(test: (...params: any) => void, typingDetected: boolean, ...args: any) {
        if (typingDetected) {
            test(...args);
        } else {
            throw new SetupError("The provider failed to detect a typing import.");
        }
    }
});