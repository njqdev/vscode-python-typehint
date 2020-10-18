import { moduleName, PythonType } from "./python";

/**
 * The source of a type estimation.
 */
export enum EstimationSource { 
    ClassDefinition,
    FunctionDefinition,
    Value,
    ValueOfOtherVariable, 
}

/**
 * The result of a variable type search.
 */
export class VariableSearchResult {
    public typeName: string;
    public estimationSource: EstimationSource;
    public valueAssignment: string;

    constructor(typeName: string, estimationSource: EstimationSource, valueAssignment: string) {
        this.typeName = typeName;
        this.estimationSource = estimationSource;
        this.valueAssignment = valueAssignment;
    }

}

export class TypeSearch {
    
    /**
     * Searches for a class with the same name as a value and returns the name if found.
     * 
     * @param value The value.
     * @param src The source code to search.
     */
    public static classWithSameName(value: string, src: string): string | null {
        const clsMatch = new RegExp(`^[ \t]*class +(${value})[(:]`, "mi").exec(src);
        return clsMatch ? clsMatch[1] : null;
    }

    /**
     * Searches for a variable with the same name as the param and detects its type.
     * 
     * @param param The parameter name.
     * @param src The source code to search.
     */
    public static async variableWithSameName(param: string, src: string): Promise<VariableSearchResult | null> {
        let variableMatch = this.variableSearchRegExp(param).exec(src);
        if (!variableMatch) {
            return null;
        }
        const valueAssignment = variableMatch[1];

        let typeName = this.detectType(valueAssignment);
        if (typeName) {
            return new VariableSearchResult(typeName, EstimationSource.Value, valueAssignment);
        }
        
        variableMatch = /^ *([^(\s#"']+)\(?/.exec(valueAssignment);
        if (!variableMatch) {
            return null;
        }

        if (variableMatch[0].endsWith("(")) {
            let value = variableMatch[1];
            if (this.classWithSameName(value, src)) {
                return new VariableSearchResult(value, EstimationSource.ClassDefinition, valueAssignment);
            }

            if (this.isProbablyAClass(value)) {
                if (!new RegExp(`^[ \t]*def ${value}\\(` ).test(src)) {
                    return new VariableSearchResult(value, EstimationSource.Value, valueAssignment);
                }
            } else {
                return this.searchForHintedFunctionCall(value, src, valueAssignment);
            }
            return null;
        }

        // Searching the import source document is not supported
        if (!this.isImported(variableMatch[1], src.substr(variableMatch.index - variableMatch.length))) {
            variableMatch = this.variableSearchRegExp(variableMatch[1]).exec(src);
            if (variableMatch) {
                const otherType = this.detectType(variableMatch[1]);
                return otherType 
                    ? new VariableSearchResult(otherType, EstimationSource.ValueOfOtherVariable, valueAssignment)
                    : null;
            }
        }
        return null;
    }

    private static searchForHintedFunctionCall(
        value: string,
        src: string,
        valueAssignment: string
    ): VariableSearchResult | null {
        if (value.includes(".")) {
            let split = value.split(".");
            value = split[split.length - 1];
        }

        const regExp = new RegExp(`^[ \t]*def ${value}\\([^)]*\\) *-> *([a-zA-Z_][a-zA-Z0-9_.\\[\\]]+)`, "m");

        const hintedCallMatch = regExp.exec(src);

        if (hintedCallMatch && hintedCallMatch.length === 2) {
            return new VariableSearchResult(
                hintedCallMatch[1],
                EstimationSource.FunctionDefinition,
                valueAssignment
            );
        }
        return null;
    }

    /**
     * Detects the type of a value.
     * 
     * @returns The type name, or null if it is not a built-in Python type.
     */
    public static detectType(value: string): string | null {
        const searches = [
            [ PythonType.List, `${PythonType.List}\\(`, `^ *\\[`],
            [ PythonType.Bool, `${PythonType.Bool}\\(`, `^ *(True|False)`],
            [ PythonType.Complex, `${PythonType.Complex}\\(`, `^ *[()0-9+*\\/ -.]*[0-9][jJ]`],
            [ PythonType.Float, `${PythonType.Float}\\(`, `^ *[-(]*[0-9+*\/ -]*\\.[0-9]`],
            [ PythonType.Tuple, `${PythonType.Tuple}\\(`, `^ *\\(([^'",)]+,| *"[^"]*" *,| *'[^']*' *,)`],
            [ PythonType.Set, `${PythonType.Set}\\(`, `^ *{( *"[^"]*" *[},]+| *'[^']*' *[},]+|[^:]+[}])`],
            [ PythonType.Dict, `${PythonType.Dict}\\(`, "^ *{"],
            [ PythonType.String, `${PythonType.String}\\(`, `^ *(['"]{2}|(\\( *)?"[^"]*"|(\\( *)?'[^']*')`],
            [ PythonType.Bytes, `${PythonType.Bytes}\\(`, `^ *b['"]`],
            [ PythonType.Int, `${PythonType.Int}\\(`, `^ *[-(]*[0-9]`],
            [ PythonType.Object, `${PythonType.Object}\\(` ]
        ];
        value = value.trim();
        if (value.match("^[a-z]")) {
            for (const s of searches) {
                const typeName = s[0];
                if (new RegExp(s[1]).test(value)) {
                    return typeName;
                }
            }
        }
        searches.pop();
        for (const s of searches) {
            const typeName = s[0];
            if (new RegExp(s[2]).test(value)) {
                return typeName;
            }
        }
        return null;
    }

    /**
     * Searches for a previously hinted parameter with the same name.
     * 
     * @param param The parameter name.
     * @param src The source code to search.
     * @returns The type hint of the found parameter or null.
     */
    public static hintOfSimilarParam(param: string, src: string): string | null {

        const m = new RegExp(`^[ \t]*def [^(\\s]+\\([^)]*\\b${param}\\b: *([^),\\s=#:]+)`, "m").exec(src);
        if (m) {
            let hint = m[1].trim();
            return hint ? hint : null;
        }
        return null;
    }

    /**
     * Searches the result for a terinary operator that might return 2 or more different types.
     * 
     * @param searchResult The search result.
     * @returns False if it returns a single type.
     */
    public static invalidTernaryOperator(searchResult: VariableSearchResult): boolean {

        if (searchResult.estimationSource === EstimationSource.ClassDefinition) {
            return false;
        }
        const regExp = / if +[^ ]+ +else( +[^ ]+) *$/;

        let ternaryMatch = regExp.exec(searchResult.valueAssignment);
        while (ternaryMatch) {
            const elseVar = ternaryMatch[1].trim();
            let elseTypeName = this.detectType(elseVar);
            
            if (elseTypeName) {
                ternaryMatch = regExp.exec(elseTypeName);
                if (!ternaryMatch) {
                    return searchResult.typeName !== elseTypeName;
                }
            } else {
                return false;
            }
        }
        return false;
    }

    /**
     * Detects if a value is imported and returns the imported value.  
     * For instance, if 'from x import y' is detected for a value of 'x.y', 'y' is returned.
     * 
     * @param value The value.
     * @param src The source code to search.
     * @param considerAsImports Also search for 'import x as value' imports. 
     */
    public static findImport(value: string, src: string, considerAsImports: boolean = true): string | null {

        if (value.includes(".")) {
            const s = value.split(".");
            const type = s[s.length - 1];
            const module = s.slice(0, s.length - 1).join(".");

            let match = null;

            if (s.length === 2 && module !== type) {
                // Check if module is a module or a class
                match = new RegExp(
                    `^[ \t]*import +${module}|^[ \t]*from ${moduleName} import (${module})`, "m"
                ).exec(src);
                if (match) {    
                    return match[1] ? `${match[1]}.${type}` : value;
                }
            }
            match = new RegExp(`^[ \t]*import +${module}|^[ \t]*from ${module} import (${type})`, "m").exec(src);
            return match ? match[1] ? type : value : null;
        }
        return this.isImported(value, src, considerAsImports) ? value : null;
    }

    /**
     * Detects if a value is imported.
     */
    private static isImported(value: string, src: string, checkForAsImports: boolean = true): boolean {

        let exp = `^[ \t]*(from +${moduleName} +import +${value}`;
        if (checkForAsImports) {
            exp += `|from +${moduleName} +import +${moduleName} +as +${value}`;
        }
        exp += ")";
        return new RegExp(exp, "m").test(src);
    }

    private static isProbablyAClass(lineText: string): boolean {
        return new RegExp(`^([a-zA-Z0-9_]+\\.)*[A-Z]`, "m").test(lineText);
    }

    /**
     * Matches a line that contains 'variableName = (.+)'.  
     */
    private static variableSearchRegExp(variableName: string): RegExp {
        return new RegExp(`^[ \t]*${variableName} *= *(.+)$`, "m");
    }
}