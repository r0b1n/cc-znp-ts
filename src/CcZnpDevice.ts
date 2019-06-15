import { CcZnpStream } from "./CcZnpStream";
import { printPacketData } from "./untils";

export class CcZnpDevice {
    private readonly path: string;
    private stream: CcZnpStream;
    private _lock: Boolean = false;
    private processedCommand: CcZnpCall = null;
    private processedCommandTimeout: NodeJS.Timeout = null;
    private txQueue: CcZnpCall[] = [];

    constructor(path: string) {
        this.path = path;
    }

    connect() {
        if (this.stream) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.stream = new CcZnpStream({
                path: this.path,
                options: {
                    baudRate: 115200,
                    rtscts: true
                }
            });

            this.stream.once("open", () => {
                resolve();
            });

            this.stream.on("data", data => this.parsePacket(data));
        });
    }

    request(subSystem: number, cmd: number, data?: number[]) {
        const command = new CcZnpCall(subSystem, cmd, data);

        this.txQueue.push(command);

        this.nextTx();

        return command.getPromise();
    }

    private lock() {
        this._lock = true;
    }

    private unlock() {
        this._lock = false;
    }

    private parsePacket(data) {
        // printPacketData(data);
        this.processedCommand.processResult(data);
        clearTimeout(this.processedCommandTimeout);
        this.unlock();
        this.nextTx();
    }

    private send(payload: Buffer) {
        this.stream.write(payload);
    }

    private nextTx() {
        if (this._lock || this.txQueue.length === 0) {
            return;
        }

        this.lock();

        this.processedCommand = this.txQueue.shift();

        this.send(this.processedCommand.getPayload());

        this.processedCommandTimeout = setTimeout(() => {
            this.processedCommand.processTimeout();
            this.unlock();
            this.nextTx();
        }, 5000);
    }
}

class CcZnpCall {
    private readonly subSystem: number;
    private readonly cmd: number;
    private readonly data: number[];
    private resolve = null;
    private reject = null;

    constructor(subSystem: number, cmd: number, data?: number[]) {
        this.subSystem = subSystem;
        this.cmd = cmd;
        this.data = data || [];
    }

    getPromise() {
        return new Promise<any>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    getPayload() {
        return new Buffer([this.subSystem | 0x20, this.cmd, ...this.data]);
    }

    processResult(data: Buffer) {
        this.resolve(data.slice(2));
    }

    processTimeout() {
        this.reject(`Got timeout in ${this.subSystem} ${this.cmd}`);
    }
}
