import { TextDocument } from "vscode";
import { PythonType as PythonType, DataTypeContainer, getDataTypeContainer } from "./python";
import { TypeSearch } from "./typeSearch";
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
        const documentText = this.doc.getText();
        const typeHints: TypeHint[] = [];

        const typingHintProvider = new TypingHintProvider(documentText);
        const typingSearch = typingHintProvider.containsTyping();

        const variableSearch = TypeSearch.variableWithSameName(param, documentText);

        const wsSearcher = new WorkspaceSearcher(this.doc.uri, this.settings);
        const wsSearch = wsSearcher.findHintOfSimilarParam(param, documentText);

        this.addIfNotNull(TypeSearch.classWithSameName(param, documentText), typeHints);
        this.addIfNotNull(TypeSearch.hintOfSimilarParam(param, documentText), typeHints);

        let typeName = this.getTypeWithinParam(param, "_");
        if (typeName) {
            this.add(typeName, typeHints);
            this.tryAddTypingHint(await typingSearch, typeName, typingHintProvider, typeHints);
            wsSearcher.stopSearches();
            return typeHints;
        }

        const searchResult = await variableSearch;

        if (searchResult !== null && !TypeSearch.invalidTernaryOperator(searchResult)) {
            this.add(searchResult.typeName, typeHints);
            this.tryAddTypingHint(await typingSearch, searchResult.typeName, typingHintProvider, typeHints);
        } else {
            this.addIfNotNull(this.getTypeWithinParam(param, ""), typeHints);
        }

        this.addIfNotNull(this.typeGuessFor(param, typeHints), typeHints);
        this.addIfNotNull(await wsSearch, typeHints);
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
    private getTypeWithinParam(param: string, prefix: string): PythonType | null {
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
    
    private tryAddTypingHint(
        typingImported: boolean,
        typeName: string,
        typingHintProvider: TypingHintProvider,
        typeHints: TypeHint[]
    ): boolean {
        if (typingImported && typeName in this.typeContainer) {
            this.addTypeHintIfNotNull(typingHintProvider.getTypingHint(this.typeContainer[typeName]), typeHints);
            return true;
        }
        return false;
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
    
    private addTypeHintIfNotNull(hint: TypeHint | null, typeHints: TypeHint[]) {
        if (hint && this.typeNotIncluded(hint.label)) {
            typeHints.push(hint);
            this.typesIncludedInResult[hint.label] = hint.label;
        }
    }

    private addIfNotNull(type: string | null, typeHints: TypeHint[]) {
        if (type) {
            this.add(type, typeHints);
        }
    }
}