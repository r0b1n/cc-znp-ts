import { CcZnpStream } from "./CcZnpStream";
import { asHex, getCmdType, printPacketData } from "./untils";
import { EventEmitter } from "events";
import { CcZnpCommandType } from "./types";

class CcZnpCall {
    private readonly subSystem: number;
    private readonly cmd: number;
    private readonly data: number[];
    private resolve: (value?: Buffer) => void = null;
    private reject: (reason?: any) => void = null;

    constructor(subSystem: number, cmd: number, data?: number[]) {
        this.subSystem = subSystem;
        this.cmd = cmd;
        this.data = data || [];
    }

    getPromise() {
        return new Promise<Buffer>((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    isAsync() {
        return getCmdType(this.subSystem) === CcZnpCommandType.AREQ;
    }

    getPayload() {
        return new Buffer([this.subSystem, this.cmd, ...this.data]);
    }

    processResult(data?: Buffer) {
        this.resolve(data ? data.slice(2) : undefined);
    }

    processTimeout() {
        this.reject(`Got timeout in ${asHex(this.subSystem)} ${asHex(this.cmd)}`);
    }
}

export class CcZnpDevice extends EventEmitter {
    private readonly path: string;
    private stream: CcZnpStream = null;
    private _lock: boolean = false;
    private ongoingCommand: CcZnpCall = null;
    private ongoingCommandTimeout: NodeJS.Timeout = null;
    private txQueue: CcZnpCall[] = [];

    constructor(path: string) {
        super();
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

            this.stream.on("data", data => this.handleIncomingPacket(data));
        });
    }

    request(subSystem: number, cmd: number, data?: number[]): Promise<Buffer> {
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

    private handleIncomingPacket(data: Buffer) {
        printPacketData(data);
        const cmdType = getCmdType(data.readUInt8(0));

        if (cmdType === CcZnpCommandType.SRSP) {
            this.ongoingCommand.processResult(data);
            clearTimeout(this.ongoingCommandTimeout);
            this.ongoingCommandTimeout = null;
            this.ongoingCommand = null;
            this.unlock();
            this.nextTx();
            return;
        }

        this.emit(this.generateAsyncTopic(data), data.slice(2));
        return;
    }

    private generateAsyncTopic(data: Buffer) {
        const subSystem = asHex(data.readUInt8(0));
        const command = asHex(data.readUInt8(1));

        return `AREQ:${subSystem}:${command}`;
    }

    private send(payload: Buffer) {
        this.stream.write(payload);
    }

    private nextTx() {
        if (this._lock || this.txQueue.length === 0) {
            return;
        }

        this.lock();

        const command = this.txQueue.shift();
        this.send(command.getPayload());

        if (command.isAsync()) {
            setImmediate(() => {
                command.processResult(null);

                this.unlock();
                this.nextTx();
            });
            return;
        }

        this.ongoingCommand = command;

        this.ongoingCommandTimeout = setTimeout(() => {
            this.ongoingCommand.processTimeout();
            this.ongoingCommandTimeout = null;
            this.ongoingCommand = null;
            this.unlock();
            this.nextTx();
        }, 5000);
    }
}
