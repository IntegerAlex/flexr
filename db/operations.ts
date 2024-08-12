import database from './main'


export async function getDeployments(userName:string){
	database.dbQuery(`SELECT * FROM deployments where user_name = ${userName}`)
}

export async function postDeployment(userName:string, containerId:string){
	database.dbQuery(`INSERT INTO deployments (user_name, container_id) VALUES (${userName}, ${containerId})`)
}

export async function deleteDeployment(userName:string, containerId:string){
	database.dbQuery(`DELETE FROM deployments WHERE user_name = ${userName} AND container_id = ${containerId}`)
}
