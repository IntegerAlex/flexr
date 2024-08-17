import pg from 'pg';
import { createClient } from 'redis';
import { createTableDeployments } from './create';
require('dotenv').config();

class db {
  private client: pg.Client;
  private redisClient;

  constructor() {
    // Initialize PostgreSQL client
    this.client = new pg.Client({
      user: process.env.PG_USER, // Replace with your local username
      host: process.env.PG_HOST, // Replace with your local host
      database: process.env.PG_DATABASE, // Replace with your local database name
      password: process.env.PG_PASSWORD, // Replace with your local password
      port: 5432, // Default PostgreSQL port
    });

    // Connect to PostgreSQL
    this.client
      .connect()
      .then(() => {
        console.log('Connected to PostgreSQL database');
      })
      .catch((err) => {
        console.error('Error connecting to PostgreSQL database:', err);
      });

    // Initialize Redis client
    this.redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    // Handle Redis connection errors
    this.redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    // Connect to Redis
    this.redisClient
      .connect()
      .then(() => {
        console.log('Connected to Redis');
      })
      .catch((err) => {
        console.error('Error connecting to Redis:', err);
      });
  }

  // Method to execute a PostgreSQL query
  async dbQuery(query: string, values?: any[]): Promise<any> {
    try {
      const result = await this.client.query(query, values);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async dbRedisSet(key: string, value: boolean): Promise<void> {
    try {
      await this.redisClient.set(key, value.toString());
      console.log('Redis set reply: OK');
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

  // Method to get a boolean value from Redis
  async dbRedisGet(key: string): Promise<boolean | null> {
    try {
      const value = await this.redisClient.get(key);
      if (value === null) {
        console.log('Key not found');
        return null;
      }
      return value === 'true';
    } catch (error) {
      console.error('Redis get error:', error);
      throw error;
    }
  }
}

const database = new db();
export default database;
createTableDeployments();
