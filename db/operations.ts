import database from './main'


export async function getDeployments(userName:string){
	return new Promise((resolve, reject) => {
	database.dbQuery(`SELECT * FROM deployments where user_name = ${userName}`)
		.then((res) => {
			resolve(res)
		})
		.catch((err:Error) => {
			reject(err)
		})
	})
}

export async function postDeployment(userName:string, containerId:string){
	return new Promise((resolve, reject) => {
	database.dbQuery(`INSERT INTO deployments (user_name, container_id) VALUES (${userName}, ${containerId})`)
	.then((res) => {
		resolve(res)
	})
	.catch((err:Error) => {
		reject(err)
	})
})
}

export async function deleteDeployment(userName:string, containerId:string){
	database.dbQuery(`DELETE FROM deployments WHERE user_name = ${userName} AND container_id = ${containerId}`)
}
