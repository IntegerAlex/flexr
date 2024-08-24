import * as fs from 'fs';
import { exec } from 'child_process';
import fetch from 'node-fetch';

// Function to add DNS record
async function addRecord(
  subdomain: string,
  dnsRecordId: string
): Promise<string> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
  const data = {
    type: 'A',
    name: `${subdomain}.flexr`,
    content: '35.223.20.186',
    ttl: 120,
    proxied: false,
    comment: 'Domain verification record',
    tags: [],
    id: dnsRecordId,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Email': process.env.CLOUDFLARE_EMAIL || '',
        'X-Auth-Key': process.env.CLOUDFLARE_GLOBAL_TOKEN || '',
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      return 'DNS record updated';
    } else {
      throw new Error('Error updating DNS record');
    }
  } catch (error) {
    throw new Error('Error adding DNS record');
  }
}

// Function to get SSL certificate using Certbot (updated to stop and start Apache)
function getSSL(subdomain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `sudo systemctl stop apache2 && ` +
        `sudo certbot certonly -d ${subdomain}.flexr.flexhost.tech && ` +
        `sudo systemctl start apache2`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Certbot error: ${error}`);
          reject('Error obtaining SSL certificate');
          return;
        }
        resolve('SSL certificate obtained');
        console.log(`Certbot stdout: ${stdout}`);
        console.error(`Certbot stderr: ${stderr}`);
      }
    );
  });
}

// Function to create Apache Virtual Host configuration
function ApacheVHost(subdomain: string, port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const vhostConfig = `
<VirtualHost *:443>
    ServerName ${subdomain}.flexr.flexhost.tech

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/${subdomain}.flexr.flexhost.tech/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/${subdomain}.flexr.flexhost.tech/privkey.pem

    ProxyPass / http://localhost:${port}/
    ProxyPassReverse / http://localhost:${port}/
    ProxyPreserveHost On
</VirtualHost>
        `;

    try {
      fs.writeFileSync(
        `/etc/apache2/sites-available/${subdomain}.conf`,
        vhostConfig,
        { encoding: 'utf8' }
      );
      resolve('Apache VHost configuration created');
    } catch (error) {
      console.error(`File write error: ${error}`);
      reject('Error creating Apache VHost configuration');
    }
  });
}

// Function to create symbolic link for Apache VHost
function ApacheVHostSymLink(subdomain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `sudo ln -s /etc/apache2/sites-available/${subdomain}.conf /etc/apache2/sites-enabled/`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Symlink error: ${error}`);
          reject('Error creating symbolic link');
          return;
        }
        resolve('Symbolic link created');
        console.log(`Symlink stdout: ${stdout}`);
        console.error(`Symlink stderr: ${stderr}`);
      }
    );
  });
}

// Function to restart Apache
export function restartApache(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec('sudo systemctl reload apache2', (error, stdout, stderr) => {
      if (error) {
        console.error(`Apache reload error: ${error}`);
        reject('Error restarting Apache');
        return;
      }
      resolve('Apache restarted');
      console.log(`Apache reload stdout: ${stdout}`);
      console.error(`Apache reload stderr: ${stderr}`);
    });
  });
}

// Function to wait for DNS propagation
function waitForDNSPropagation(subdomain: string): Promise<void> {
  return new Promise((resolve) => {
    console.log('Waiting for DNS propagation...');
    setTimeout(() => {
      console.log('DNS propagation wait complete.');
      resolve();
    }, 60000); // Wait for 60 seconds
  });
}

// Combine functions to setup DNS, SSL, and Apache VHost
export async function setupSubdomain(
  subdomain: string,
  port: number,
  dnsRecordID: string
): Promise<string> {
  try {
    await addRecord(subdomain, dnsRecordID);
    await waitForDNSPropagation(subdomain);
    await getSSL(subdomain); // Obtain SSL certificate first
    await ApacheVHost(subdomain, port); // Configure Apache after certificate is obtained
    await ApacheVHostSymLink(subdomain);
    await restartApache();
    return 'Subdomain setup completed';
  } catch (error) {
    console.error(`Setup error: ${error}`);
    throw new Error('Error setting up subdomain');
  }
}
