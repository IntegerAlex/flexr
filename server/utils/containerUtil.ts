import net from 'net';

export const dockerFile = (entryPoint: string,buildCommand:string,runCommand:string) => `
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install && ${buildCommand}
EXPOSE 8080
CMD ["${runCommand}", "${entryPoint}"]
`;

function isPortInUse(port:number, host = '127.0.0.1') {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true); // Port is in use
            } else {
                resolve(false); // Other errors
            }
        });

        server.once('listening', () => {
            server.close(() => {
                resolve(false); // Port is not in use
            });
        });

        server.listen(port, host);
    });
}
export async function getPort(findPort: number) {
    // Check if the starting port is in use
    const inUse = await isPortInUse(findPort);
    if (inUse) {
        // If the port is in use, try the next port
        return getPort(findPort + 1);
    } else {
        // Port is available
        return findPort;
    }
}

