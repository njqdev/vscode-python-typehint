import { anyTypeName as anyClassOrFunctionName, TypeName, Initialization, TypeCategory } from "./python";

/**
 * The source of a type estimation.
 */
export enum EstimationSource { 
    ClassDefinition,
    Value,
    ValueOfOtherObject
}

/**
 * The result of a type search.
 */
export class TypeSearchResult {
    public typeName: string;
    public estimationSource: EstimationSource;

    constructor(typeName: string, estimationSource: EstimationSource) {
        this.typeName = typeName;
        this.estimationSource = estimationSource;
    }

}

export class CodeSearch {

    /**
     * Detects the type of an initialized variable.
     * 
     * @param lineText The line of code to detect a type for.
     * @param documentText The source code of the text document.
     * @returns The type or null if not found.
     */
    public static async detectType(lineText: string, documentText: string): Promise<TypeSearchResult | null> {

        let detectBasicType = this.detectBasicType(lineText);
        const valueMatch = this.matchNonValueAssignment(lineText, "\\(?");

        let typeName = await detectBasicType;
        if (typeName) {
            return new TypeSearchResult(typeName, EstimationSource.Value);
        }
        if (!valueMatch) {
            return null;
        }

        if (valueMatch[0].endsWith("(")) {
            
            if (this.classWithSameName(valueMatch[1], documentText)) {
                return new TypeSearchResult(valueMatch[1], EstimationSource.ClassDefinition);
            }

            if (this.isProbablyAClass(valueMatch[1])) {
                const regExp = new RegExp(`^[ \t]*def ${valueMatch[1]}\\(`, "m" );
                if (!regExp.test(documentText)) {
                    return new TypeSearchResult(valueMatch[1], EstimationSource.Value);
                }
            } else {
                // Find the function definition and check if the return type is hinted
                const regExp = new RegExp(`^[ \t]*def ${valueMatch[1]}\\([^)]*\\) *-> *(${anyClassOrFunctionName})`, "m");

                const hintedCallMatch = regExp.exec(documentText);

                if (hintedCallMatch) {
                    if (hintedCallMatch.length === 2 && this.isType(hintedCallMatch[1])) {
                        return new TypeSearchResult(hintedCallMatch[1], EstimationSource.Value);
                    }
                }
            }
            return null;
        }

        // Searching the import source document is not supported (yet?)
        if (!this.isImported(valueMatch[1], documentText.substr(valueMatch.index - valueMatch.length))) {
            
            let objectMatch = new RegExp(`^[ \t]*${valueMatch[1]} *=.*`, "m").exec(documentText);
            if (objectMatch) {
                const otherType = await this.detectBasicType(objectMatch[0]);
                return Promise.resolve(
                    otherType ? new TypeSearchResult(otherType, EstimationSource.ValueOfOtherObject) : null
                );
            }
        }
        return Promise.resolve(null);
    }

    /**
     * Tests if code contains a terinary operator that
     *  might return a type other than the type of the search result.
     * 
     * @param lineSrc A line of code.
     * @param searchResult The search result.
     */
    public static async invalidTernaryOperator(lineSrc: string, searchResult: TypeSearchResult): Promise<boolean> {

        if (searchResult.estimationSource === EstimationSource.ClassDefinition) {
            return false;
        }
        const regExp = new RegExp(" if +[^ ]+ +else( +[^ ]+) *$", "m");

        let ternaryMatch = regExp.exec(lineSrc);
        while (ternaryMatch) {
            const elseVar = ternaryMatch[1].trim();
            let elseTypeName = await this.detectBasicType(elseVar, false);
            
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
     * Searches for a class with the same name as object and returns the name if found.
     * 
     * @param object The object.
     * @param documentText The text to search
     */
    public static classWithSameName(object: string, documentText: string): string | null {
        const clsMatch = new RegExp(`^ *class +(${object})[(:]`, "mi").exec(documentText);
        return clsMatch ? clsMatch[1] : null;
    }

    /**
     * Detects the type of an initialized variable.
     * 
     * @param src The line of code or value to detect a type for.
     * @param srcIsLineOfCode Determine the type from a line of code.
     */
    private static async detectBasicType(src: string, srcIsLineOfCode = true): Promise<string | null> {
        const typeSearchOrder = [
            TypeName.List, 
            TypeName.Bool,
            TypeName.Complex,
            TypeName.Float,
            TypeName.String,   
            TypeName.Tuple,
            TypeName.Set,
            TypeName.Dict,
            TypeName.Int,
            TypeName.Object
        ];
        for (const typeName of typeSearchOrder) {
            let r = this.typeSearchRegExp(typeName, srcIsLineOfCode ? "= *" : "");
            if (r.test(src)) {
                return typeName;
            }
        }
        return null;
    }

    /**
     * Returns a match for if a variable is initialized with a function call, an object or another variable.
     */
    private static matchNonValueAssignment(lineText: string, patternSuffix: string): RegExpExecArray | null {
        return new RegExp(`= *(${anyClassOrFunctionName})${patternSuffix}`).exec(lineText);
    }

    private static isImported(object: string, documentText: string): boolean {
        return new RegExp(
            `^[ \t]*(import +${object}|from +[a-zA-Z_][a-zA-Z0-9_-]* +import +${object}|import +${anyClassOrFunctionName} +as +${object})`,
            "m"
        ).test(documentText);
    }

    private static isProbablyAClass(lineText: string): boolean {
        return new RegExp(`^([a-zA-Z0-9_]+\\.)*[A-Z]`, "m").test(lineText);
    }

    private static isType(text: string): boolean {
        return Object.values(TypeName).includes(text as TypeName);
    }

    /**
     * Get a new RegExp for finding basic types and {@class object}.
     * 
     * @param typeName the type name
     * @param prefix a prefix added to the RegExp pattern
     */
    private static typeSearchRegExp(typeName: string, prefix: string): RegExp {
        switch (typeName) {
            case TypeName.List:
                return new RegExp(`${prefix}(\\[|list\\()`, "m");
            case TypeName.Bool:
                return new RegExp(`${prefix}(True|False|bool\\()`, "m");
            case TypeName.Complex:
                return new RegExp(`${prefix}(\\(complex\\(|[[0-9+*\\/ -.]*[0-9][jJ])`, "m");
            case TypeName.Float:
                return new RegExp(`${prefix}(-*[0-9+*\/ -]*\\.[0-9]|float\\()`, "m");
            case TypeName.Tuple:
                return new RegExp(`${prefix}(\\(|tuple\\()`, "m"); 
            case TypeName.String:
                return new RegExp(`${prefix}(['\"]{3}|(\\( *)?\"[^\"]*\"(?! *,)|(\\( *)?'[^']*'(?! *,)|str\\()`, "m");
            case TypeName.Set:
                return new RegExp(`${prefix}({[^:]+[,}]|set\\()`, "m");
            case TypeName.Dict:
                return new RegExp(`${prefix}({|dict\\()`, "m");
            case TypeName.Int:
                return new RegExp(`${prefix}(-*[0-9]|int\\()`, "m");
            case TypeName.Object:
                return new RegExp(`${prefix}object\\(`, "m");        
            default:
                return new RegExp(`^.*$`, "m");
        }
    }
}