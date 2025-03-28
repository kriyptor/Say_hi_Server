const Sequelize = require(`sequelize`);
const db = require(`../utils/database`);

const Users = db.define(`Users`, {
    id : {
        type :  Sequelize.STRING,
        allowNull : false,
        primaryKey: true,
    },

    name : {
        type : Sequelize.STRING,
        allowNull : false,
    },

    email : {
        type : Sequelize.STRING,
        allowNull : false
    },

    phoneNumber : {
        type : Sequelize.STRING,
        allowNull : false
    },

    password : {
        type : Sequelize.STRING,
        allowNull : false
    }

});

module.exports = Users;