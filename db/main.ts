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
	
  dbQuery = async (query: string) => {
    try {
      const res = await this.client.query(query);
      return res.rows;
    } catch (err) {
      console.log(err);
    }
  }
	
}
const database = new db();
export default database;
createTableDeployments();
