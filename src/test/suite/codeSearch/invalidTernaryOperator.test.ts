import * as assert from 'assert';
import { invalidTernaryOperator } from "../../../codeSearch";

/**
 * The function is dependent on findType.
 */
suite('invalidTernaryOperator', function() {

    test("returns true for invalid operator", () => {
        
        let expected = true;
        let typeName = "int";
        let src = "var = 1 if ok else 2.213";
        let actual = invalidTernaryOperator(typeName, src);
        assert.equal(actual, expected);
    });

    test("returns true for invalid nestled operator", () => {
        let expected = true;
        let typeName = "int";
        let src = "var = 1 if ok else 2 if True else 'false'";
        let actual = invalidTernaryOperator(typeName, src);
        assert.equal(actual, expected);
    });

    test("returns false for valid single operator", () => {
        
        let expected = false;
        let typeName = "int";
        let src = "var = 1 if ok else 2";
        let actual = invalidTernaryOperator(typeName, src);
        assert.equal(actual, expected);
    });

    test("returns false for valid nestled operator", () => {
        let expected = false;
        let typeName = "int";
        let src = "var = 1 if ok else 2 if True else 9";
        let actual = invalidTernaryOperator(typeName, src);
        assert.equal(actual, expected);
    });

});