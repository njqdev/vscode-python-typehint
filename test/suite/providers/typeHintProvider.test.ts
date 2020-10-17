import * as assert from 'assert';
import { getDataTypeContainer } from "../../../src/python";
import { TypeHintProvider } from "../../../src/typeHintProvider";
import { messageFor } from "../../common";

suite('TypeHintProvider', () => {

    let provider: TypeHintProvider;

    setup(() => {
        provider = new TypeHintProvider(getDataTypeContainer());
    });

    suite('estimateTypeHints', () => {

        test("returns type of a variable with the same name", async () => {
            let param = "param";
            let documentText = `def test(param:\n\n${param} = 12`;
            let expected = ["int"];
            let actual = await provider.estimateTypeHints(param, documentText);
            assert.deepStrictEqual(actual, expected);
        });

        test("returns [type, typing equivalents] of a collection variable with the same name", async () => {
            let param = "param";
            let documentText = `from typing import List\ndef test(param:\n\n${param} = [12]`;
            let expected = 3;
            let result = await provider.estimateTypeHints(param, documentText);
            assert.strictEqual(result.length, expected);
        });

        test("does not return duplicates as a result of a type guess", async () => {
            let param = "text";
            let documentText = `def test(param:\n\n${param} = 'this.typeGuessFor() returns str for the param name'`;
            let expected = ["str"];
            let actual = await provider.estimateTypeHints(param, documentText);
            assert.deepStrictEqual(actual, expected);
        });

        test("returns type of a variable and a type guess, if the types differ", async () => {
            let param = "number";
            let documentText = `def test(param:\n\n${param} = 1.23`;
            let expected = 2;
            let result = await provider.estimateTypeHints(param, documentText);
            assert.strictEqual(result.length, expected);
        });

        test("returns class with same name", async () => {
            let param = "test";
            let documentText = `class Test:`;
            let expected = ["Test"];
            let actual = await provider.estimateTypeHints(param, documentText);
            assert.deepStrictEqual(actual, expected);
        });

        test("returns hint of similar param", async () => {
            let param = "test";
            let hint = "str";
            let documentText = `def func(test: ${hint}):`;
            let expected = [hint];
            let actual = await provider.estimateTypeHints(param, documentText);
            assert.deepStrictEqual(actual, expected);
        });

        test("returns type if param name ends with it", async () => {
            let param = "test_str";
            let expected = ["str"];
            let actual = await provider.estimateTypeHints(param, "");
            assert.deepStrictEqual(actual, expected, messageFor(param, expected, actual));

            provider = new TypeHintProvider(getDataTypeContainer());
            param = "teststr";
            actual = await provider.estimateTypeHints(param, "");
            assert.deepStrictEqual(actual, expected, messageFor(param, expected, actual));
        });

        test("returns [type, typing equivalent] if param name ends with collection type", async () => {
            let param = "test_list";
            let documentText = `from typing import List`;
            let expected = ["list", "List["];
            let actual = await provider.estimateTypeHints(param, documentText);
            assert.deepStrictEqual(actual, expected, messageFor(param, expected, actual));

            provider = new TypeHintProvider(getDataTypeContainer());
            param = "testlist";
            actual = await provider.estimateTypeHints(param, documentText);
            assert.deepStrictEqual(actual, expected, messageFor(param, expected, actual));
        });

    });

});