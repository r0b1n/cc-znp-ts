import { EventEmitter } from "events";
import * as SerialPort from "serialport";
import { CcZnpStreamDecoder } from "./CcZnpStreamDecoder";
import { CcZnpStreamEncoder } from "./CcZnpStreamEncoder";

interface SerialPortConfig {
    path: string;
    options: SerialPort.OpenOptions;
}

export class CcZnpStream extends EventEmitter {
    private readonly MAGIC_INIT_BYTE = 0xef;
    private readonly serial: SerialPort;
    private readonly decoder: CcZnpStreamDecoder;
    private readonly encoder: CcZnpStreamEncoder;

    private init: boolean = false;

    constructor(serialPortConfig: SerialPortConfig) {
        super();
        this.serial = new SerialPort(serialPortConfig.path, serialPortConfig.options);
        this.decoder = new CcZnpStreamDecoder();
        this.encoder = new CcZnpStreamEncoder();
        this.serial.pipe(this.decoder);

        // TODO: figure out why typescript doesn't allow to pass serial to the pipe
        // @ts-ignore
        this.encoder.pipe(this.serial);

        this.serial.once("open", () => {
            this.serial.write(Buffer.from([this.MAGIC_INIT_BYTE]));
            setTimeout(() => {
                this.init = true;

                this.emit("open");
            }, 1000);
        });

        this.serial.on("close", () => {
            this.emit("close");
        });

        this.serial.on("error", a => {
            this.emit("close", "connection got an error" + a);
        });

        this.decoder.on("data", data => {
            this.emit("data", data);
        });
    }

    write(data: Buffer) {
        this.encoder.write(data);
    }
}
