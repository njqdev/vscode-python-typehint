import { TextDocument } from "vscode";
import { PythonType as PythonType, DataTypeContainer, getDataTypeContainer } from "./python";
import { TypeSearch, VariableSearchResult } from "./typeSearch";
import { TypingHintProvider } from "./typingHintProvider";
import { WorkspaceSearcher } from "./workspaceSearcher";
import { TypeHint, labelFor } from "./typeHint";
import { TypeHintSettings } from "./settings";

/**
 * Provides type hints.
 */
export class TypeHintProvider {
    
    private likelyTypes: PythonType[] = [
        PythonType.String,
        PythonType.List, 
        PythonType.Dict, 
        PythonType.Bool, 
        PythonType.Int, 
        PythonType.Tuple, 
        PythonType.Float
    ];
    private typeContainer: DataTypeContainer = getDataTypeContainer();
    private typesIncludedInResult: { [key: string]: string } = {};
    private doc: TextDocument;
    private settings: TypeHintSettings;

    /**
     * Constructs a new TypeHintProvider.
     * 
     * @param doc The active document.
     */
    constructor(doc: TextDocument, settings: TypeHintSettings) {
        this.doc = doc;
        this.settings = settings;
    }

    /**
     * Provides type hints for a parameter.
     * 
     * @param param The parameter name.
     * @returns An array of type hints, ordered by estimation accuracy.
     */
    public async getTypeHints(param: string): Promise<TypeHint[]> {
        const typeHints: TypeHint[] = [];
        const documentText = this.doc.getText();

        const typingHintProvider = new TypingHintProvider(documentText, this.typeContainer);
        const typingSearch = typingHintProvider.containsTyping();

        const variableSearch = TypeSearch.variableWithSameName(param, documentText);

        const wsSearcher = new WorkspaceSearcher(this.doc.uri, this.settings);
        const workspaceSearch = wsSearcher.findHintOfSimilarParam(param, documentText);

        this.tryAdd(TypeSearch.classWithSameName(param, documentText), typeHints);
        this.tryAdd(TypeSearch.hintOfSimilarParam(param, documentText), typeHints);

        let typeName = this.getTypeParamEndsWith(param, "_");
        if (typeName) {
            this.add(typeName, typeHints);
            this.tryAddTypingHint(await typingSearch, typeName, typingHintProvider, typeHints);
            wsSearcher.cancel();
            await workspaceSearch;
            return typeHints;
        }

        const searchResult = await variableSearch;

        if (searchResult !== null && !TypeSearch.invalidTernaryOperator(searchResult)) {
            this.add(searchResult.typeName, typeHints);
            this.tryAddTypingHints(await typingSearch, searchResult, typingHintProvider, typeHints);
            this.tryAdd(this.typeGuessFor(param, typeHints), typeHints);
        } else if (typeName = this.getTypeParamEndsWith(param, "")) {
            this.add(typeName, typeHints);
            this.tryAddTypingHint(await typingSearch, typeName, typingHintProvider, typeHints);
        } else {
            this.tryAdd(this.typeGuessFor(param, typeHints), typeHints);
        }

        this.tryAdd(await workspaceSearch, typeHints);
        return typeHints;
    }
    
    /**
     * Gets types that have not been provided as hints.
     * 
     * @returns An array of types.
     */
    public getRemainingTypes(): PythonType[] {
        const result: PythonType[] = [];

        for (const type of Object.values(this.typeContainer)) {
            if (this.typeNotIncluded(type.name)) {
                result.push(type.name);
            }
        }
        return result;
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

    private typeGuessFor(param: string, typeHints: TypeHint[]): string | null {
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
    
    private tryAddTypingHints(
        typingFound: boolean,
        searchResult: VariableSearchResult | null,
        typingHintProvider: TypingHintProvider,
        typeHints: TypeHint[]
    ) {
        if (typingFound) {
            const hints: TypeHint[] | null = typingHintProvider.getTypingHints(searchResult);
            if (hints) {
                for (const hint of hints) {
                    this.addTypeHint(hint, typeHints);
                }
            }
        }
    }

    private tryAddTypingHint(
        typingFound: boolean,
        typeName: string,
        typingHintProvider: TypingHintProvider,
        typeHints: TypeHint[]
    ) {
        if (typingFound) {
            const typingHint = typingHintProvider.getTypingHint(typeName);
            if (typingHint) {
                this.addTypeHint(typingHint, typeHints);
            }
        }
    }

    private typeNotIncluded(type: string): boolean {
        return !(type in this.typesIncludedInResult);
    }

    private add(type: string, typeHints: TypeHint[]) {
        if (this.typeNotIncluded(type)) {
            typeHints.push({ label: labelFor(type) });
            this.typesIncludedInResult[type] = type;
        }
    }
    
    private addTypeHint(hint: TypeHint, typeHints: TypeHint[]) {
        if (this.typeNotIncluded(hint.label)) {
            typeHints.push(hint);
            this.typesIncludedInResult[hint.label] = hint.label;
        }
    }

    private tryAdd(type: string | null, typeHints: TypeHint[]) {
        if (type) {
            this.add(type, typeHints);
        }
    }
}