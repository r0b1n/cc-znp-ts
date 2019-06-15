import { CcZnpDevice } from "./src/CcZnpDevice";
import { CcZnpSubSystem, SYSCommand, UTILCommand } from "./some-types";

(async () => {
    const znpDevice = new CcZnpDevice("/dev/tty.usbmodem14101");

    console.log("Connecting to the device...");
    await znpDevice.connect();
    console.log("Connection opened!");

    await ping(znpDevice);
    await getVersion(znpDevice);

    console.log("Ok, lets start the disco!");
    startDisco(znpDevice);
})();

// =========== helpers ===================
const deviceCapabilities = (field: number) => ({
    MT_CAP_SYS: !!(field & 0x0001),
    MT_CAP_MAC: !!(field & 0x0002),
    MT_CAP_NWK: !!(field & 0x0004),
    MT_CAP_AF: !!(field & 0x0008),
    MT_CAP_ZDO: !!(field & 0x0010),
    MT_CAP_SAPI: !!(field & 0x0020),
    MT_CAP_UTIL: !!(field & 0x0040),
    MT_CAP_DEBUG: !!(field & 0x0080),
    MT_CAP_APP: !!(field & 0x0100),
    MT_CAP_ZOAD: !!(field & 0x1000)
});

const ping = async (device: CcZnpDevice) => {
    try {
        const data = await device.request(CcZnpSubSystem.SYS, SYSCommand.ping);
        console.log("Device capabilities are:");
        console.log(deviceCapabilities(data.readUInt16LE(0)));
    } catch (e) {
        console.log(e);
    }
};

const getVersion = async (device: CcZnpDevice) => {
    try {
        const data = await device.request(CcZnpSubSystem.SYS, SYSCommand.version);
        console.log("Device version is:");
        console.log(data.toString("hex")); // todo: parse hex
    } catch (e) {
        console.log(e);
    }
};

enum LEDs {
    Green = 0x01,
    Red = 0x02
}

enum LEDStatus {
    On = 0x01,
    Off = 0x00
}

const startDisco = (device: CcZnpDevice) => {
    let greenStatus = LEDStatus.Off;
    let redStatus = LEDStatus.Off;

    setInterval(async () => {
        greenStatus = greenStatus === LEDStatus.Off ? LEDStatus.On : LEDStatus.Off;
        try {
            await setLedStatus(device, LEDs.Green, greenStatus);
        } catch (e) {
            console.error(e);
        }
    }, 100);

    setInterval(async () => {
        redStatus = redStatus === LEDStatus.Off ? LEDStatus.On : LEDStatus.Off;
        try {
            await setLedStatus(device, LEDs.Red, redStatus);
        } catch (e) {
            console.error(e);
        }
    }, 300);
};

const setLedStatus = async (device: CcZnpDevice, ledId: number, status: LEDStatus) => {
    const result = await device.request(CcZnpSubSystem.UTIL, UTILCommand.ledControl, [ledId, status]);
    if (result.readUInt8(0) !== 0) {
        throw new Error("Error while setting LED status");
    }
};
