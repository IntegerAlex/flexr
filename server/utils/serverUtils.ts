import * as fs from 'fs';
import { exec } from 'child_process';
import fetch from 'node-fetch';
import dns from 'dns';

// Function to add DNS record
async function addRecord(subdomain: string, dnsRecordId: string): Promise<string> {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
    const data = {
        type: 'A',
        name: `${subdomain}.flexr.flexhost.tech`, // Updated to include full domain
        content: '35.223.20.186',
        ttl: 120,
        proxied: false,
        comment: 'Domain verification record',
        tags: [],
        id: dnsRecordId
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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return "DNS record updated";
    } catch (error) {
        throw new Error(`Error adding DNS record: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// Function to check if DNS has propagated
function checkDNSPropagation(subdomain: string): Promise<boolean> {
    return new Promise((resolve) => {
        const fullDomain = `${subdomain}.flexr.flexhost.tech`;
        dns.resolve4(fullDomain, (err, addresses) => {
            if (err) {
                console.log(`DNS check failed for ${fullDomain}. Waiting...`);
                resolve(false);
            } else if (addresses.includes('35.223.20.186')) {
                console.log(`DNS has propagated for ${fullDomain}`);
                resolve(true);
            } else {
                console.log(`DNS returned wrong IP for ${fullDomain}. Waiting...`);
                resolve(false);
            }
        });
    });
}

// Function to wait for DNS propagation
async function waitForDNSPropagation(subdomain: string): Promise<void> {
    const maxAttempts = 30;
    const delayBetweenChecks = 10000; // 10 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const isPropagated = await checkDNSPropagation(subdomain);
        if (isPropagated) {
            return;
        }
        console.log(`Attempt ${attempt}/${maxAttempts}: DNS not yet propagated. Waiting...`);
        await new Promise(resolve => setTimeout(resolve, delayBetweenChecks));
    }

    throw new Error("DNS propagation timed out");
}

// Function to get SSL certificate using Certbot
function getSSL(subdomain: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(
            `sudo certbot certonly --apache -d ${subdomain}.flexr.flexhost.tech --non-interactive --agree-tos --email ${process.env.CERTBOT_EMAIL} && ` +
            `sudo systemctl reload apache2`,
            (error, stdout, stderr) => {
                if (error) {
                    console.error(`Certbot error: ${error}`);
                    reject(`Error obtaining SSL certificate: ${stderr}`);
                    return;
                }
                console.log(`Certbot stdout: ${stdout}`);
                console.error(`Certbot stderr: ${stderr}`);
                resolve("SSL certificate obtained");
            });
    });
}

// Function to create Apache Virtual Host configuration
function createApacheVHost(subdomain: string, port: number): Promise<string> {
    const vhostConfig = `
<VirtualHost *:443>
    ServerName ${subdomain}.flexr.flexhost.tech

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/${subdomain}.flexr.flexhost.tech/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/${subdomain}.flexr.flexhost.tech/privkey.pem

    ProxyPass / http://localhost:${port}/
    ProxyPassReverse / http://localhost:${port}/
    ProxyPreserveHost On

    ErrorLog \${APACHE_LOG_DIR}/${subdomain}_error.log
    CustomLog \${APACHE_LOG_DIR}/${subdomain}_access.log combined
</VirtualHost>
    `;

    return new Promise((resolve, reject) => {
        fs.writeFile(`/etc/apache2/sites-available/${subdomain}.conf`, vhostConfig, { encoding: 'utf8' }, (error) => {
            if (error) {
                console.error(`File write error: ${error}`);
                reject(`Error creating Apache VHost configuration: ${error.message}`);
            } else {
                resolve("Apache VHost configuration created");
            }
        });
    });
}

// Function to create symbolic link for Apache VHost
function createApacheVHostSymLink(subdomain: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(`sudo ln -s /etc/apache2/sites-available/${subdomain}.conf /etc/apache2/sites-enabled/`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Symlink error: ${error}`);
                reject(`Error creating symbolic link: ${stderr}`);
            } else {
                console.log(`Symlink stdout: ${stdout}`);
                console.error(`Symlink stderr: ${stderr}`);
                resolve("Symbolic link created");
            }
        });
    });
}

// Function to restart Apache
function restartApache(): Promise<string> {
    return new Promise((resolve, reject) => {
        exec('sudo systemctl reload apache2', (error, stdout, stderr) => {
            if (error) {
                console.error(`Apache reload error: ${error}`);
                reject(`Error restarting Apache: ${stderr}`);
            } else {
                console.log(`Apache reload stdout: ${stdout}`);
                console.error(`Apache reload stderr: ${stderr}`);
                resolve("Apache restarted");
            }
        });
    });
}

// Combine functions to setup DNS, SSL, and Apache VHost
export async function setupSubdomain(subdomain: string, port: number, dnsRecordID: string): Promise<string> {
    try {
        console.log(await addRecord(subdomain, dnsRecordID));
        await waitForDNSPropagation(subdomain);
        console.log(await getSSL(subdomain));
        console.log(await createApacheVHost(subdomain, port));
        console.log(await createApacheVHostSymLink(subdomain));
        console.log(await restartApache());
        return "Subdomain setup completed";
    } catch (error) {
        console.error(`Setup error: ${error instanceof Error ? error.message : String(error)}`);
        throw new Error("Error setting up subdomain");
    }
}
