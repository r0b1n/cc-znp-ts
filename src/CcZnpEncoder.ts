import { Transform } from "stream";

const SOF = 0xfe; // start of frame magic byte

export class CcZnpEncoder extends Transform {
    static calculateChecksum(len, frame) {
        return len ^ frame.reduce((a, b) => a ^ b);
    }

    _transform(data: Buffer, _, cb) {
        const frame = new Buffer(data.length + 3); // buffer size = SOF + length + checksum

        const dataLen = data.length - 2;

        // SOF
        frame.writeUInt8(SOF, 0);

        // data len (excluding 2 bytes for subsystem and command)
        frame.writeUInt8(dataLen, 1);

        // subsystem + cmd + data bytes
        data.copy(frame, 2);

        // checksum
        frame.writeUInt8(CcZnpEncoder.calculateChecksum(dataLen, data), dataLen + 4); // checksum

        this.push(frame);
        cb();
    }
}
