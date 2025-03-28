const Sequelize = require(`sequelize`);
const db = require(`../utils/database`);

const GroupMembers = db.define('Group-members', {
    id: {
      type: Sequelize.STRING,
      primaryKey: true,
      allowNull: false,
    }
  });
  
  module.exports = GroupMembers;