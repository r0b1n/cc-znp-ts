export enum CcZnpCommandType {
    POOL = 0x10, // this is not used for UART
    SREQ = 0x20,
    AREQ = 0x40,
    SRSP = 0x60
}

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
