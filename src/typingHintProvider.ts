import { DataType, TypeCategory, PythonType, DataTypeContainer } from "./python";
import { capitalized } from "./utils";
import { TypeHint, labelFor } from "./typeHint";
import { VariableSearchResult, TypeSearch } from "./typeSearch";

/**
 * Provides type hints for the Python typing module.
 */
export class TypingHintProvider {

    private docText: string;
    private typeContainer: DataTypeContainer;
    private fromTypingImport: boolean = false;
    private typingPrefix: string = "typing";
    private typingImports: string[] = [];

    /**
     * Constructs a new TypingHintProvider.
     * 
     * @param docText The document text to search.
     */
    constructor(docText: string, typeContainer: DataTypeContainer) {
        this.docText = docText;
        this.typeContainer = typeContainer;
    }

    /**
     * Determines if this object's document contains a typing import.
     */
    public async containsTyping(): Promise<boolean> {
        let m = new RegExp(
            `^[ \t]*from typing import +([A-Z][a-zA-Z0-9 ,]+)`,
            "m"
        ).exec(this.docText);
        
        if (m) {
            this.fromTypingImport = true;
            const typings = m[1].split(",");
            typings.forEach(t => {
                this.typingImports.push(t.trim());
            });
            return true;
        } else {
            m = new RegExp(
                `^[ \t]*(import +typing +as +([a-zA-Z_][a-zA-Z0-9_-]+)|import +typing)`,
                "m"
            ).exec(this.docText);
            if (m) {
                if (m[2]) {
                    this.typingPrefix = m[3];
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Get a hint for a built-in type if typing is imported.
     * 
     * @param type A type name.
     * @returns A type hint without a closing bracket, for example 'List[ '.
     */
    public getTypingHint(typeName: string): TypeHint | null {
        const type = this.typeContainer[typeName];
        if (type.category === TypeCategory.Collection) {
            return this.createHint(type.name);
        }
        return null;
    }

    /**
     * Get hints if typing is imported.
     * 
     * @param searchResult A search result to derive hints from.
     * @returns One or two TypeHints. For example, 'List[' and 'List[str]'.
     */
    public getTypingHints(searchResult: VariableSearchResult | null): TypeHint[] | null {
        if (searchResult && searchResult.typeName in this.typeContainer) {
            const type = this.typeContainer[searchResult.typeName];
            const result: TypeHint[] = [ this.createHint(type.name)];
            let label = result[0].label;

            if (type.category === TypeCategory.Collection) {

                // Remove [, {, etc. to detect the type of the first element
                let elementValue = searchResult.valueAssignment.trim().substr(1);
                let elementType = TypeSearch.detectType(elementValue);
                let collectionCount = 1;
                let dictElementFound = false;
                while (
                    !dictElementFound
                    && elementType
                    && elementType in this.typeContainer
                    && this.typeContainer[elementType].category === TypeCategory.Collection
                ) {
                    if (this.typeContainer[elementType].name === PythonType.Dict) {
                        dictElementFound = true;
                    }
                    label += this.typingString(elementType);
                    elementValue = elementValue.trim().substr(1);
                    elementType = TypeSearch.detectType(elementValue);
                    collectionCount++;
                }

                let addClosingBrackets = false;
                if (elementType && elementType in this.typeContainer) {
                    label += elementType;
                    // Detecting the type of dict values here isn't supported, so let the user add them
                    addClosingBrackets = !dictElementFound && type.name !== PythonType.Dict;
                }
                if (result[0].label !== label) {
                    if (addClosingBrackets) {
                        for (let i = 0; i < collectionCount; i++) {
                            label += "]";
                        }
                    }
                    result.push({ label });
                }
                return result;
            }
        }
        return null;
    }
    
    private createHint(typeName: string): TypeHint {
        return { label: labelFor(this.typingString(typeName)) };
    }

    private typingString(typeName: string): string {
        const typingName = capitalized(typeName);
        return this.fromTypingImport && this.typingImports.includes(typingName) 
            ? `${typingName}[`
            : `${this.typingPrefix}.${typingName}[`;
    }
}