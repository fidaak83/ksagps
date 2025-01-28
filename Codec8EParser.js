class Codec8Parser {
    constructor(hexData) {
      this.buffer = hexData;
      this.offset = 0;
    }
  
    // Helper function to read bytes from buffer
    readBytes(length) {
      const value = this.buffer.slice(this.offset, this.offset + length);
      this.offset += length;
      return value;
    }
  
    // Helper function to read unsigned integers
    readUInt(length) {
      const value =
        length === 1
          ? this.buffer.readUInt8(this.offset)
          : length === 2
          ? this.buffer.readUInt16BE(this.offset)
          : length === 4
          ? this.buffer.readUInt32BE(this.offset)
          : length === 8
          ? BigInt(`0x${this.buffer.slice(this.offset, this.offset + length).toString("hex")}`)
          : null;
      this.offset += length;
      return value;
    }
  
    // Helper function to read signed integers
    readInt(length) {
      const value =
        length === 1
          ? this.buffer.readInt8(this.offset)
          : length === 2
          ? this.buffer.readInt16BE(this.offset)
          : length === 4
          ? this.buffer.readInt32BE(this.offset)
          : null;
      this.offset += length;
      return value;
    }
  
    // Parse AVL item data
    parseAvlItem() {
      const timestamp = parseInt(this.readUInt(8)) / 1000; // Timestamp
      // const date = new Date(timestamp * 1000);
      const timeString = new Date(timestamp * 1000).toLocaleString(); // Timestamp
      const priority = this.readUInt(1); // Priority
  
      // GPS Element
      const longitude = this.readInt(4) / 10000000;
      const latitude = this.readInt(4) / 10000000;
      const altitude = this.readInt(2);
      const angle = this.readInt(2);
      const satellites = this.readUInt(1);
      const speed = this.readUInt(2);
  
      const gpsData = { longitude, latitude, altitude, angle, satellites, speed };
  
      // IO Element
      const eventIoId = this.readUInt(1);
      const totalIo = this.readUInt(1);
  
      const readIoElements = (length) => {
        const count = this.readUInt(1);
        const elements = [];
        for (let i = 0; i < count; i++) {
          const id = this.readUInt(1);
          const value = length === 1 ? this.readUInt(1) : this.readUInt(length);
          elements.push({ id, value });
        }
        return elements;
      };
  
      const io1B = readIoElements(1);
      const io2B = readIoElements(2);
      const io4B = readIoElements(4);
      const io8B = readIoElements(8);
  
      const ioData = { eventIoId, totalIo, io1B, io2B, io4B, io8B };
  
      return { timestamp, timeString, priority, gpsData, ioData };
    }
  
    // Parse the AVL packet
    parseAvlPacket() {
      const preamble = this.readUInt(4); // Preamble (should be 0x00000000)
      const dataLength = this.readUInt(4); // Data length
      const codecId = this.readUInt(1); // Codec ID (should be 8)
      const avlCount = this.readUInt(1); // Number of AVL items
  
      const avlItems = [];
      for (let i = 0; i < avlCount; i++) {
        avlItems.push(this.parseAvlItem());
      }
  
      const crc = this.readUInt(4); // CRC32 checksum
  
      return { preamble, dataLength, codecId, avlCount, avlItems, crc };
    }
  
    // Convert BigInt values to string in the parsed data
    static convertBigIntToString(obj) {
      if (typeof obj === 'bigint') {
        return obj.toString();  // Convert BigInt to string
      }
  
      // If the object is an array, iterate over and process each element
      if (Array.isArray(obj)) {
        return obj.map(Codec8Parser.convertBigIntToString);
      }
  
      // If the object is an object, process each key-value pair
      if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (let key in obj) {
          if (obj.hasOwnProperty(key)) {
            newObj[key] = Codec8Parser.convertBigIntToString(obj[key]);
          }
        }
        return newObj;
      }
  
      // Return the original value if it's not BigInt or an object
      return obj;
    }
  }

export default Codec8Parser