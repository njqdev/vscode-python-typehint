import * as assert from 'assert';
import { messageFor, TestCase } from "../../common";
import { TypeSearch } from "../../../src/typeSearch";

suite('TypeSearch.hintOfSimilarParam', () => {

    test("finds hint of lone param", () => {
        const expected = "str";
        const param = "test";
        let src = `def func(${param}: str):\ndef test(${param}:`;
        let actual = TypeSearch.hintOfSimilarParam(param, src);
        assert.strictEqual(actual, expected);
    });

    test("finds hint of param with preceding parameters", () => {
        const expected = "str";
        const param = "test";

        let src = `def func(self, p1: int,${param}: str):\ndef test(${param}:`;
        let actual = TypeSearch.hintOfSimilarParam(param, src);
        assert.strictEqual(actual, expected);
    });
    
    test("finds hint of param with trailing parameters", () => {
        const expected = "str";
        const param = "test";

        let src = `def func(self, ${param}: str,new: int):\ndef test(${param}:`;
        let actual = TypeSearch.hintOfSimilarParam(param, src);
        assert.strictEqual(actual, expected);
    });

    test("handles line breaks in function definition", () => {
        const expected = "str";
        const param = "test";

        let src = `def func(\n\t${param}: str,new: int):\ndef test(${param}:`;
        let actual = TypeSearch.hintOfSimilarParam(param, src);
        assert.strictEqual(actual, expected);
    });

    test("excludes default values", () => {
        const expected = "str";
        const param = "test";

        let src = `def func(${param}: str='exclude',new: int):\ndef test(${param}:`;
        let actual = TypeSearch.hintOfSimilarParam(param, src);
        assert.strictEqual(actual, expected);
    });

    test("finds non-ascii hint", () => {
        const expected = "蟒蛇";
        const param = "test";
        let src = `def func(${param}: 蟒蛇):\ndef test(${param}:`;
        let actual = TypeSearch.hintOfSimilarParam(param, src);
        assert.strictEqual(actual, expected);
    });

    test("matches non-ascii function names", () => {
        const expected = "str";
        const param = "test";
        let src = `def 蟒蛇(${param}: str):\ndef test(${param}:`;
        let actual = TypeSearch.hintOfSimilarParam(param, src);
        assert.strictEqual(actual, expected);
    });

    test("doesn't match param name within other text", () => {
        const expected = null;
        const param = "test";

        let src = `def func(text${param}: str,new: int):\ndef test(${param}:`;
        let actual = TypeSearch.hintOfSimilarParam(param, src);
        assert.strictEqual(actual, expected);
    });

    test("doesn't provide items for ':' followed by ':'", () => {
        
        const expected = null;
        const param = "test";

        let src = `def func(${param}::):\ndef test(${param}:`;
        let actual = TypeSearch.hintOfSimilarParam(param, src);
        assert.strictEqual(actual, expected);
    });

    test("doesn't match comments", () => {
        const expected = null;
        const param = "test";
        let src = `# def func(${param}: str):\ndef test(${param}:`;
        let actual = TypeSearch.hintOfSimilarParam(param, src);
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));

        src = `def func(\n\t# {${param}: 123}`;
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));
    });
    
});