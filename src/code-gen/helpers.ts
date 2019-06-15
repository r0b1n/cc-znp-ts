import * as ts from "typescript";
import { BUFFER_VAR_NAME, STRUCTURE_VAR_NAME } from "./types";
import * as fs from "fs";

export function nodeText(n: ts.Node): string {
    const resultFile = ts.createSourceFile("test.ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed
    });
    const result = printer.printNode(ts.EmitHint.Unspecified, n, resultFile);
    return result;
}

export const writeToFile = (fileName: string, n: ts.Statement[]) => {
    const resultFile = ts.createSourceFile("test.ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed
    });

    resultFile.statements = ts.createNodeArray(n);

    const result = printer.printFile(resultFile);

    fs.writeFileSync(fileName, result);
};

export const id = (name: string) => ts.createIdentifier(name);
export const incOffset = (len: number) =>
    ts.createExpressionStatement(
        ts.createBinary(
            id("offset"),
            ts.createToken(ts.SyntaxKind.FirstCompoundAssignment),
            ts.createNumericLiteral(len.toString())
        )
    );
export const offsetWithShift = (offset: number) =>
    ts.createBinary(
        ts.createIdentifier("offset"),
        ts.createToken(ts.SyntaxKind.PlusToken),
        ts.createNumericLiteral(offset.toString())
    );
export const callBufferMethod = (method: string, params: ts.Expression[]) =>
    ts.createCall(ts.createPropertyAccess(id(BUFFER_VAR_NAME), id(method)), undefined, params);

export const accessStruct = (field: string) => ts.createPropertyAccess(id(STRUCTURE_VAR_NAME), id(field));

export const formatByteAsHex = (source: ts.Expression) =>
    ts.createCall(
        ts.createPropertyAccess(
            ts.createCall(ts.createPropertyAccess(source, id("toString")), undefined, [ts.createNumericLiteral("16")]),
            id("padStart")
        ),
        undefined,
        [ts.createNumericLiteral("2"), ts.createStringLiteral("0")]
    );

export const plus = (left: ts.Expression, right: ts.Expression) =>
    ts.createBinary(left, ts.SyntaxKind.PlusToken, right);
