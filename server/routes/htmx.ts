import express from "express";
import path from "path";

const router = express.Router();

router.post("/", async (req, res) => {
  const { buildCommand, runCommand, repoLink, entryPoint } = req.body;
  const projectName = repoLink.split("/").pop().split(".")[0];
  console.log(projectName, repoLink, entryPoint);

  res.send("<p>Debugging... please Wait</p>");
  await fetch("http://localhost:8080/v1/runContainer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectName: projectName,
      repoLink: repoLink,
      entryPoint: entryPoint,
    }),
  }).then((response) => {
    console.log(response);
  });
});
//db.addContainer(containerId , projectName , repoLink , entryPoint)

//res.send("<p>Deploying... please Wait</p>");

export default router;
