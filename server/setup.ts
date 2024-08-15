import express from 'express';
import { runContainer, createImage } from './containerServices';
import htmxRouter from './routes/htmx';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import { auth, requiresAuth } from 'express-openid-connect';
require('dotenv').config();
import {createDirectory} from './utils/containerUtil';
import database from '../db/main';
const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/htmx", htmxRouter);
app.use(express.static(path.join(__dirname, '../../frontend/')));

app.get('/v1/health', (req, res) => {
    res.status(200).send('Healthy');
});

app.post('/v1/runContainer', async (req, res) => {
    const { userName, projectName, repoLink, entryPoint, buildCommand, runCommand } = req.body as { userName: string, projectName: string, repoLink: string, entryPoint: string, buildCommand: string, runCommand: string };

    if (!userName || !projectName || !repoLink || !entryPoint) {
        return res.status(400).send('Invalid Request');
    }

    try {
        console.log(`Creating image for project: ${projectName}`);
        const imageName = await createImage(userName, projectName, repoLink, entryPoint, buildCommand, runCommand);
        
        console.log(`Running container for image: ${imageName}`);
        const containerId = await runContainer(userName, projectName);
        
        console.log(`Container running with ID: ${containerId}`);
	database.dbRedisSet(userName.toLowerCase(), true);
        res.json({ containerId: containerId });
    } catch (err) {
        console.error(`Error: ${err.message}`);
        res.status(500).send('Error running container');
    }
});

// Authentication configuration
const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.SECRET,
    baseURL: process.env.BASEURL,
    clientID: process.env.CLIENTID,
    issuerBaseURL: process.env.ISSUERBASEURL,
    authorizationParams: {
        scope: 'openid profile',
    },
};

app.use(auth(config));

// Root route protected by authentication
app.get('/', (req, res) => {
    console.log('Accessing root route');
    if (req.oidc.isAuthenticated()) {
	createDirectory(req.oidc.user.nickname);
        res.sendFile(path.join(__dirname, '../../frontend/dashboard.html'));
    } else {
        console.log('User is not authenticated, redirecting to /home');
        res.redirect('/home');
    }
});

app.get('/home', (req, res) => {
    console.log('User accessed /home');
    res.sendFile(path.join(__dirname, '../../frontend/home.html'));
});

app.get('/callback', (req, res) => {
    console.log(req.oidc.user);
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/v1/profile', requiresAuth(), (req, res) => {
    console.log('User accessed /profile');
    res.json({ nickname: req.oidc.user.nickname });
});

app.get('/v1/repositories', (req, res) => {
    const user_id = req.query.user_id as string;
    
    fetch(`https://api.github.com/users/${user_id}/repos`, { method: 'GET' })
        .then(response => response.json())
        .then(data => {
            const repositories = data.map((repo: any) => {
                return {
                    name: repo.name,
                    url: repo.html_url,
                };
            });
            res.send({ repositories: repositories, avatar_url: data[0].owner.avatar_url });
        })
        .catch(error => {
            console.error('Error fetching repositories:', error);
            res.status(500).send('Error fetching repositories');
        });
});

app.listen(8080, () => {
    console.log('Server is running on port 8080');
});

