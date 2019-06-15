import { Transform } from "stream";

// frame format
//
// 0xFE | LENGTH | DATA | CHECKSUM

enum ParserStatus {
    Ready,
    WaitingForLength,
    WaitingForData,
    WaitingForChecksum
}

const SOF = 0xfe; // start of frame magic byte

export class CcZnpParser extends Transform {
    private frame;
    private status = ParserStatus.Ready;
    private checksum = 0;
    private bytesReceived = 0;
    private bytesExpected = 0;

    _transform(buffer, _, cb) {
        buffer.forEach(byte => {
            switch (this.status) {
                case ParserStatus.Ready:
                    if (byte !== SOF) {
                        throw new Error(`Unexpected byte, expecting ${SOF}`);
                    } else {
                        this.status = ParserStatus.WaitingForLength;
                    }
                    break;
                case ParserStatus.WaitingForLength:
                    this.bytesExpected = byte + 2; // data + 2 bytes of command ids
                    this.checksum = byte;
                    this.bytesReceived = 0;
                    this.frame = new Buffer(this.bytesExpected);
                    this.status = ParserStatus.WaitingForData;
                    break;
                case ParserStatus.WaitingForData:
                    this.checksum ^= byte;
                    this.frame.writeUInt8(byte, this.bytesReceived++);
                    if (this.bytesReceived === this.bytesExpected) {
                        this.status = ParserStatus.WaitingForChecksum;
                    }
                    break;
                case ParserStatus.WaitingForChecksum:
                    if (byte === this.checksum) {
                        this.push(this.frame);
                    } else {
                        throw new Error(
                            `Invalid package checksum. Calculated: ${this.checksum.toString(
                                16
                            )}. Received: ${byte.toString(16)}`
                        );
                    }
                    this.status = ParserStatus.Ready;
                    this.frame = null;
                    break;
            }
        });
        cb();
    }
}
