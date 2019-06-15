const asHex = num => "0x" + num.toString(16).padStart(2, "0");
export const printPacketData = (data: Buffer) => {
    const cmd0 = data.readUInt8(0);
    const cmd1 = data.readUInt8(1);
    console.log("|----------------------------|");
    console.log("|    Received new packet     |");
    console.log("|----------------------------|");
    console.log("| CMD0", asHex(cmd0), "                 |");
    console.log("| CMD1", asHex(cmd1), "                 |");
    console.log("| Data length", (data.length - 2).toString().padStart(2), "            |");
    console.log("|--------- Data -------------|");
    console.log("|", data.slice(2).toString("hex"));
    console.log("|----------------------------|\n");
};
