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
            const provider = new TypingHintProvider(typeContainer);
            const actual = await provider.detectTypingImport(importTyping);
            assert.equal(actual, true);
        });

        test("returns true for 'import typing as x'", async () => {
            const provider = new TypingHintProvider(typeContainer);
            const actual = await provider.detectTypingImport(importTypingAsX);
            assert.equal(actual, true);
        });

        test("returns true for 'from typing import x'", async () => {
            const provider = new TypingHintProvider(typeContainer);
            const actual = await provider.detectTypingImport(fromTypingImport);
            assert.equal(actual, true);
        });
    });

    suite("getHint", () => {
   
        test("returns typing.Type[", async () => {
            const provider = new TypingHintProvider(typeContainer);
            const expected = "typing.List[";
            providerTest(await provider.detectTypingImport(importTyping), getHintTest, provider, expected);
        });

        test("returns x.Type[ for 'import typing as x'", async () => {
            const provider = new TypingHintProvider(typeContainer);
            const expected = "x.List[";
            providerTest(await provider.detectTypingImport(importTypingAsX), getHintTest, provider, expected);
        });

        test("returns Type[ for 'from typing' import", async () => {
            const provider = new TypingHintProvider(typeContainer);
            const expected = "List[";
            providerTest(await provider.detectTypingImport(fromTypingImport), getHintTest, provider, expected);
        });

        function getHintTest(provider: TypingHintProvider, expected: string) {
            const actual = provider.getHint(PythonType.List);
            assert.equal(actual, expected);
        }
    });

    suite("getHints", () => {

        const provider = new TypingHintProvider(typeContainer);
        let typingImported: boolean;

        setup(async () => {
            typingImported = await provider.detectTypingImport(fromTypingImport);    
        });

        test("returns Type[ for empty collection", () => {
            const data = "[]";
            const expected = ["List["];
            providerTest(typingImported, getTypingHints, provider, {data, expected }, PythonType.List);
        });

        test("returns Dict[ and 'Dict[key,' for dicts", () => {
            let data = "{ 1: 2 }";
            let expected = ["Dict[", "Dict[int"];
            providerTest(typingImported, getTypingHints, provider, { data, expected }, PythonType.Dict);
        });

        test("handles nestled dicts", () => {
            let data = "[ { 1: 2 } ]";
            let expected = ["List[", "List[Dict[int"];
            providerTest(typingImported, getTypingHints, provider, { data, expected }, PythonType.List);
        });

        test("returns Type[ and Type[type] for non-dicts", () => {
            let data = "['str']";
            let expected = ["List[", "List[str]"];
            providerTest(typingImported, getTypingHints, provider, { data, expected }, PythonType.List);

            data = "(1, {'ignore': 'this'})";
            expected = ["Tuple[", "Tuple[int]"];
            providerTest(typingImported, getTypingHints, provider, { data, expected }, PythonType.Tuple);

            data = "{ 1, 2 }";
            expected = ["Set[", "Set[int]"];
            providerTest(typingImported, getTypingHints, provider, { data, expected }, PythonType.Set);
        });

        test("adds typing prefixes for 'import typing' imports", async () => {
            let p = new TypingHintProvider(typeContainer);
            let data = "[ { 1: 2 } ]";
            let expected = ["typing.List[", "typing.List[typing.Dict[int"];
            providerTest(
                await p.detectTypingImport(importTyping),
                getTypingHints,
                p,
                { data, expected },
                PythonType.List
            );
        });
        
        function getTypingHints(provider: TypingHintProvider, testCase: TestCase, type: PythonType) {
            const actual = provider.getHints(varSearchResult(type, testCase.data));
            assert.deepEqual(actual, testCase.expected, messageFor(testCase.data, testCase.expected, actual));
        }
    });

    function providerTest(typingDetected: boolean, test: (...params: any) => void, ...args: any) {
        if (typingDetected) {
            test(...args);
        } else {
            throw new SetupError("The provider failed to detect a typing import.");
        }
    }
});