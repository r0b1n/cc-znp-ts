export enum CcZnpSubSystem {
    SYS = 0x01,
    MAC = 0x02,
    NWK = 0x03,
    AF = 0x04,
    ZDO = 0x05,
    SAPI = 0x06,
    UTIL = 0x07,
    DEBUG = 0x08,
    APP = 0x09
}

export enum SYSCommand {
    resetReq = 0x00,
    ping = 0x01,
    version = 0x02,
    setExtAddr = 0x03,
    getExtAddr = 0x04,
    random = 0x0c,
    setTime = 0x10,
    getTime = 0x11
    // incomplete!
}

export enum UTILCommand {
    ledControl = 0x0a
    // incomplete!
}
