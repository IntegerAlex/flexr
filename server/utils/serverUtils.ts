import * as fs from 'fs';
import { exec } from 'child_process';
import fetch from 'node-fetch';

// Function to add DNS record
async function addRecord(subdomain: string, dnsRecordId: string) {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}{/dns_records`;
    const data = {
	type: 'A',
	name: `${subdomain}.flexr`,
	content: '35.223.20.186',
	 ttl: 120, // Time to live in seconds
            proxied: false, // Set to true if you want Cloudflare to proxy the traffic
            comment: 'Domain verification record',
            tags: [], // Optional tags
            id: dnsRecordId // Replace with your DNS record ID
        };

	try{
	const response = await fetch(url,  {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Auth-Email': process.env.CLOUDFLARE_EMAIL || '', 
                'X-Auth-Key': process.env.CLOUDFLARE_GLOBAL_TOKEN || '', // Replace with your Cloudflare API key
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
    exec(`sudo certbot --apache -d ${subdomain}.flexr.flexhost.tech`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return false;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
        return true;
    });
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

    fs.writeFileSync(`/etc/apache2/sites-available/${subdomain}.conf`, vhostConfig, { encoding: 'utf8' });
}

// Function to restart Apache
function restartApache() {
    exec('sudo apache2ctl configtest', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`Config test stdout: ${stdout}`);
        console.error(`Config test stderr: ${stderr}`);

        exec('sudo systemctl reload apache2', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            console.log(`Apache reload stdout: ${stdout}`);
            console.error(`Apache reload stderr: ${stderr}`);
        });
    });
}

// Combine functions to setup DNS, SSL, and Apache VHost
export async function setupSubdomain(subdomain: string, port: number , dnsRecordID: string) {
    await addRecord(subdomain , dnsRecordID);  // Add DNS record
    getSSL(subdomain);           // Get SSL certificate
    ApacheVHost(subdomain, port); // Create Apache VHost
    restartApache(); // Restart Apache to apply changes
    console.log('Subdomain setup completed!');
}


