import { TextDocument } from "vscode";
import { PythonType as PythonType, DataTypeContainer, getDataTypeContainer } from "./python";
import { TypeSearch, VariableSearchResult } from "./typeSearch";
import { TypingHintProvider } from "./typingHintProvider";
import { WorkspaceSearcher } from "./workspaceSearcher";
import { TypeHintSettings } from "./settings";

/**
 * Provides type hints.
 */
export class TypeHintProvider {
    
    private doc: TextDocument;
    private settings: TypeHintSettings;
    private typingHintProvider: TypingHintProvider;
    private likelyTypes: PythonType[] = [
        PythonType.String,
        PythonType.List, 
        PythonType.Dict, 
        PythonType.Bool, 
        PythonType.Int, 
        PythonType.Tuple, 
        PythonType.Float
    ];
    private providedTypeHints: string[] = [];
    private typeContainer: DataTypeContainer = getDataTypeContainer();
    private _typingImported = false;

    /**
     * Constructs a new TypeHintProvider.
     * 
     * @param doc The active document.
     * @param settings User settings.
     */
    constructor(doc: TextDocument, settings: TypeHintSettings) {
        this.doc = doc;
        this.settings = settings;
        this.typingHintProvider = new TypingHintProvider(this.typeContainer);
    }

    public get typingImported() {
        return this._typingImported;
    }

    /**
     * Estimates a parameter's type and returns type hints for it. 
     * The returned hints are ordered with the most likely type being first. 
     * 
     * @param param The parameter name.
     */
    public async getTypeHints(param: string): Promise<string[]> {
        const typeHints: string[] = [];
        const documentText = this.doc.getText();

        const typingSearch = this.typingHintProvider.detectTypingImport(documentText);

        const variableSearch = TypeSearch.variableWithSameName(param, documentText);

        const wsSearcher = new WorkspaceSearcher(this.doc.uri, this.settings);
        const workspaceSearch = wsSearcher.findHintOfSimilarParam(param, documentText);

        this.tryAdd(TypeSearch.classWithSameName(param, documentText), typeHints);
        this.tryAdd(TypeSearch.hintOfSimilarParam(param, documentText), typeHints);

        let typeName = this.getTypeParamEndsWith(param, "_");
        if (typeName) {
            this.add(typeName, typeHints);
            this.tryAddTypingHint(await typingSearch, typeName, typeHints);
            wsSearcher.cancel();
            await workspaceSearch;
            return typeHints;
        }

        const searchResult = await variableSearch;

        if (searchResult !== null && !TypeSearch.invalidTernaryOperator(searchResult)) {
            this.add(searchResult.typeName, typeHints);
            this.tryAddTypingHints(await typingSearch, searchResult, typeHints);
            this.tryAdd(this.typeGuessFor(param, typeHints), typeHints);
        } else {
            typeName = this.getTypeParamEndsWith(param, "");
            if (typeName) {
                this.add(typeName, typeHints);
                this.tryAddTypingHint(await typingSearch, typeName, typeHints);
            } else {
                this.tryAdd(this.typeGuessFor(param, typeHints), typeHints);
            }
        } 

        this.tryAdd(await workspaceSearch, typeHints);
        return typeHints;
    }
    
    /**
     * Returns hints for types that have not been provided yet.
     */
    public remainingTypeHints(): PythonType[] {
        const result: PythonType[] = [];

        for (const type of Object.values(this.typeContainer)) {
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
        return this.typingHintProvider.getRemainingHints();
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
            this.providedTypeHints.push(type);
        }
    }
            
    private hintNotProvided(type: string): boolean {
        return !this.providedTypeHints.includes(type);
    }

    private tryAdd(type: string | null, typeHints: string[]) {
        if (type) {
            this.add(type, typeHints);
        }
    }
    
    private tryAddTypingHints(
        typingFound: boolean,
        searchResult: VariableSearchResult | null,
        typeHints: string[]
    ) {
        if (typingFound) {
            const hints: string[] | null = this.typingHintProvider.getHints(searchResult);
            if (hints) {
                for (const hint of hints) {
                    this.add(hint, typeHints);
                }
            }
        }
    }

    private tryAddTypingHint(typingImported: boolean, typeName: string, typeHints: string[]) {
        this._typingImported = typingImported;
        if (typingImported) {
            const typingHint = this.typingHintProvider.getHint(typeName);
            if (typingHint) {
                this.add(typingHint, typeHints);
            }
        }
    }
}