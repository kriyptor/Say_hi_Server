const Sequelize = require(`sequelize`);
const db = require(`../utils/database`);

const Groups = db.define('Groups', {
  id: {
    type: Sequelize.STRING,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },

  adminId: {
    type: Sequelize.STRING,
    allowNull: false,
  }

});

module.exports = Groups;