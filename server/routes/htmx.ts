import express from 'express';
import path from 'path';
 
const router = express.Router();


router.post('/', async(req, res) => {
	const {projectName , repoLink ,entryPoint} = req.body;
	console.log(projectName , repoLink , entryPoint)
	//res.send("<p>Debugging... please Wait</p>");
const containerId = await	fetch(`http://localhost:8080/v1/runContainer`,{
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			projectName: projectName,
			repoLink: repoLink,
			entryPoint: entryPoint
	})
})
console.log(containerId)
//db.addContainer(containerId , projectName , repoLink , entryPoint)


	res.send("<p>Deploying... please Wait</p>");
});

export default router;




