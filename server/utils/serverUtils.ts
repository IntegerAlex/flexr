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
        id: dnsRecordId
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
    .then(response => {
        if (response.ok) {
            return "DNS record updated";
        } else {
            throw new Error("Error updating DNS record");
        }
    })
    .catch(error => {
        throw new Error("Error adding DNS record: " + error.message);
    });
}

// Function to get SSL certificate using Certbot
function getSSL(subdomain: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(
            `sudo certbot --nginx -d ${subdomain}.flexr.flexhost.tech --non-interactive --agree-tos --email ${process.env.CERTBOT_EMAIL} && ` +
            `sudo systemctl reload nginx`,
            (error, stdout, stderr) => {
                if (error) {
                    console.error(`Certbot error: ${error}`);
                    reject("Error obtaining SSL certificate");
                    return;
                }
                resolve("SSL certificate obtained");
                console.log(`Certbot stdout: ${stdout}`);
                console.error(`Certbot stderr: ${stderr}`);
            });
    });
}

// Function to create NGINX server block configuration
function NginxServerBlock(subdomain: string, port: number): Promise<string> {
    const serverBlockConfig = `
server {
    listen 443 ssl;
    server_name ${subdomain}.flexr.flexhost.tech;

    ssl_certificate /etc/letsencrypt/live/${subdomain}.flexr.flexhost.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${subdomain}.flexr.flexhost.tech/privkey.pem;

    location / {
        proxy_pass http://localhost:${port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
    `;

    return new Promise((resolve, reject) => {
        fs.writeFile(`/etc/nginx/sites-available/${subdomain}`, serverBlockConfig, { encoding: 'utf8' }, (error) => {
            if (error) {
                console.error(`File write error: ${error}`);
                reject("Error creating NGINX server block configuration");
            } else {
                resolve("NGINX server block configuration created");
            }
        });
    });
}

// Function to create symbolic link for NGINX server block
function NginxServerBlockSymLink(subdomain: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(`sudo ln -s /etc/nginx/sites-available/${subdomain} /etc/nginx/sites-enabled/`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Symlink error: ${error}`);
                reject("Error creating symbolic link");
            } else {
                resolve("Symbolic link created");
                console.log(`Symlink stdout: ${stdout}`);
                console.error(`Symlink stderr: ${stderr}`);
            }
        });
    });
}

// Function to restart NGINX
function restartNginx(): Promise<string> {
    return new Promise((resolve, reject) => {
        exec('sudo systemctl reload nginx', (error, stdout, stderr) => {
            if (error) {
                console.error(`NGINX reload error: ${error}`);
                reject("Error restarting NGINX");
            } else {
                resolve("NGINX restarted");
                console.log(`NGINX reload stdout: ${stdout}`);
                console.error(`NGINX reload stderr: ${stderr}`);
            }
        });
    });
}

// Combine functions to setup DNS, SSL, and NGINX server block
export function setupSubdomain(subdomain: string, port: number, dnsRecordID: string): Promise<string> {
    return addRecord(subdomain, dnsRecordID)
        .then(dnsRecordUpdate => {
            console.log(dnsRecordUpdate);
            return NginxServerBlock(subdomain, port);
        })
        .catch(error => {
            console.error(`Error updating DNS record: ${error}`);
            throw new Error("Error setting up subdomain");
        })
        .then(serverBlockCreated => {
            console.log(serverBlockCreated);
            return NginxServerBlockSymLink(subdomain);
        })
        .catch(error => {
            console.error(`Error creating NGINX server block: ${error}`);
            throw new Error("Error setting up subdomain");
        })
        .then(symlinkCreated => {
            console.log(symlinkCreated);
            return getSSL(subdomain);
        })
        .catch(error => {
            console.error(`Error creating symbolic link: ${error}`);
            throw new Error("Error setting up subdomain");
        })
        .then(sslObtained => {
            console.log(sslObtained);
            return restartNginx();
        })
        .catch(error => {
            console.error(`Error obtaining SSL certificate: ${error}`);
            throw new Error("Error setting up subdomain");
        })
        .then(nginxRestarted => {
            console.log(nginxRestarted);
            return "Subdomain setup completed";
        })
        .catch(error => {
            console.error(`Error restarting NGINX: ${error}`);
            throw new Error("Error setting up subdomain");
        });
}

