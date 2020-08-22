import { TextDocument } from "vscode";
import { PythonType as PythonType, DataTypeContainer, getDataTypeContainer } from "./python";
import { TypeSearch, VariableSearchResult } from "./typeSearch";
import { TypingHintProvider } from "./typingHintProvider";
import { TypeHintSettings } from "./settings";

/**
 * Provides type hints.
 */
export class TypeHintProvider {
    
    private _typingHintProvider: TypingHintProvider;

    private likelyTypes: PythonType[] = [
        PythonType.String,
        PythonType.List, 
        PythonType.Dict, 
        PythonType.Bool, 
        PythonType.Int, 
        PythonType.Tuple, 
        PythonType.Float
    ];
    private _providedTypeHints: string[] = [];
    private _typeContainer: DataTypeContainer;
    private _typingImported = false;

    constructor(typeContainer: DataTypeContainer) {
        this._typeContainer = typeContainer;
        this._typingHintProvider = new TypingHintProvider(typeContainer);
    }

    public get typingImported() {
        return this._typingImported;
    }

    /**
     * Estimates a parameter's type and returns type hints for it. 
     * The returned hints are ordered with the most likely type being first. 
     * 
     * @param param The parameter name.
     * @param documentText The text to search in order to estimate types.
     */
    public async estimateTypeHints(param: string, documentText: string): Promise<string[]> {
        const typeHints: string[] = [];

        const typingSearch = this._typingHintProvider.detectTypingImport(documentText);
        const variableSearch = TypeSearch.variableWithSameName(param, documentText);

        let typeName = this.getTypeParamEndsWith(param, "_");
        this._typingImported = await typingSearch;
        if (typeName) {
            this.add(typeName, typeHints);
            this.tryAddTypingHint(typeName, typeHints);
        }

        const typesFound = typeHints.length > 0 
            || this.tryAdd(TypeSearch.hintOfSimilarParam(param, documentText), typeHints)
            || this.tryAdd(TypeSearch.classWithSameName(param, documentText), typeHints);
        if (typesFound) {
            return typeHints;
        }

        const searchResult = await variableSearch;

        if (searchResult !== null && !TypeSearch.invalidTernaryOperator(searchResult)) {
            this.add(searchResult.typeName, typeHints);
            this.tryAddTypingHints(searchResult, typeHints);
            this.tryAdd(this.typeGuessFor(param, typeHints), typeHints);
        } else {
            typeName = this.getTypeParamEndsWith(param, "");
            if (typeName) {
                this.add(typeName, typeHints);
                this.tryAddTypingHint(typeName, typeHints);
            } else {
                this.tryAdd(this.typeGuessFor(param, typeHints), typeHints);
            }
        }
        return typeHints;
    }
    
    /**
     * Returns hints for types that have not been provided yet.
     */
    public remainingTypeHints(): PythonType[] {
        const result: PythonType[] = [];

        for (const type of Object.values(this._typeContainer)) {
            if (this.hintNotProvided(type.name)) {
                result.push(type.name);
            }
        }

        return result;
    }

    /**
     * Returns hints for the typing module that have not been provided yet.
     */
    public remainingTypingHints(): string[] {
        return this._typingHintProvider.getRemainingHints();
    }

    public hintNotProvided(typeHint: string): boolean {
        return !this._providedTypeHints.includes(typeHint);
    }

    /**
     * If the param ends with a type name, the type is returned.
     * @param param The parameter name.
     * @param prefix A prefix before the typename. For example, a param named x{prefix}list will return 'list'.
     */
    private getTypeParamEndsWith(param: string, prefix: string): PythonType | null {
        const paramUpper = param.toUpperCase();

        for (const type of this.likelyTypes) {
            if (paramUpper.endsWith(`${prefix}${type.toUpperCase()}`)) {
                return type;
            }
        }
        return null;
    }

    private typeGuessFor(param: string, typeHints: string[]): string | null {
        const typeGuesses: { [key: string]: string } = {
            "string": PythonType.String,
            "text": PythonType.String,
            "path": PythonType.String,
            "url": PythonType.String,
            "uri": PythonType.String,
            "fullpath": PythonType.String,
            "full_path": PythonType.String,
            "number": PythonType.Int,
            "num": PythonType.Int
        };
        if (param in typeGuesses) {
            this.add(typeGuesses[param], typeHints);
            return typeGuesses[param];
        }
        return null;
    }


    private add(type: string, typeHints: string[]) {
        type = type.trim();
        if (this.hintNotProvided(type)) {
            typeHints.push(type);
            this._providedTypeHints.push(type);
        }
    }

    private tryAdd(type: string | null, typeHints: string[]): boolean {
        if (type) {
            this.add(type, typeHints);
            return true;
        }
        return false;
    }
    
    private tryAddTypingHints(searchResult: VariableSearchResult | null, typeHints: string[]) {
        if (this._typingImported) {
            const hints: string[] | null = this._typingHintProvider.getHints(searchResult);
            if (hints) {
                for (const hint of hints) {
                    this.add(hint, typeHints);
                }
            }
        }
    }

    private tryAddTypingHint(typeName: string, typeHints: string[]) {
        if (this._typingImported) {
            const typingHint = this._typingHintProvider.getHint(typeName);
            if (typingHint) {
                this.add(typingHint, typeHints);
            }
        }
    }
}