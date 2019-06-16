import { CcZnpStreamEncoder } from "../src/CcZnpStreamEncoder";

describe("CcZnpStreamEncoder", () => {
    let encoder: CcZnpStreamEncoder;

    beforeEach(() => {
        encoder = new CcZnpStreamEncoder();
    });

    it("constructs correct packet out of data", done => {
        encoder.once("data", data => {
            expect(data).toEqual(new Buffer([0xfe, 0x00, 0xc0, 0x01, 0xc1]));
            done();
        });

        encoder.write(new Buffer([0xc0, 0x01]));
    });
});
