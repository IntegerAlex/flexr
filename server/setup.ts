import express from 'express';
import { runContainer } from './containerServices';
const app = express();



app.get('/', (req, res) => {
  res.send('Hello World');
});

app.get('/v1/health', (req, res) => {
	});

app.post('/v1/runContainer', (req, res) => {
	const { projectName }= req.body.projectName;
	const { repoLink }= req.body.repoLink;
	// run container
	runContainer(projectName, repoLink);
	res.send('Container is running');
});
