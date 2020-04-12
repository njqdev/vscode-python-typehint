import * as assert from 'assert';
import { TypeSearch, EstimationSource } from "../../src/typeSearch";

suite('CodeSearch.invalidTernaryOperator', function() {

    test("returns true for invalid operator", () => {
        
        let expected = true;
        let typeName = "int";
        let src = "var = 1 if ok else 2.213";
        let searchResult = { typeName, estimationSource: EstimationSource.Value, valueAssignment: src };
        let actual = TypeSearch.invalidTernaryOperator(searchResult);
        assert.equal(actual, expected);
    });

    test("returns true for invalid nestled operator", () => {
        let expected = true;
        let typeName = "int";
        let src = "var = 1 if ok else 2 if True else 'false'";
        let searchResult = { typeName, estimationSource: EstimationSource.Value, valueAssignment: src };
        let actual = TypeSearch.invalidTernaryOperator(searchResult);
        assert.equal(actual, expected);
    });

    test("returns false for valid single operator", () => {
        
        let expected = false;
        let typeName = "int";
        let src = "var = 1 if ok else 2";
        let searchResult = { typeName, estimationSource: EstimationSource.Value, valueAssignment: src };
        let actual = TypeSearch.invalidTernaryOperator(searchResult);
        assert.equal(actual, expected);
    });

    test("returns false for valid nestled operator", () => {
        let expected = false;
        let typeName = "int";
        let src = "var = 1 if ok else 2 if True else 9";
        let searchResult = { typeName, estimationSource: EstimationSource.Value, valueAssignment: src };
        let actual = TypeSearch.invalidTernaryOperator(searchResult);
        assert.equal(actual, expected);
    });

});