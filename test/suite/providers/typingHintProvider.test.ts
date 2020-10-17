import * as assert from 'assert';
import { getDataTypeContainer, DataType, PythonType } from "../../../src/python";
import { TypingHintProvider } from "../../../src/typingHintProvider";
import { TypeHintSettings } from '../../../src/settings';
import { SetupError, varSearchResult, messageFor, TestCase } from '../../common';

suite('TypingHintProvider', () => {

    const importTyping: string = "import x\nimport typing";
    const importTypingAsX: string = "import x\nimport typing as x";
    const fromTypingImport: string = "import x\nfrom typing import List, Dict, Tuple, Set";
    const typeContainer = getDataTypeContainer();

    suite('containsTyping', () => {

        let provider: TypingHintProvider;

        setup(() => {
            provider = new TypingHintProvider(typeContainer);    
        });

        test("returns true for 'import typing'", async () => {
            const actual = await provider.detectTypingImport(importTyping);
            assert.strictEqual(actual, true);
        });

        test("returns true for 'import typing as x'", async () => {
            const actual = await provider.detectTypingImport(importTypingAsX);
            assert.strictEqual(actual, true);
        });

        test("returns true for 'from typing import x'", async () => {
            const actual = await provider.detectTypingImport(fromTypingImport);
            assert.strictEqual(actual, true);
        });
    });

    suite("getHint", () => {
   
        let provider: TypingHintProvider;

        setup(() => {
            provider = new TypingHintProvider(typeContainer);    
        });

        test("returns typing.Type[", async () => {
            const expected = "typing.List[";
            runTest(await provider.detectTypingImport(importTyping), getHintTest, provider, expected);
        });

        test("returns x.Type[ for 'import typing as x'", async () => {
            const expected = "x.List[";
            runTest(await provider.detectTypingImport(importTypingAsX), getHintTest, provider, expected);
        });

        test("returns Type[ for 'from typing' import", async () => {
            const expected = "List[";
            runTest(await provider.detectTypingImport(fromTypingImport), getHintTest, provider, expected);
        });

        function getHintTest(provider: TypingHintProvider, expected: string) {
            const actual = provider.getHint(PythonType.List);
            assert.strictEqual(actual, expected);
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
            runTest(typingImported, getHintsTest, provider, {data, expected }, PythonType.List);
        });

        test("returns Dict[ and 'Dict[key,' for dicts", () => {
            let data = "{ 1: 2 }";
            let expected = ["Dict[", "Dict[int"];
            runTest(typingImported, getHintsTest, provider, { data, expected }, PythonType.Dict);
        });

        test("handles nestled dicts", () => {
            let data = "[ { 1: 2 } ]";
            let expected = ["List[", "List[Dict[int"];
            runTest(typingImported, getHintsTest, provider, { data, expected }, PythonType.List);
        });

        test("returns Type[ and Type[type] for non-dicts", () => {
            let data = "['str']";
            let expected = ["List[", "List[str]"];
            runTest(typingImported, getHintsTest, provider, { data, expected }, PythonType.List);

            data = "(1, {'ignore': 'this'})";
            expected = ["Tuple[", "Tuple[int]"];
            runTest(typingImported, getHintsTest, provider, { data, expected }, PythonType.Tuple);

            data = "{ 1, 2 }";
            expected = ["Set[", "Set[int]"];
            runTest(typingImported, getHintsTest, provider, { data, expected }, PythonType.Set);
        });

        test("adds typing prefixes for 'import typing' imports", async () => {
            let p = new TypingHintProvider(typeContainer);
            let data = "[ { 1: 2 } ]";
            let expected = ["typing.List[", "typing.List[typing.Dict[int"];
            runTest(
                await p.detectTypingImport(importTyping),
                getHintsTest,
                p,
                { data, expected },
                PythonType.List
            );
        });
        
        function getHintsTest(provider: TypingHintProvider, testCase: TestCase, type: PythonType) {
            const actual = provider.getHints(varSearchResult(type, testCase.data));
            assert.deepStrictEqual(actual, testCase.expected, messageFor(testCase.data, testCase.expected, actual));
        }
    });

    suite("getRemainingHints", () => {

        let provider: TypingHintProvider;

        setup(() => {
            provider = new TypingHintProvider(typeContainer);    
        });

        test("returns all typing hints if typing is not imported, without prefix followed by with prefix", async () => {
            await provider.detectTypingImport("");
            const expected = typingTypes(false).concat(typingTypes(true));
            const actual = provider.getRemainingHints();
            assert.deepStrictEqual(actual, expected);
        });

        test("returns hints without prefix first, for from typing import", async () => {
            const expected = typingTypes(false);
            runTest(
                await provider.detectTypingImport(fromTypingImport),
                getRemainingHintsTest,
                provider,
                expected
            );
        });

        test("returns hints with prefix first, if imported", async () => {
            const expected = typingTypes(true);
            runTest(
                await provider.detectTypingImport(importTyping),
                getRemainingHintsTest,
                provider,
                expected
            );
        });

        
        function getRemainingHintsTest(provider: TypingHintProvider, expected: string) {
            const actual = provider.getRemainingHints();
            assert.deepStrictEqual(actual, expected);
        }
    });

    const typingTypes = (withPrefix: boolean) => {
        const prefix = withPrefix ? "typing." : "";
        return [`${prefix}Dict[`, `${prefix}List[`, `${prefix}Set[`, `${prefix}Tuple[` ];
    };

    function runTest(typingDetected: boolean, test: (...params: any) => void, ...args: any) {
        if (typingDetected) {
            test(...args);
        } else {
            throw new SetupError("The provider failed to detect a typing import.");
        }
    }
});