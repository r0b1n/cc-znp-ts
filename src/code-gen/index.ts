import * as ts from "typescript";

import {
    accessStruct,
    callBufferMethod,
    formatByteAsHex,
    id,
    incOffset,
    nodeText,
    offsetWithShift,
    plus,
    writeToFile
} from "./helpers";

import { BUFFER_VAR_NAME, ParamsListDef, STRUCTURE_VAR_NAME, TypeDef } from "./types";

const readField = (field: string, func: string) =>
    ts.createExpressionStatement(ts.createAssignment(accessStruct(field), callBufferMethod(func, [id("offset")])));

const simpleReadField = (toField: string, bufferMethod: string, offset: number, needsOffset: boolean = true) => [
    readField(toField, bufferMethod),
    needsOffset ? incOffset(offset) : undefined
];

const readLongAddressField = (field: string, needsOffset: boolean = true) => [
    ts.createExpressionStatement(
        ts.createAssignment(
            accessStruct(field),
            plus(
                ts.createStringLiteral("0x"),
                plus(
                    plus(
                        plus(
                            formatByteAsHex(callBufferMethod("readUInt8", [offsetWithShift(7)])),
                            formatByteAsHex(callBufferMethod("readUInt8", [offsetWithShift(6)]))
                        ),
                        plus(
                            formatByteAsHex(callBufferMethod("readUInt8", [offsetWithShift(5)])),
                            formatByteAsHex(callBufferMethod("readUInt8", [offsetWithShift(4)]))
                        )
                    ),
                    plus(
                        plus(
                            formatByteAsHex(callBufferMethod("readUInt8", [offsetWithShift(3)])),
                            formatByteAsHex(callBufferMethod("readUInt8", [offsetWithShift(2)]))
                        ),
                        plus(
                            formatByteAsHex(callBufferMethod("readUInt8", [offsetWithShift(1)])),
                            formatByteAsHex(callBufferMethod("readUInt8", [id("offset")]))
                        )
                    )
                )
            )
        )
    ),
    needsOffset ? incOffset(8) : undefined
];

const rules = {
    uint8: (field: string, needsOffset: boolean = true) => simpleReadField(field, "readUInt8", 1, needsOffset),
    uint16: (field: string, needsOffset: boolean = true) => simpleReadField(field, "readUInt16LE", 2, needsOffset),
    uint32: (field: string, needsOffset: boolean = true) => simpleReadField(field, "readUInt32LE", 4, needsOffset),
    longaddr: readLongAddressField
};

const constructStruct = (type: string = "") =>
    ts.createVariableStatement(
        undefined,
        ts.createVariableDeclarationList(
            [
                ts.createVariableDeclaration(
                    ts.createIdentifier(STRUCTURE_VAR_NAME),
                    // ts.createTypeReferenceNode(type, undefined),
                    ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                    // undefined,
                    ts.createObjectLiteral([], false)
                )
            ],
            ts.NodeFlags.Const
        )
    );

const constructOffset = (type: string = "") =>
    ts.createVariableStatement(
        undefined,
        ts.createVariableDeclarationList(
            [ts.createVariableDeclaration(ts.createIdentifier("offset"), undefined, ts.createNumericLiteral("0"))],
            ts.NodeFlags.Let
        )
    );

const constructParsingCode = (paramsList: ParamsListDef) =>
    paramsList
        .map(({ name, type }, i) => {
            const isLastOne = paramsList.length - 1 === i;

            if (typeof type !== "string") {
                return [];
            }
            if (!rules[type]) {
                throw new Error(`Unknown parameter type '${type}'.`);
            }

            return rules[type](name, !isLastOne);
        })
        .reduce((prev, next) => [...prev, ...next], []);

export const constructParsingFunction = (name: string, paramsList: ParamsListDef) => {
    const bufferParam = ts.createParameter(
        undefined,
        undefined,
        undefined,
        id(BUFFER_VAR_NAME),
        undefined,
        ts.createTypeReferenceNode("Buffer", undefined)
    );

    return ts.createFunctionDeclaration(
        undefined,
        [ts.createToken(ts.SyntaxKind.ExportKeyword)],
        undefined,
        id(`parse${name}`),
        [],
        [bufferParam],
        ts.createTypeReferenceNode(name, undefined),

        ts.createBlock(
            [
                constructStruct(name),
                constructOffset(),
                ...constructParsingCode(paramsList),
                ts.createReturn(ts.createIdentifier(STRUCTURE_VAR_NAME))
            ].filter(s => s !== undefined)
        )
    );
};

export const constructArrowParsingFunction = (name: string, paramsList: ParamsListDef) => {
    const bufferParam = ts.createParameter(
        undefined,
        undefined,
        undefined,
        id(BUFFER_VAR_NAME),
        undefined,
        ts.createTypeReferenceNode("Buffer", undefined)
    );

    return ts.createArrowFunction(
        undefined,
        [],
        [bufferParam],
        ts.createTypeReferenceNode(name, undefined),
        ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        ts.createBlock(
            [
                constructStruct(name),
                constructOffset(),
                ...constructParsingCode(paramsList),
                ts.createReturn(ts.createIdentifier(STRUCTURE_VAR_NAME))
            ].filter(s => s !== undefined)
        )
    );
};

const unpackTypeDef = (type: TypeDef) => {
    if (typeof type === "string") {
        return [type, undefined, undefined];
    }

    return type;
};

const typesMap = {
    uint8: ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
    uint16: ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
    uint32: ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
    longaddr: ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
};

const getType = (t: any) => {
    const [type, lengthField, subtype] = unpackTypeDef(t);

    console.log(type, typesMap[type]);

    if (type === "buffer") {
        return ts.createArrayTypeNode(typesMap[subtype]);
    }

    return typesMap[type];
};

export const constructTypeInterface = (name: string, paramsList: ParamsListDef) => {
    return ts.createInterfaceDeclaration(
        undefined,
        undefined,
        id(name),
        undefined,
        undefined,
        paramsList.map(({ name, type }) =>
            ts.createPropertySignature(undefined, id(name), undefined, getType(type), undefined)
        )
    );
};

const struct: ParamsListDef = [
    {
        name: "transportRev",
        type: "uint8"
    },
    {
        name: "product",
        type: "uint8"
    },
    {
        name: "majorRel",
        type: "uint8"
    },
    {
        name: "minorRel",
        type: "uint8"
    },
    {
        name: "maintRel",
        type: "uint8"
    },
    {
        name: "revision",
        type: "uint32"
    },
    {
        name: "listHere",
        type: ["buffer", "product", "uint32"]
    }
];

// ts.createStatement(constructParsingFunction("parseMe", struct))

const name = "SYS_getVersion_RSP";

console.log(nodeText(constructParsingFunction(name, struct)));
console.log(nodeText(constructTypeInterface(name, struct)));

writeToFile("test.ts", [constructTypeInterface(name, struct), constructParsingFunction(name, struct)]);
