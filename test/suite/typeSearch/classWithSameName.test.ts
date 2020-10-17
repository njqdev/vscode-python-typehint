import * as assert from 'assert';
import { TypeSearch } from "../../../src/typeSearch";
import { messageFor } from "../../common";

suite('TypeSearch.classWithSameName', () => {

    test("finds class", () => {
        let value = "test";
        let expected = "Test";
        let src = `class ${expected}:`;
        let actual = TypeSearch.classWithSameName(value, src);
        assert.strictEqual(actual, expected);
    });

    test("finds subclass", () => {
        let value = "test";
        let expected = "Test";
        let src = `class ${expected}(Super):`;
        let actual = TypeSearch.classWithSameName(value, src);
        assert.strictEqual(actual, expected);
    });

    test("handles tabs and spaces", () => {
        let value = "test";
        let expected = "Test";
        let src = `\tclass  ${expected}:`;
        let actual = TypeSearch.classWithSameName(value, src);
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));

        src = `    class  ${expected}:`;
        actual = TypeSearch.classWithSameName(value, src);
        assert.strictEqual(actual, expected, messageFor(src, expected, actual));
    });
});