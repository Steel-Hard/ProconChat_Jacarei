// db/connection.js

const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DB_URL
});

beforeAll(async () => {
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

module.exports = client;
