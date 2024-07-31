import { exec, execSync } from "child_process";
import { promisify } from "util";
import { createWriteStream, writeFileSync } from "fs";
import net from "net";
const execAsync = promisify(exec);

export async function runContainer(projectName: string): Promise<string> {
  if (!projectName) {
    return "Invalid input";
  }

  try {
    const port = await getPort(8081);
    const { stdout } = await execAsync(
      `podman run -d -p ${port}:8080 -t localhost/${projectName}:latest`,
    );
    createWriteStream("containerId.txt").write(stdout.trim());
    return stdout;
  } catch (error) {
    console.error(`Error running container: ${error.message}`);
    throw error;
  }
}

export async function createImage(
  projectName: string,
  repoLink: string,
  entryPoint: string,
): Promise<string> {
  if (!projectName || !repoLink) {
    throw new Error("Invalid input");
  }

  try {
    await generateDockerFile(projectName, repoLink, entryPoint);
    const { stdout } = await execAsync(`buildah build -t ${projectName} .`);
    console.log(`Image built: ${stdout}`);
    return projectName;
  } catch (error) {
    console.error(`Error creating image: ${error.message}`);
    throw error;
  }
}

async function generateDockerFile(
  projectName: string,
  repoLink: string,
  entryPoint: string,
): Promise<void> {
  try {
    await execAsync(`git clone ${repoLink}`);
    process.chdir(projectName); // Change directory to project folder

    // Check if Dockerfile already exists
    try {
      execSync("ls Dockerfile");
      console.log("Dockerfile already exists, skipping creation.");
    } catch {
      // Create Dockerfile if it doesn't exist
      writeFileSync("Dockerfile", dockerFile(entryPoint));
      console.log("Dockerfile created.");
    }
  } catch (error) {
    console.error(`Error generating Dockerfile: ${error.message}`);
    throw error;
  }
}

const dockerFile = (entryPoint: string) => `
FROM node:20
WORKDIR /app
COPY package*.json ./
COPY . .
RUN npm install
EXPOSE 8080
CMD ["node", "${entryPoint}"]
`;

function isPortInUse(port: number, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(true); // Port is in use
      } else {
        resolve(false); // Other errors
      }
    });

    server.once("listening", () => {
      server.close(() => {
        resolve(false); // Port is not in use
      });
    });

    server.listen(port, host);
  });
}
async function getPort(findPort: number) {
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

// Example usage (Uncomment to test)
// runContainer('my-project-image').then(console.log).catch(console.error);
// createImage('my-project', 'https://github.com/user/repo.git', 'index.js').then(console.log).catch(console.error);
