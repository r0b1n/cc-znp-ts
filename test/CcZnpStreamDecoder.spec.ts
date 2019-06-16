import { CcZnpStreamDecoder } from "../src/CcZnpStreamDecoder";

describe("CcZnpStreamDecoder", () => {
    let decoder: CcZnpStreamDecoder;

    beforeEach(() => {
        decoder = new CcZnpStreamDecoder();
    });

    it("emits package", done => {
        decoder.once("data", data => {
            expect(data).toEqual(new Buffer([0xca, 0xfe]));
            done();
        });

        decoder.write(new Buffer([0xfe, 0x00, 0xca, 0xfe, 0x34]));
    });

    it("emits package with data", done => {
        decoder.once("data", data => {
            expect(data).toEqual(new Buffer([0xbe, 0xef, 0xc0, 0x01]));
            done();
        });

        decoder.write(new Buffer([0xfe, 0x02, 0xbe, 0xef, 0xc0, 0x01, 0x92]));
    });

    it("emits packages from different buffers", done => {
        decoder.once("data", data => {
            expect(data).toEqual(new Buffer([0xa5, 0x5a]));
            decoder.once("data", data => {
                expect(data).toEqual(new Buffer([0xc0, 0xde]));
                done();
            });
        });

        decoder.write(new Buffer([0xfe, 0x00, 0xa5, 0x5a, 0xff]));
        decoder.write(new Buffer([0xfe, 0x00, 0xc0, 0xde, 0x1e]));
    });

    it("emits multiple packages from one buffer", done => {
        decoder.once("data", data => {
            expect(data).toEqual(new Buffer([0xbe, 0xef]));

            decoder.once("data", data => {
                expect(data).toEqual(new Buffer([0xde, 0xad]));
                done();
            });
        });

        decoder.write(new Buffer([0xfe, 0x00, 0xbe, 0xef, 0x51, 0xfe, 0x00, 0xde, 0xad, 0x73]));
    });

    it("emits an error on incorrect start byte and skips byte", () => {
        expect(() => {
            decoder.write(new Buffer([1, 2, 3]));
        }).toThrow("Unexpected starting byte, expecting 0xfe, got 0x01.");
    });

    it("emits an error on incorrect checksum", () => {
        expect(() => {
            decoder.write(new Buffer([0xfe, 0x00, 0x41, 0x55, 0xff]));
        }).toThrow("Invalid package checksum. Calculated: 0x14. Received: 0xff.");
    });
});
