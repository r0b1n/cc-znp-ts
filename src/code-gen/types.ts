export type LongAddrTypeDef = "longaddr";
export type ShortAddrTypeDef = "shortaddr";
export type SimpleTypeDef = "uint8" | "uint16" | "uint32"; // todo: more

export type BufferTypeDef = ["buffer", string, SimpleTypeDef];

export type TypeDef = SimpleTypeDef | BufferTypeDef | LongAddrTypeDef | ShortAddrTypeDef;

export interface ParamDef {
    name: string;
    type: TypeDef;
}

export type ParamsListDef = ParamDef[];

export const STRUCTURE_VAR_NAME = "struct";
export const BUFFER_VAR_NAME = "buffer";
