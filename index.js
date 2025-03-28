const express = require(`express`);
const db = require(`./utils/database`);
const bodyParser = require(`body-parser`);
const Users = require(`./Models/users-model`);
const Messages = require(`./Models/messages-model`);
const Groups = require(`./Models/group-model`);
const GroupMembers = require(`./Models/group-member-model`);
const usersRouter = require(`./Routers/users-router`);
const chatRouter = require(`./Routers/chat-router`);
const cors = require(`cors`);
require('dotenv').config();



const PORT = process.env.PORT || 4000;

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.JWT_SECRET_KEY) {
    console.error('Missing required environment variables');
    process.exit(1);
  }


const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use(`/user`, usersRouter);
app.use(`/chat`, chatRouter);


//1-on-1 chat association:
Users.hasMany(Messages, { as: `SentMessages`, foreignKey: `senderId`, onDelete : `CASCADE` });
Messages.belongsTo(Users, { as: `Sender`, foreignKey: `senderId` });

Users.hasMany(Messages, { as: `ReceivedMessages`, foreignKey: `receiverId`, onDelete : `CASCADE` });
Messages.belongsTo(Users, { as: `Receiver`, foreignKey: `receiverId` });

//Group chat associations:
Users.hasMany(Groups, { as: `AdminGroups`, foreignKey : `adminId` });
Groups.belongsTo(Users, { as: `Admin`, foreignKey : `adminId` });

Groups.hasMany(Messages, { foreignKey : `groupId` });
Messages.belongsTo(Groups, { foreignKey : `groupId` });

//Group members associations:
Users.belongsToMany(Groups, { through: GroupMembers, as: 'userGroups', foreignKey: `userId` });
Groups.belongsToMany(Users, { through: GroupMembers, as: 'members', foreignKey: `groupId` });




//sync the database
db.sync(/* { force : true } */)
.then(() => {
    console.log(`Connected with DB!`);
    app.listen(PORT, () => console.log(`Server is running @ PORT:${PORT}`))
}).catch((err) => {
    console.log(err)
})