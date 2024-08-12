import pg from 'pg';
import {createTableDeployments} from './create';
require('dotenv').config();
class db {
  private client: pg.Client;

  constructor() {
    this.client = new pg.Client({
      user: 'user', // Replace with your local username
      host: 'localhost',
      database: 'test',
      password: 'password', // Replace with your local password
      port: 5432, // Default PostgreSQL port
    });

    this.client.connect().then(() => {
	console.log('Connected to database');
    }).catch((err) => {
	console.log('Error connecting to database');
	console.log(err);
    });
 
	
  }
	
 async dbQuery(query: string, values?: any[]): Promise<any> {
    try {
        const result = await client.query(query, values);
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
 }
	
}
const database = new db();
export default database;
createTableDeployments();
