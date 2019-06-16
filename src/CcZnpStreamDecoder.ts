import { Transform, TransformCallback } from "stream";
import { asHex } from "./untils";

// frame format
//
// 0xFE | LENGTH | DATA | CHECKSUM

enum State {
    Ready,
    WaitingForLength,
    WaitingForData,
    WaitingForChecksum
}

const SOF = 0xfe; // start of frame magic byte

export class CcZnpStreamDecoder extends Transform {
    private frame: Buffer;
    private status = State.Ready;
    private checksum = 0;
    private bytesReceived = 0;
    private bytesExpected = 0;

    _transform(buffer: Buffer, _: string, cb: TransformCallback): void {
        buffer.forEach((byte: number) => {
            switch (this.status) {
                case State.Ready:
                    if (byte !== SOF) {
                        this.emit(
                            "error",
                            new Error(`Unexpected starting byte, expecting ${asHex(SOF)}, got ${asHex(byte)}.`)
                        );
                    } else {
                        this.status = State.WaitingForLength;
                    }
                    break;
                case State.WaitingForLength:
                    this.bytesExpected = byte + 2; // data + 2 bytes of command ids
                    this.checksum = byte;
                    this.bytesReceived = 0;
                    this.frame = new Buffer(this.bytesExpected);
                    this.status = State.WaitingForData;
                    break;
                case State.WaitingForData:
                    this.checksum ^= byte;
                    this.frame.writeUInt8(byte, this.bytesReceived++);
                    if (this.bytesReceived === this.bytesExpected) {
                        this.status = State.WaitingForChecksum;
                    }
                    break;
                case State.WaitingForChecksum:
                    if (byte === this.checksum) {
                        this.push(this.frame);
                    } else {
                        this.emit(
                            "error",
                            new Error(
                                `Invalid package checksum. Calculated: ${asHex(this.checksum)}. Received: ${asHex(
                                    byte
                                )}.`
                            )
                        );
                    }
                    this.status = State.Ready;
                    this.frame = null;
                    break;
            }
        });
        cb();
    }
}
