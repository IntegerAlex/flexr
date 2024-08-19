import * as fs from 'fs';
import { exec } from 'child_process';
import Cloudflare from 'cloudflare';

// Initialize Cloudflare client with API Token
const cloudflare = new Cloudflare({
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
});

// Function to add DNS record
async function addRecord(subdomain: string) {
    try {
        const zoneId = 'your-zone-id'; // Replace with your actual Zone ID
        const dnsRecord = {
            type: 'A', // Record type: A, AAAA, CNAME, TXT, etc.
            name: `${subdomain}.flexr`, // Replace with your subdomain
            content: '35.223.20.186', // Replace with the target IP address
            ttl: 120, // Time to live in seconds
            proxied: false, // Set to true if you want Cloudflare to proxy the traffic
        };

        // Create the DNS record
        const result = await cloudflare.dnsRecords.add(zoneId, dnsRecord);
        console.log('DNS Record added:', result);
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
export async function setupSubdomain(subdomain: string, port: number) {
    await addRecord(subdomain);  // Add DNS record
    getSSL(subdomain);           // Get SSL certificate
    ApacheVHost(subdomain, port); // Create Apache VHost
    restartApache(); // Restart Apache to apply changes
    console.log('Subdomain setup completed!');
}

// Example usage:
setupSubdomain('myproject', 8082);
