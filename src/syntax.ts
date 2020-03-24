
export const anyTypeName: string = "[a-zA-Z_][a-zA-Z0-9_.]*";

export const typeHintCharacter: string = ":";

/**
 * Contains built-in Python types which can be hinted. 
 */
export enum Type {
    Bool = "bool",
    Complex = "complex",
    Dict = "dict",
    Float = "float",
    Int = "int",
    List = "list",
    Object = "object",
    String = "str",
    Tuple = "tuple",
}