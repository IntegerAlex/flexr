import pg from 'pg';
import redis from 'redis';
import { createTableDeployments } from './create';
require('dotenv').config();

class db {
  private client: pg.Client;
  private redisClient: redis.RedisClientType;

  constructor() {
    // Initialize PostgreSQL client
    this.client = new pg.Client({
      user: 'user', // Replace with your local username
      host: 'localhost',
      database: 'test',
      password: 'password', // Replace with your local password
      port: 5432, // Default PostgreSQL port
    });

    // Connect to PostgreSQL
    this.client.connect().then(() => {
      console.log('Connected to PostgreSQL database');
    }).catch((err) => {
      console.error('Error connecting to PostgreSQL database:', err);
    });

    // Initialize Redis client
    this.redisClient = redis.createClient({
      url: 'redis://default:password@localhost:6379',
    });

    // Handle Redis connection errors
    this.redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    // Connect to Redis
    this.redisClient.connect().then(() => {
      console.log('Connected to Redis');
    }).catch((err) => {
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

  // Method to set a value in Redis
  async dbRedisSet(key: string, value: string): Promise<void> {
    try {
      await this.redisClient.set(key, value);
      console.log('Redis set reply: OK');
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

async dbRedisGet(key: string): Promise<string | null> {
    try {
      const value = await this.redisClient.get(key);
      if (value === null) {
        console.log('Key not found');
        return null;
      }
      return value;
    } catch (error) {
      console.error('Redis get error:', error);
      throw error;
    }
  }	  	
}

const database = new db();
export default database;
createTableDeployments();

