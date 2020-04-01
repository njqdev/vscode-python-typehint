
export const anyTypeName: string = "[a-zA-Z_][a-zA-Z0-9_.]*";

export const paramHintTrigger: string = ":";
export const returnHintTrigger: string = ">";


export class DataType {
    name: Types;
    category: TypeCategory;

    constructor(name: Types, category: TypeCategory) {
        this.name = name;
        this.category = category;
    }
}

export interface DataTypes {
     [key: string]: DataType 
};

export const getDataTypes = (): DataTypes => {
    return {
        bool: new DataType(Types.Bool, typeCategories.bool),
        complex: new DataType(Types.Complex, typeCategories.complex),
        dict: new DataType(Types.Dict, typeCategories.dict),
        float: new DataType(Types.Float, typeCategories.float),
        int: new DataType(Types.Int, typeCategories.int),
        list: new DataType(Types.List, typeCategories.list),
        object: new DataType(Types.Object, typeCategories.object),
        set: new DataType(Types.Set, typeCategories.set),
        str: new DataType(Types.String, typeCategories.string),
        tuple: new DataType(Types.Tuple, typeCategories.tuple)
    };
};

/**
 * Names of built-in Python types which can be hinted. 
 */
export enum Types {
    Bool = "bool",
    Complex = "complex",
    Dict = "dict",
    Float = "float",
    Int = "int",
    List = "list",
    Object = "object",
    Set = "set",
    String = "str",
    Tuple = "tuple",
}

/**
 * Categories of Python types.
 */
export enum TypeCategory {
    Abstract,
    Basic,
    Collection
}

/**
 * Type name keys with Type values. 
 */
const typeCategories: { [key: string]: TypeCategory } = {
    bool: TypeCategory.Basic,
    complex: TypeCategory.Basic,
    dict: TypeCategory.Collection,
    float: TypeCategory.Basic,
    int: TypeCategory.Basic,
    list: TypeCategory.Collection,
    object: TypeCategory.Abstract,
    set: TypeCategory.Collection,
    string: TypeCategory.Basic,
    tuple: TypeCategory.Collection
};
