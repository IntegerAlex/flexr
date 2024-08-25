import * as fs from 'fs';
import { exec } from 'child_process';
import fetch from 'node-fetch';

// Function to add DNS record
function addRecord(subdomain: string, dnsRecordId: string): Promise<string> {
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

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Email': process.env.CLOUDFLARE_EMAIL || '',
      'X-Auth-Key': process.env.CLOUDFLARE_GLOBAL_TOKEN || '',
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (response.ok) {
        return 'DNS record updated';
      } else {
        throw new Error('Error updating DNS record');
      }
    })
    .catch((error) => {
      throw new Error('Error adding DNS record: ' + error.message);
    });
}

// Function to get SSL certificate using Certbot
function getSSL(subdomain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `sudo certbot -d ${subdomain}.flexr.flexhost.tech --non-interactive && ` +
        `sudo systemctl reload apache2`,
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
  const vhostConfig = `
<VirtualHost *:443>
    ServerName ${subdomain}.flexr.flexhost.tech

    SSLEngine on

    ProxyPass / http://localhost:${port}/
    ProxyPassReverse / http://localhost:${port}/
    ProxyPreserveHost On
</VirtualHost>
    `;

  return new Promise((resolve, reject) => {
    fs.writeFile(
      `/etc/apache2/sites-available/${subdomain}.conf`,
      vhostConfig,
      { encoding: 'utf8' },
      (error) => {
        if (error) {
          console.error(`File write error: ${error}`);
          reject('Error creating Apache VHost configuration');
        } else {
          resolve('Apache VHost configuration created');
        }
      }
    );
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
        } else {
          resolve('Symbolic link created');
          console.log(`Symlink stdout: ${stdout}`);
          console.error(`Symlink stderr: ${stderr}`);
        }
      }
    );
  });
}

// Function to restart Apache
function restartApache(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec('sudo systemctl reload apache2', (error, stdout, stderr) => {
      if (error) {
        console.error(`Apache reload error: ${error}`);
        reject('Error restarting Apache');
      } else {
        resolve('Apache restarted');
        console.log(`Apache reload stdout: ${stdout}`);
        console.error(`Apache reload stderr: ${stderr}`);
      }
    });
  });
}

// Combine functions to setup DNS, SSL, and Apache VHost
export function setupSubdomain(
  subdomain: string,
  port: number,
  dnsRecordID: string
): Promise<string> {
  return addRecord(subdomain, dnsRecordID)
    .then((dnsRecordUpdate) => {
      console.log(dnsRecordUpdate);
      return getSSL(subdomain);
    })
    .then((sslObtained) => {
      console.log(sslObtained);
      return ApacheVHost(subdomain, port);
    })
    .then((vhostCreated) => {
      console.log(vhostCreated);
      return ApacheVHostSymLink(subdomain);
    })
    .then((symlinkCreated) => {
      console.log(symlinkCreated);
      return restartApache();
    })
    .then((apacheRestarted) => {
      console.log(apacheRestarted);
      return 'Subdomain setup completed';
    })
    .catch((error) => {
      console.error(`Setup error: ${error}`);
      throw new Error('Error setting up subdomain');
    });
}
