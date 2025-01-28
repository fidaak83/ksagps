import net from 'net';
import { decodeAVLData, sendCommand } from './helpers.js';  // Adjust the path to the helpers file

// Server configuration
const HOST = '127.0.0.1';
const PORT = process.env.PORT || 10000;

// Function to handle a single client connection
function handleClient(clientSocket) {
    let imei = null;

    clientSocket.on('data', async (data) => {
        try {
            // console.log('Received Data: ', data);

            if (!imei) {
                // Extract IMEI length (first two bytes) and IMEI from the buffer
                const imeiLength = data.readUInt16BE(0); // First two bytes represent the IMEI length
                imei = data.slice(2, 2 + imeiLength).toString(); // Slice the buffer to get the IMEI bytes

                // Ensure the IMEI is valid (should be 15 digits)
                if (imei.length === 15 && /^[0-9]+$/.test(imei)) {
                    console.log(`Received IMEI: ${imei}`);
                    // Send start command after IMEI reception
                    sendCommand(clientSocket, true);
                } else {
                    console.error('Invalid IMEI received, disconnecting...');
                    clientSocket.end();
                    return;
                }
            } else {
                // Process AVL data
                decodeAVLData(data, imei, clientSocket);  // Call the decode function to process AVL data
            }
        } catch (error) {
            console.error(`Error handling client data: ${error.message}`);
        }
    });

    clientSocket.on('end', () => {
        console.log("Client disconnected");
        if (imei) {
            sendCommand(clientSocket, false); // Send stop command when session ends
        }
    });

    clientSocket.on('error', (err) => {
        console.error(`Socket error: ${err.message}`);
    });
}

// Main server function
function main() {
    const server = net.createServer((clientSocket) => {
        console.log("------------------------------");
        console.log(`Accepted connection from ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);
        handleClient(clientSocket);
    });

    server.listen(PORT, HOST, () => {
        console.log(`Server listening on ${HOST}:${PORT}`);
    });
}

// Start the server
main();