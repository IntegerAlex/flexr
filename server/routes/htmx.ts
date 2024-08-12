import express from "express";
import path from "path";
import {getDeployments} from "../../db/operations";
import { get } from "http";
const router = express.Router();

router.post("/", async (req, res) => {
  const { userName , buildCommand , runCommand ,repoLink, entryPoint } = req.body;
  const projectName = repoLink.split("/").pop().split(".")[0];
  console.log(projectName, repoLink, entryPoint);
	//if(!buildCommand){
	//	buildCommand = 	"npm install"
	//}
	//if(!runCommand){
	//	runCommand = "node"
	//}
  //res.send("<p>Debugging... please Wait</p>");
  await fetch("http://localhost:8080/v1/runContainer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
	    userName: userName,
      projectName: projectName,
      repoLink: repoLink,
      buildCommand:(!buildCommand)?"npm install":buildCommand,
      runCommand:(!runCommand)?"node":runCommand,
      entryPoint: entryPoint,
    }),
  })
  .then((response) => { 
	return response.json()
  })
  .then((data) => {
	  console.log(data);
	  const containerId = data.containerId;
	  res.send(`<p>Container ID: ${containerId}</p>`);
}).catch((error) => {	
	console.error('Error:',  error);
	res.send('Error');	
});

});
//db.addContainer(containerId , projectName , repoLink , entryPoint)


	//res.send("<p>Deploying... please Wait</p>");

router.get("/deployments", async (req, res) => {
    try {
        const userName = await req.oidc.user.nickname; 
	//const data = await response.json();
	//
	//
	//
	//	const userName = data.nickname;

	const deployments = await getDeployments(userName);

        const deploymentsHTML = deployments.map(deployment => {
            return `
                <div class="deployment-item">
                    <h3>${deployment.projectName}</h3>
                    <p>Status: ${deployment.status}</p>
                    <p>Deployed at: ${new Date(deployment.time).toLocaleString()}</p>
                    <p>Deployment ID: ${deployment.deployment_id}</p>
                </div>
            `;
        }).join('');

        res.send(`
            <div class="deployments-container">
                ${deploymentsHTML}
            </div>
        `);
	
    } catch (error) {
        console.error('Error fetching deployments:', error);
        res.send("<p>Error fetching deployments</p>");
    }
});

export default router;
