import * as fs from 'fs';
import { exec } from 'child_process';
import fetch from 'node-fetch';

// Function to add DNS record
async function addRecord(subdomain: string, dnsRecordId: string) {
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

    const result = await response.json();
    if (response.ok) {
      console.log('DNS Record updated:', result);
    } else {
      console.error('Error updating DNS record:', result.errors);
    }
  } catch (error) {
    console.error('Error adding DNS record:', error);
  }
}

// Function to get SSL certificate using Certbot
function getSSL(subdomain: string) {
  exec(
    `sudo certbot --apache -d ${subdomain}.flexr.flexhost.tech`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Certbot error: ${error}`);
        return;
      }
      console.log(`Certbot stdout: ${stdout}`);
      console.error(`Certbot stderr: ${stderr}`);
    }
  );
}

// Function to create Apache Virtual Host configuration
function ApacheVHost(subdomain: string, port: number) {
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

  fs.writeFileSync(
    `/etc/apache2/sites-available/${subdomain}.conf`,
    vhostConfig,
    { encoding: 'utf8' }
  );
  ApacheVHostSymLink(subdomain);
}

function ApacheVHostSymLink(subdomain: string) {
  exec(
    `sudo ln -s /etc/apache2/sites-available/${subdomain}.conf /etc/apache2/sites-enabled/${subdomain}.conf`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Symlink error: ${error}`);
        return;
      }
      console.log(`Symlink stdout: ${stdout}`);
      console.error(`Symlink stderr: ${stderr}`);
    }
  );
}

// Function to restart Apache
export function restartApache() {
  exec('sudo systemctl reload apache2', (error, stdout, stderr) => {
    if (error) {
      console.error(`Apache reload error: ${error}`);
      return;
    }
    console.log(`Apache reload stdout: ${stdout}`);
    console.error(`Apache reload stderr: ${stderr}`);
  });
}

// Combine functions to setup DNS, SSL, and Apache VHost
export async function setupSubdomain(
  subdomain: string,
  port: number,
  dnsRecordID: string
) {
  await addRecord(subdomain, dnsRecordID); // Add DNS record
  ApacheVHost(subdomain, port); // Create Apache VHost

  // Obtain SSL and reload Apache only after the certificate has been successfully obtained
  getSSL(subdomain);
  return true;
}
