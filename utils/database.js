const Sequelize = require('sequelize');
require('dotenv').config();

const db = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        dialect: 'mysql',
        host: process.env.DB_HOST
    }
);

/* const db = new Sequelize(
   process.env.DB_AIVEN_URI,
    {
        dialect: 'mysql',
         dialectOptions: {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            }
        } 
    }
); */

module.exports = db;