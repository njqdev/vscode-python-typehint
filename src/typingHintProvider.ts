import { TypeCategory, PythonType, DataTypeContainer, DataType } from "./python";
import { capitalized } from "./utils";
import { VariableSearchResult, TypeSearch } from "./typeSearch";

/**
 * Provides type hints for the Python typing module.
 */
export class TypingHintProvider {

    private collectionTypes: DataType[];
    private typeContainer: DataTypeContainer;
    private typingImportDetected: boolean = false;
    private fromTypingImport: boolean = false;
    private providedTypes: DataType[] = [];
    private typingPrefix: string = "typing";

    /**
     * Constructs a new TypingHintProvider.
     * 
     * @param typeContainer A container with built-in Python types.
     */
    constructor(typeContainer: DataTypeContainer) {
        this.typeContainer = typeContainer;
        this.collectionTypes = Object.values(typeContainer).filter(t => t.category === TypeCategory.Collection);
    }

    /**
     * Determines if a document contains a typing import.
     * 
     * @param docText The document text to search.
     * @returns True if typing is imported.
     */
    public detectTypingImport(docText: string): boolean {
        if (/^[ \t]*from typing import +([A-Z][a-zA-Z0-9 ,]+)/m.exec(docText)) {
            this.fromTypingImport = true;
            this.typingImportDetected = true;
        } else {
            const match = /^[ \t]*(import +typing +as +([a-zA-Z_][a-zA-Z0-9_-]*)|import +typing)/m.exec(docText);
            if (match) {
                if (match[2]) {
                    this.typingPrefix = match[2];
                }
                this.typingImportDetected = true;
            }
        }
        return this.typingImportDetected;
    }

    /**
     * Get a hint for a built-in type if typing is imported.
     * 
     * @param type A type name.
     * @returns A type hint without a closing bracket, for example 'List[ '.
     */
    public getHint(typeName: string): string | null {
        const type = this.typeContainer[typeName];
        if (type.category === TypeCategory.Collection) {
            this.providedTypes.push(type);
            return this.toTypingString(type.name, this.fromTypingImport);
        }
        return null;
    }

    /**
     * Get hints if typing is imported.
     * 
     * @param searchResult A search result to derive hints from.
     * @returns One or two type hints. For example, 'List[' and 'List[str]'.
     */
    public getHints(searchResult: VariableSearchResult | null): string[] | null {

        if (searchResult && searchResult.typeName in this.typeContainer) {
            const type = this.typeContainer[searchResult.typeName];
            this.providedTypes.push(type);

            const result: string[] = [ this.toTypingString(type.name, this.fromTypingImport) ];
            let label = result[0];

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
                    label += this.toTypingString(elementType, this.fromTypingImport);
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
                if (result[0] !== label) {
                    if (addClosingBrackets) {
                        for (let i = 0; i < collectionCount; i++) {
                            label += "]";
                        }
                    }
                    result.push(label);
                }
                return result;
            }
        }
        return null;
    }

    /**
     * Get hints for collection types that have not been provided yet.
     * 
     * @returns An array of types.
     */
    public getRemainingHints(): string[] {
        if (!this.typingImportDetected) {
            return this.hintsForAllCollectionTypes();
        }
        const result: string[] = [];
        for (const type of this.collectionTypes) {
            if (!this.providedTypes.includes(type)) {
                result.push(this.toTypingString(type.name, this.fromTypingImport));
            }
        }
        return result;
    }

    private hintsForAllCollectionTypes(): string[] {
        const firstHalf: string[] = [];
        const secondHalf: string[] = [];
        for (const type of this.collectionTypes) {
            if (!this.providedTypes.includes(type)) {
                const withoutPrefix = this.fromTypingImport || !this.typingImportDetected;
                firstHalf.push(this.toTypingString(type.name, withoutPrefix));
                secondHalf.push(this.toTypingString(type.name, !withoutPrefix));
            }
        }
        return firstHalf.concat(secondHalf);
    }

    private toTypingString(typeName: string, withoutPrefix: boolean): string {
        const typingName = capitalized(typeName);
        return withoutPrefix ? `${typingName}[` : `${this.typingPrefix}.${typingName}[`;
    }
}