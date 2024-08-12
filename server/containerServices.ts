import { exec, execSync } from "child_process";
import { promisify } from "util";
import { createWriteStream, writeFileSync } from "fs";
import { getPort, dockerFile } from "./utils/containerUtil";

const execAsync = promisify(exec);

export async function runContainer(
  username: string,
  projectName: string,
): Promise<string> {
  if (!username || !projectName) {
    return "Invalid input";
  }

  try {
    const port = await getPort(8081);
    const imageName = `${username.toLowerCase()}-${projectName}`;
    const { stdout } = await execAsync(
      `podman run -d -p ${port}:8080 -t localhost/${imageName}:latest`,
    );
    createWriteStream("containerId.txt").write(stdout);
    return stdout.trim();
  } catch (error) {
    console.error(`Error running container: ${error.message}`);
    throw error;
  }
}

export async function createImage(
  username: string,
  projectName: string,
  repoLink: string,
  entryPoint: string,
  buildCommand: string,
  runCommand: string,
): Promise<string> {
  if (!username || !projectName || !repoLink) {
    throw new Error("Invalid input");
  }

  try {
    await generateDockerFile(
      username,
      projectName,
      repoLink,
      entryPoint,
      buildCommand,
      runCommand,
    );
    const imageName = `${username.toLowerCase()}-${projectName}`;
    const { stdout } = await execAsync(`buildah build -t ${imageName} .`);
    console.log(`Image built: ${stdout}`);
    return imageName;
  } catch (error) {
    console.error(`Error creating image: ${error.message}`);
    throw error;
  }
}

async function generateDockerFile(
  username: string,
  projectName: string,
  repoLink: string,
  entryPoint: string,
  buildCommand: string,
  runCommand: string,
): Promise<void> {
  try {
    // Change directory to username folder
    process.chdir(`/home/akshat/${username.toLowerCase()}`);

    // Clone the repository into the project directory
    await execAsync(`git clone ${repoLink}`);
    process.chdir(projectName); // Change directory to the project folder

    // Check if Dockerfile already exists
    try {
      execSync("ls Dockerfile");
      console.log("Dockerfile already exists, skipping creation.");
    } catch {
      // Create Dockerfile if it doesn't exist
      writeFileSync(
        "Dockerfile",
        dockerFile(entryPoint, buildCommand, runCommand),
      );
      console.log("Dockerfile created.");
    }
  } catch (error) {
    console.error(`Error generating Dockerfile: ${error.message}`);
    throw error;
  }
}
