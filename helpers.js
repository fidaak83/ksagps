import moment from 'moment';
import Codec8Parser from './Codec8EParser.js';  // Correct import with .js extension
import fs from 'fs';
// import ioParams from './ioParams.json' assert { type: 'json' };
import { ioParams } from './ioParams.js';
import axios from 'axios';
import { json } from 'stream/consumers';



// Function to decode AVL data and handle acknowledgment
export async function decodeAVLData(buffer, imei, clientSocket) {
  // console.log("decodeAVLData", buffer);
  try {
    const parser = new Codec8Parser(buffer);
    const parsedData = parser.parseAvlPacket();

    // Convert BigInt values to string in the parsed data
    const avlItemsWithBigIntConverted = Codec8Parser.convertBigIntToString(parsedData.avlItems);

    // Clean IMEI from non-printable ASCII characters
    const device_imei = imei.toString().replace(/[\x00-\x1F\x7F]/g, '');

    // Write raw data to a file in hex format
    // fs.writeFileSync(`${device_imei}.txt`, buffer.toString('hex'));

    const result = mergeIoData(avlItemsWithBigIntConverted);

    // Prepare the final result with additional information
    const final_result = {
      timestamp: moment().unix(),
      imei: device_imei,
      preamble: parsedData.preamble,
      dataLength: parsedData.dataLength,
      codecId: parsedData.codecId,
      avlCount: parsedData.avlCount,
      data: result,
      crc: parsedData.crc
    };


    

    // console.log(final_result);
    // Save the final result to a JSON file
    const file_name = `${device_imei}.json`;
    // const avlItemsJson = JSON.stringify(final_result, null, 2);

    const res = await sendDataToServer(final_result);

    if (res) {
      acknowledgeDataReception(parsedData.avlCount, clientSocket, device_imei);
      console.log('Data processing complete.');
    } else {
      sendCommand(clientSocket, false);
    }


    // fs.writeFileSync(file_name, avlItemsJson);



    // Send acknowledgment after decoding AVL data


  } catch (error) {
    console.error('Error in decoding AVL data:', error.message);
  }
}

// Function to acknowledge the data reception (number of data elements)
function acknowledgeDataReception(avlCount, clientSocket, device_imei) {
  const acknowledgment = Buffer.alloc(4);
  acknowledgment.writeUInt32BE(avlCount, 0); // Write avlCount as 4-byte integer
  clientSocket.write(acknowledgment);
  console.log(`Acknowledgment sent: ${avlCount} data elements received from ${device_imei}`);
}

// Function to send a command to the client (start/stop)
export function sendCommand(clientSocket, startSending) {
  const command = startSending ? Buffer.from([0x01]) : Buffer.from([0x00]);
  clientSocket.write(command);
  console.log(`Sent ${startSending ? 'start' : 'stop'} command to the device. ${command}`);
}

// Function to merge I/O data from different sources into a single array
function mergeIoData(data) {
  data.forEach(entry => {
    // Merge I/O arrays into one
    entry.ioData = [
      ...entry.ioData.io1B,
      ...entry.ioData.io2B,
      ...entry.ioData.io4B,
      ...entry.ioData.io8B
    ];

    // // Add the corresponding I/O names to the merged data
    // entry.ioData.forEach(io => {
    //   const ioName = getIoNameById(io.id);
    //   if (ioName) {
    //     io.io_name = ioName;  // Add the io_name to the io object
    //   }
    // });
  });

  return data;
}

// Function to get the I/O name by ID
function getIoNameById(id) {
  // To access the array from the default export
  // const ioParamsArray = ioParams; // ioParams is the entire imported object
  // Look for the corresponding I/O name from the configuration
  const io = ioParams.find(io => io.io_id === id);
  return io ? io.io_name.toLowerCase().replace(/\s+/g, '_') : null;
}


async function sendDataToServer(data) {
  try {
    const timeout = 10000; // 10 seconds timeout

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('https://newlineserver.com/gpsdata.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal, // Attach abort signal
    });

    clearTimeout(timeoutId); // Clear timeout if request finishes before timeout

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData;

  } catch (error) {
    console.error("Error occurred in sending data to server:");

    if (error.name === 'AbortError') {
      console.error("Request timed out");
    } else {
      console.error("Error:", error.message);
    }
  }
}


