const Messages = require(`../Models/messages-model`);
const Users = require(`../Models/users-model`);
const { v4: uuidv4 } = require('uuid');
const { Op } = require(`sequelize`);

exports.getConversations = async (req, res) => {
    try {
        
        const receiverUser  = req.query.receiverUser;

        const senderUser = req.user.id;

        const userExists = await Users.findByPk(receiverUser);

        console.log(receiverUser, userExists, senderUser);

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
                    { senderId: senderUser, receiverId: receiverUser },
                    { senderId: receiverUser, receiverId: senderUser },
                ]
            },
            order: [[`createdAt`, `ASC`]],
            include: [
                { model: Users, as: `Sender`, attributes: [`id`, `name`] },
                { model: Users, as: `Receiver`, attributes: [`id`, `name`] },
            ]
        });

        return res.status(200).json({
            success: true,
            chatData: messages
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