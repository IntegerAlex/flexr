import { exec, execSync } from "child_process";
import { promisify } from "util";
import { createWriteStream, writeFileSync } from "fs";
const execAsync = promisify(exec);
import { getPort, dockerFile } from "./utils/containerUtil";
export async function runContainer(projectName: string): Promise<string> {
  if (!projectName) {
    return "Invalid input";
  }

  try {
    const port = await getPort(8081);
    const { stdout } = await execAsync(
      `podman run -d -p ${port}:8080 -t localhost/${projectName}:latest`,
    );
    createWriteStream("containerId.txt").write(stdout);
    return stdout.trim();
  } catch (error) {
    console.error(`Error running container: ${error.message}`);
    throw error;
  }
}

export async function createImage(
  buildCommand: string,
  projectName: string,
  repoLink: string,
  entryPoint: string,
  runCommand: string,
): Promise<string> {
  if (!projectName || !repoLink) {
    throw new Error("Invalid input");
  }

  try {
    await generateDockerFile(
      projectName,
      repoLink,
      entryPoint,
      buildCommand,
      runCommand,
    );
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
  buildCommand: string,
  runCommand: string,
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
      writeFileSync(
        "Dockerfile",
        dockerFile(buildCommand, entryPoint, runCommand),
      );
      console.log("Dockerfile created.");
    }
  } catch (error) {
    console.error(`Error generating Dockerfile: ${error.message}`);
    throw error;
  }
}

// Example usage (Uncomment to test)
// runContainer('my-project-image').then(console.log).catch(console.error);
// createImage('my-project', 'https://github.com/user/repo.git', 'index.js').then(console.log).catch(console.error);
