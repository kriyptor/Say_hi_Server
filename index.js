const express = require(`express`);
const db = require(`./utils/database`);
const bodyParser = require(`body-parser`);
const Users = require(`./Models/users-model`);
const Messages = require(`./Models/messages-model`);
const Groups = require(`./Models/group-model`);
const GroupMembers = require(`./Models/group-member-model`);
const usersRouter = require(`./Routers/users-router`);
const chatRouter = require(`./Routers/chat-router`);
const http = require('http');
const { Server } = require('socket.io');
const cors = require(`cors`);
const jwt = require('jsonwebtoken'); // Needed for socket auth
const { v4: uuidv4 } = require('uuid'); // Needed for message IDs in socket handlers
const { Op, where } = require('sequelize'); // Needed for queries in socket handlers
require('dotenv').config();



const PORT = process.env.PORT || 4000;

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.JWT_SECRET_KEY) {
    console.error('Missing required environment variables');
    process.exit(1);
  }


const app = express();

const corsOptions = {
    origin: "*", // Replace with your frontend URL in production 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };


app.use(cors(corsOptions));
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

//socket.io
// --- HTTP Server and Socket.IO Setup ---
const server = http.createServer(app); // Create HTTP server from Express app
const io = new Server(server, {
    cors: corsOptions // Use the same CORS options
});

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token; // Client MUST send token in auth object
    if (!token) {
        console.error('Socket Auth Error: Token missing');
        return next(new Error('Authentication error: Token missing'));
    }
    try {
        // Verify the JWT token using your secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const validUser =  await Users.findByPk(decoded.userId);

        if(!validUser){
            return next(new Error('Authentication error: Invalid User'));
        };

        // Attach userId & name to the socket object
        socket.userId = decoded.userId;
        socket.name = decoded.name; 

        console.log(`Socket Auth Success: User ${socket.userId} authenticated.`);
        next();

    } catch (err) {
        console.error("Socket Auth Error:", err.message);
        next(new Error('Authentication error: Invalid token'));
    }
});


//In-memory map to track all login user
const userSocketMap = new Map();

//socket connection
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}, UserID: ${socket.userId}`);

    //mapping the connected userId to socket id
    userSocketMap.set(socket.userId, socket.id);
    console.log(`Current Online user:`, Array.from(userSocketMap.keys()));

    /*--------------------------------Private message connection---------------------------------------*/
    socket.on('sendMessage', async(data) => {
        const { receiverId, content } = data;
        const senderId = socket.userId;

        console.log(`Private message received from ${senderId} to ${receiverId}`);

        try {
            const receiverExists = await Users.findByPk(receiverId);
            if(!receiverExists){
                console.log(`Receiver user ${receiverId} not found!`);

                return socket.emit('sendMessageError', {
                    message: 'Recipient user not found!'
                });
            }

            //Saving messasge to database
            const msgId = uuidv4();
            const newMessage = await Messages.create({
                id: msgId,
                messageContent: content,
                isGroupMessage: false,
                senderId: senderId,
                receiverId: receiverId
            });

            //payload to send emit back to socket
            const messagePayload = {
                id: newMessage.id,
                content: newMessage.messageContent,
                senderId: newMessage.senderId,
                receiverId: newMessage.receiverId,
                createdAt: newMessage.createdAt,
                senderName: socket.name,
            } 

             // 4. Find recipient's socket ID
             const recipientSocketId = userSocketMap.get(receiverId);

             // 5. Emit message to the recipient IF they are online
             if (recipientSocketId) {
                 console.log(`Emitting 'newMessage' to socket ${recipientSocketId} (User ${receiverId})`);
                 io.to(recipientSocketId).emit('newMessage', messagePayload);
             } else {
                 console.log(`User ${receiverId} is not online. Message saved.`);
                 // TODO: Implement push notifications or other offline handling if needed
             }

            console.log(`new mesage from socket:`, messagePayload);

            socket.emit('messageSentConfirmation' ,{
                success: true,
                dbMessage: messagePayload
            })

            
        } catch (error) {
            console.error('Error handling sendMessage:', error);
            socket.emit('sendMessageError', { message: 'Internal server error saving or sending message.' });
        }
    });




    /*--------------------------------Group message connection---------------------------------------*/

    //--Joining Group
    socket.on('joinGroup', async (groupId) => {
        try {
            isMember = await GroupMembers.findOne({
                where : { userId: socket.userId, groupId: groupId }
            });

            if(isMember){
                const roomName = `group_${groupId}`;
                socket.join(groupId);
                console.log(`User ${socket.userId} (${socket.id}) joined room: ${roomName}`);
            }else{
                console.log(`User ${socket.userId} attempted to join group ${groupId} but is not a member.`);
                socket.emit('groupJoinError', { groupId, message: 'You are not a member of this group.' });
            }

        } catch (error) {
            console.error(`Error joining group ${groupId} for user ${socket.userId}:`, error);
            socket.emit('groupJoinError', { groupId, message: 'Server error joining group.' });
        }
    });


    //--Handle Group Message-----
    socket.on('sendGroupMessage', async (data) => {

        const { groupId, content, tempId } = data;
        const senderId = socket.userId;

        console.log(`Group message received for group ${groupId} from ${senderId}`);

        try {
            
            const isGroupExist = await Groups.findByPk(groupId);

            if(!isGroupExist){
                console.log(`Group ${groupId} not found.`);
                return socket.emit('sendMessageError', { tempId, groupId, message: 'Group not found.' });
            }

            const isMemberExist = await GroupMembers.findOne({
                where : { groupId: groupId, userId: senderId }
            });

            if(!isMemberExist){
                console.log(`User ${senderId} is not a member of group ${groupId}.`);
                return socket.emit('sendMessageError', { tempId, groupId, message: 'You are not a member of this group.' });
            }

            const msgId = uuidv4();

            const newGroupMessage = await Messages.create({
                id: msgId,
                messageContent: content,
                isGroupMessage: true,
                senderId: senderId,
                groupId: groupId,
            });

            const groupMessagePayload = {
            id: newGroupMessage.id,
            content: newGroupMessage.messageContent,
            senderId: newGroupMessage.senderId,
            createdAt: newGroupMessage.createdAt,
            senderName: socket.name,
            }

            io.to(groupId).emit('newGroupMessage', groupMessagePayload);

            socket.emit('groupMessageSentConfirmation', {
                success: true,
                tempId: tempId,
                dbMessage: groupMessagePayload
            });

        } catch (error) {
            console.error(`Error handling sendGroupMessage for group ${groupId}:`, error);
            socket.emit('sendMessageError', { tempId, groupId, message: 'Internal server error sending group message.' });
        }
    });





    /*------------------Socket Disconnect listner----------------*/ 
    socket.on(`disconnect`, () => {
        console.log(`User: ${socket.userId} from socket: ${socket.id}`)

        if(socket.userId && userSocketMap.get(socket.userId) === socket.id){
            userSocketMap.delete(socket.userId);
            console.log(`Removed user ${socket.userId} from socket map.`);
        }

        console.log(`Current Online user:`, Array.from(userSocketMap.keys()));
    })


     // -------------------- Handle Socket Errors ------------------------
     socket.on('error', (err) => {
        console.error(`Socket Error on ${socket.id} (User ${socket.userId}):`, err);
   });

});






//sync the database
db.sync(/* { force : true } */)
.then(() => {
    console.log(`Connected with DB!`);
    server.listen(PORT, () => {
        console.log(`Server running @ PORT:${PORT}`);
        console.log(`Socket.IO listening on port ${PORT}`);
    });
}).catch((err) => {
    console.log(err)
})