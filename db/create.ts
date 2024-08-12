import database from './main';

export async function createTableDeployments() {
    try {
        await database.dbQuery(`
            CREATE TABLE IF NOT EXISTS deployments (
                id SERIAL PRIMARY KEY,
                deployment_id VARCHAR(255) NOT NULL,
                user_name VARCHAR(255) NOT NULL,
                time TIMESTAMP NOT NULL,
                status VARCHAR(255) NOT NULL
            );
        `);
        console.log("Table 'deployments' created or already exists.");
    } catch (error) {
        console.error('Error creating table:', error);
    }
}

