const Sequelize = require(`sequelize`);
const db = require(`../utils/database`);

const Messages = db.define(`Messages`, {
    id : {
        type :  Sequelize.STRING,
        allowNull : false,
        primaryKey: true,
    },

    messageContent : {
        type : Sequelize.STRING,
        allowNull : false,
    },
    
    isGroupMessage: {
        type: Sequelize.BOOLEAN,
        allowNull : false,
        defaultValue: false,
    }

});

module.exports = Messages;