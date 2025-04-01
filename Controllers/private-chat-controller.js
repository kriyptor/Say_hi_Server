const Messages = require(`../Models/messages-model`);
const Users = require(`../Models/users-model`);
const { v4: uuidv4 } = require('uuid');
const { Op } = require(`sequelize`);

exports.getPrivateChats = async (req, res) => {
    try {
        const currentUser = req.user.id;

        const interactions = await Messages.findAll({
            where :{
                isGroupMessage: false,
                [Op.or] : [
                    { senderId: currentUser },
                    { receiverId: currentUser }
                ]
            },

            attributes: [`senderId`, `receiverId`],

            include: [
                { model: Users, as: `Sender`, attributes: [`id`, `name`] },
                { model: Users, as: `Receiver`, attributes: [`id`, `name`] },
            ],

            group: [`senderId`, `receiverId`],

        });

        const uniqueUsers = new Set(); // Use Set to avoid duplicates
        const userList = []; // Final array for response

        interactions.forEach(data => {
            if (data.senderId !== currentUser) {
                const userId = data.senderId;
                if (!uniqueUsers.has(userId)) {
                    uniqueUsers.add(userId);
                    userList.push({  id: data.senderId,  name: data.Sender.name });
                }
            } else {
                const userId = data.receiverId;
                if (!uniqueUsers.has(userId)) {
                    uniqueUsers.add(userId);
                    userList.push({ id: data.receiverId, name: data.Receiver.name });
                }
            }
        });


        res.status(200).json({ data : userList });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}


exports.getConversations = async (req, res) => {
    try {
        
        const receiverUser  = req.query.receiverUser;

        const currentUser = req.user.id;

        const userExists = await Users.findByPk(receiverUser);

        if(!userExists){
            return res.status(404).json({
                success: false,
                message: 'User Not Found',
            })
        }

        const messages = await Messages.findAll({
            where: {
                isGroupMessage: false,
                [Op.or] : [
                    { senderId: currentUser, receiverId: receiverUser },
                    { senderId: receiverUser, receiverId: currentUser },
                ]
            },
            order: [[`createdAt`, `ASC`]],
            include: [
                { model: Users, as: `Sender`, attributes: [`id`, `name`] },
                { model: Users, as: `Receiver`, attributes: [`id`, `name`] },
            ]
        });

        const formattedMessages = messages.map(message => ({
            id: message.id,
            content: message.messageContent,
            senderId: message.senderId,
            receiverId: message.receiverId,
            createdAt: message.createdAt,
            senderName: message.senderId === currentUser ? `You` : message.Sender.name,
        }));

        return res.status(200).json({
            success: true,
            chatData: formattedMessages
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}


exports.sendMessage = async (req, res) => {
    try {
        
        const { receiverUser, content } = req.body;

        const senderUser = req.user.id;

        const userExists = await Users.findByPk(receiverUser);

        if(!userExists){
            return res.status(404).json({
                success: false,
                message: 'User Not Found',
            })
        }

        const msgId = uuidv4();

        const messages = await Messages.create({
            id: msgId,
            messageContent: content,
            isGroupMessage: false,
            senderId: senderUser,
            receiverId: receiverUser
        });

        return res.status(201).json({
            success: true,
            message: `Message Send!`
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}