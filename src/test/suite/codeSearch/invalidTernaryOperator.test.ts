import * as assert from 'assert';
import { CodeSearch, EstimationSource } from "../../../codeSearch";

suite('CodeSearch.invalidTernaryOperator', function() {

    test("returns true for invalid operator", async () => {
        
        let expected = true;
        let typeName = "int";
        let searchResult = { typeName, estimationSource: EstimationSource.Value };
        let src = "var = 1 if ok else 2.213";
        let actual = await CodeSearch.invalidTernaryOperator(src, searchResult);
        assert.equal(actual, expected);
    });

    test("returns true for invalid nestled operator", async () => {
        let expected = true;
        let typeName = "int";
        let searchResult = { typeName, estimationSource: EstimationSource.Value };
        let src = "var = 1 if ok else 2 if True else 'false'";
        let actual = await CodeSearch.invalidTernaryOperator(src, searchResult);
        assert.equal(actual, expected);
    });

    test("returns false for valid single operator", async () => {
        
        let expected = false;
        let typeName = "int";
        let searchResult = { typeName, estimationSource: EstimationSource.Value };
        let src = "var = 1 if ok else 2";
        let actual = await CodeSearch.invalidTernaryOperator(src, searchResult);
        assert.equal(actual, expected);
    });

    test("returns false for valid nestled operator", async () => {
        let expected = false;
        let typeName = "int";
        let searchResult = { typeName, estimationSource: EstimationSource.Value };
        let src = "var = 1 if ok else 2 if True else 9";
        let actual = await CodeSearch.invalidTernaryOperator(src, searchResult);
        assert.equal(actual, expected);
    });

});