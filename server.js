const net = require('net');

// Define the host and port to listen on
const HOST = '0.0.0.0';  // Listen on all network interfaces
const PORT = 8081;  // Default port

// Create a TCP server
const server = net.createServer((socket) => {
    console.log(`Client connected: ${socket.remoteAddress}:${socket.remotePort}`);

    // Handle incoming data from clients
    socket.on('data', (data) => {
        console.log(`Received data: ${data.toString()}`);
        
        // You can respond back to the client (optional)
        socket.write('Message received');
    });

    // Handle client disconnect
    socket.on('end', () => {
        console.log('Client disconnected');
    });

    // Handle errors
    socket.on('error', (err) => {
        console.error(`Error: ${err.message}`);
    });
});

// Start the server
server.listen(PORT, HOST, () => {
    console.log(`Server is listening on ${HOST}:${PORT}`);
});
