

/**
 * A type hint to build a {@link CompletionItem} with.
 */
export interface TypeHint {
    label: string;
    insertText?: string;
}

/**
 * Get a label for a type hint.
 * 
 * @param typeName The type name to format as insertText.
 */
export function labelFor(typeName: string): string {
    return " " + typeName;
}