import database from './main';

export async function createTableDeployments(){
	database.dbQuery(`CREATE TABLE IF NOT EXISTS deployments (
		id SERIAL PRIMARY KEY,
		deployment_id VARCHAR(255) NOT NULL,
		user-name VARCHAR(255) NOT NULL,
		time TIMESTAMP NOT NULL,
		status VARCHAR(255) NOT NULL,
		`);
}





