import * as fs from 'fs';
import { exec } from 'child_process';

const NGINX_CONF_PATH = '/etc/nginx/sites-available/nodeapp';
export async function addNginxLocationBlock(
  port: number,
  locationPath: string
): Promise<void> {
  try {
    // Read the existing NGINX configuration file
    let nginxConf = fs.readFileSync(NGINX_CONF_PATH, 'utf8');

    // Create a backup
    fs.writeFileSync(`${NGINX_CONF_PATH}`, nginxConf, 'utf8');

    // Define the new location block
    const newLocationBlock = `
    location /${locationPath} {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
`;

    // Find all server blocks
    const serverBlocks = nginxConf.match(/server\s*{[^}]*}/gs);
    if (!serverBlocks) {
      throw new Error('No server blocks found in the configuration.');
    }

    // Process each server block
    serverBlocks.forEach((block, index) => {
      if (
        block.includes('listen 443 ssl') &&
        block.includes('server_name sites.flexhost.tech')
      ) {
        // Check if location block already exists
        if (!block.includes(`location ${locationPath} {`)) {
          // Append the new location block
          const updatedBlock = block.replace(
            /}(?=[^}]*$)/,
            `${newLocationBlock}}`
          );
          nginxConf = nginxConf.replace(block, updatedBlock);
        }
      }
    });

    // Write the updated configuration back to the file
    fs.writeFileSync(NGINX_CONF_PATH, nginxConf, 'utf8');

    console.log('NGINX configuration updated successfully.');
    exec('sudo nginx -t', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    });
    exec('sudo systemctl reload nginx', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    });
    // Here you might want to add code to reload NGINX
    // For example: await exec('nginx -s reload');
  } catch (error) {
    console.error('Error updating NGINX configuration:', error);
    throw error; // Rethrow the error for the caller to handle
  }
}
