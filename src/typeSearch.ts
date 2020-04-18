import { simpleIdentifier, PythonType } from "./python";

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
     * Searches for a class with the same name as object and returns the name if found.
     * 
     * @param object The object.
     * @param src The source code to search.
     */
    public static classWithSameName(object: string, src: string): string | null {
        const clsMatch = new RegExp(`^ *class +(${object})[(:]`, "mi").exec(src);
        return clsMatch ? clsMatch[1] : null;
    }

    /**
     * Searches for a variable with the same name as the param and detects its type.
     * 
     * @param param The parameter name.
     * @param src The source code to search.
     * @returns A search result or null.
     */
    public static async variableWithSameName(param: string, src: string): Promise<VariableSearchResult | null> {
        let match = this.variableSearchRegExp(param).exec(src);
        if (!match) {
            return null;
        }
        const valueAssignment = match[1];

        let typeName = this.detectType(valueAssignment);
        if (typeName) {
            return new VariableSearchResult(typeName, EstimationSource.Value, valueAssignment);
        }
        
        match = new RegExp(`^ *(${simpleIdentifier})\\(?`).exec(valueAssignment);
        if (!match) {
            return null;
        }

        if (match[0].endsWith("(")) {
            let value = match[1];
            if (this.classWithSameName(value, src)) {
                return new VariableSearchResult(value, EstimationSource.ClassDefinition, valueAssignment);
            }

            if (this.isProbablyAClass(value)) {
                if (!new RegExp(`^[ \t]*def ${value}\\(` ).test(src)) {
                    return new VariableSearchResult(value, EstimationSource.Value, valueAssignment);
                }
            } else {
                if (value.includes(".")) {
                    let split = value.split(".");
                    value = split[split.length - 1];
                }
                // Find the function definition and check if the return type is hinted
                const regExp = new RegExp(`^[ \t]*def ${value}\\([^)]*\\) *-> *([a-zA-Z_][a-zA-Z0-9_.\\[\\]]+)`, "m");

                const hintedCallMatch = regExp.exec(src);

                if (hintedCallMatch && hintedCallMatch.length === 2) {
                    return new VariableSearchResult(
                        hintedCallMatch[1],
                        EstimationSource.FunctionDefinition,
                        valueAssignment
                    );
                }
            }
            return null;
        }

        // Searching the import source document is not supported (yet?)
        if (!this.isImported(match[1], src.substr(match.index - match.length))) {
            match = this.variableSearchRegExp(match[1]).exec(src);
            if (match) {
                const otherType = this.detectType(match[1]);
                return otherType 
                    ? new VariableSearchResult(otherType, EstimationSource.ValueOfOtherVariable, valueAssignment)
                    : null;
            }
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
     * Searches for a previously hinted param with the same name.
     * 
     * @param param The parameter name.
     * @param src The document text to search.
     * @returns The type hint of the found parameter or null.
     */
    public static hintOfSimilarParam(param: string, src: string): string | null {
        const m = new RegExp(`^[ \t]*def ${simpleIdentifier}\\([^)]*\\b${param}\\b: *([^),\\s]+)`, "m").exec(src);
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
        const regExp = new RegExp(" if +[^ ]+ +else( +[^ ]+) *$");

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
     * Detects if a value is imported in a document.
     * 
     * @param value The value.
     * @param src The document text to search.
     * @param considerAsImports Also search for 'import x as value' imports. 
     * @returns The imported value.
     */
    public static findImport(value: string, src: string, considerAsImports: boolean = true): string | null {

        if (value.includes(".")) {
            const s = value.split(".");
            const type = s[s.length - 1];
            const module = s.slice(0, s.length - 1).join(".");

            let match = null;

            if (s.length === 2 && module !== type) {
                match = new RegExp(
                    `^[ \t]*import +${module}|^[ \t]*from ${simpleIdentifier} import (${module})`, "m"
                ).exec(src);
                if (match) {    
                    // Return 'Object.Type' for 'from x import Object'
                    return match[1] ? `${match[1]}.${type}` : value;
                }
            }
            match = new RegExp(`^[ \t]*import +${module}|^[ \t]*from ${module} import (${type})`, "m").exec(src);
            return match ? match[1] ? match[1] : value : null;
        }
        return this.isImported(value, src, considerAsImports) ? value : null;
    }

    /**
     * Detects if a value is imported.
     */
    private static isImported(value: string, src: string, checkForAsImports: boolean = true): boolean {

        let exp = `^[ \t]*(from +${simpleIdentifier} +import +${value}`;
        if (checkForAsImports) {
            exp += `|from +${simpleIdentifier} +import +${simpleIdentifier} +as +${value}`;
        }
        exp += ")";
        return new RegExp(exp,"m").test(src);
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