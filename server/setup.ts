import express from 'express'; 
import { runContainer , createImage } from './containerServices';
const app = express();
app.set('trust proxy', true);
const { auth , requiresAuth } = require('express-openid-connect');
import htmxRouter from './routes/htmx';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
app.use(cors());
require('dotenv').config();
//app.use(auth(config));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/htmx",htmxRouter)
//app.use(express.static(path.join(__dirname, '../frontend/')));
//app.get('/', (req, res) => {
//	res.sendFile(path.join(__dirname, '../frontend/index.html'));
//
//});
app.use(express.static(path.join(__dirname, '../frontend/')));
app.get('/v1/health', (req, res) => {
	 
	});

app.post('/v1/runContainer', (req, res) => {
	const { projectName, repoLink ,entryPoint }= req.body as { projectName: string, repoLink: string, entryPoint: string };
	// run container
	if(!projectName || !repoLink || !entryPoint){
		res.send('Invalid Request');
	}
	console.log(projectName, repoLink, entryPoint);
 	createImage(projectName, repoLink , entryPoint)
	.then((projectName)=>{

		runContainer(projectName)
		.then((containerId)=>{
			res.send(containerId);
		})
	})
	.catch((err)=>{
		console.log(err);
		res.send('Error')
	})


});

//const { auth } = require('express-openid-connect');

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
app.use(express.static(path.join(__dirname+'../frontend/')));

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));
// req.isAuthenticaed is provided from the auth router
app.get('/', (req, res) => {
    console.log('Accessing root route');
    if (req.oidc.isAuthenticated()) {
	    res.sendFile(path.join(__dirname, '../frontend/index.html'));
	    //res.send(req.oidc.isAuthenticated());
    } else {
        console.log('User is not authenticated, redirecting to /login');
        res.redirect('/home');
    }
});

app.get('/home', (req, res) => {
    console.log('User accessed /home');
    res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

// Index route
app.get('/callback', (req, res) => {
  //  console.log('User accessed /index'+req.query);
	res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Profile route, protected by authentication
app.get('/profile', requiresAuth(), (req, res) => {
    console.log('User accessed /profile');
    res.send(JSON.stringify(req.oidc.user));
});
app.get('/v1/repositories', (req, res) => {
	// get all repositories
	const user_id = req.query.user_id;
        fetch(`https://api.github.com/${user_id}/repos`, {
		method: 'GET'})
	.then((response) => response.json())
	.then((data) => {
		const repositories = data.map((repo: any) => {
			return {
				name: repo.name,
				url: repo.html_url,	
			}	})
		res.send(repositories);
	})
});



app.listen(8080, () => {
	console.log('Server is running on port 8080');
}	);


