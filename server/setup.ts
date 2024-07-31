import express from 'express'; 
import { runContainer , createImage } from './containerServices';
const app = express();
import bodyParser from 'body-parser';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



app.get('/', (req, res) => {
  res.send('Hello World');
});

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

app.listen(3000, () => {
	console.log('Server is running on port 3000');
}	);
