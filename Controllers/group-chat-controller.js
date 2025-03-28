const Groups = require(`../Models/group-model`);
const GroupMembers = require(`../Models/group-member-model`);
const Users = require(`../Models/users-model`);
const Messages = require(`../Models/messages-model`);
const db = require(`../utils/database`);
const { v4: uuidv4 } = require('uuid');
const { Op } = require(`sequelize`);


exports.createGroup = async (req, res) => {
    
    const transaction = await db.transaction();

    try {
        const { groupName, memberIds } = req.body;
        
        const adminId = req.user.id;

        // Validate member count (max 5 including admin)
        if (!memberIds || !Array.isArray(memberIds)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Member IDs must be provided as an array' });
        }
      
        // Remove duplicates and ensure admin is not in memberIds
        const uniqueMemberIds = [...new Set(memberIds.filter(id => id !== adminId))];

        // Check total member count (including admin)
        if (uniqueMemberIds.length + 1 > 3) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Group cannot have more than 3 members' });
        }

        const newGrpId = uuidv4();

        //creating new group
        const newGroup = await Groups.create({
            id: newGrpId,
            name: groupName,
            adminId: adminId
        }, { transaction });

        console.log("New group id", newGroup.id);

        const newGrpMemId = uuidv4();

        await GroupMembers.create({
            id:newGrpMemId,
            userId: adminId,
            groupId: newGroup.id
        }, { transaction });

        //add other members
        await Promise.all(uniqueMemberIds.map(async userId => {
            const newGrpMemId = uuidv4();
            
            return await GroupMembers.create({
                id: newGrpMemId,
                userId: userId,
                groupId: newGroup.id
            }, { transaction });
        }));

        await transaction.commit();

        //retrieve group member details
        const groupWithMembers = await Groups.findAll({
            where : { id: newGroup.id },
            include: [
                { model: Users, as: 'Admin', attributes: ['id', 'name'] },
                { model: Users, as: 'members', through: { attributes: [] }, attributes: ['id', 'name'] }
            ]
        });

        return res.status(201).json({
            success: true,
            message: 'Group Created!',
            data: groupWithMembers
        });

    } catch (error) {
        await transaction.rollback();

        console.log(error);
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}


exports.sendGroupMessage = async (req, res) => {
    try {
        const { groupId, content } = req.body;

        const senderId = req.user.id;

        const isGroupExist = await Groups.findByPk(groupId);

        if(!isGroupExist){
            return res.status(404).json({ message : `Group not found!` });
        }

        const isMember = await GroupMembers.findOne({
            where : { groupId: groupId, userId: senderId }
        });

        if(!isMember){
            return res.status(403).json({ message: `You are not member of this group` });
        }

        const newGrpMsgId = uuidv4();

        const newGroupMessage = await Messages.create({
            id: newGrpMsgId,
            messageContent: content,
            isGroupMessage: true,
            senderId: senderId,
            groupId: groupId
        });

        const messageWithSender = await Messages.findByPk(newGrpMsgId, {
            include: [
                { model: Users, as: `Sender`, attributes: [`id`, `name`] }
            ]
        });

        return res.status(201).json({
            data : messageWithSender
        })


    } catch (error) {
        console.log(error);
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}


exports.getAllGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.body;

        const senderId = req.user.id;

        const isGroupExist = await Groups.findByPk(groupId);

        if(!isGroupExist){
            return res.status(404).json({ message : `Group not found!` });
        }

        const isMember = await GroupMembers.findOne({
            where : { groupId: groupId, userId: senderId }
        });

        if(!isMember){
            return res.status(403).json({ message: `You are not member of this group` });
        }

        const newGrpMsgId = uuidv4();

        const allGroupMessage = await Messages.findAll({
          where: {
            groupId: groupId,
            isGroupMessage: true
          },
          order: [[`createdAt`, `ASC`]],
          include: [
            { model: Users, as: `Sender`, attributes: [`id`, `name`] }
          ]
        });

        return res.status(200).json({
            data : allGroupMessage
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}

exports.removeGroupMember = async (req, res) => {
    try {
        const { userId, groupId } = req.body;

        const adminId = req.user.id;

        if(userId === adminId){
            return res.status(400).json({ message: 'Admin cannot remove themselves from the group' });
        }

        const isGroup = await Groups.findByPk(groupId);

        if(!isGroup){
            return res.status(404).json({ message: 'Group not found' });
        };

        if(isGroup.adminId !== adminId){
            return res.status(403).json({ message: 'Only the group admin can remove members' });
        };

        const memberToRemove = await GroupMembers.findOne({
            where: {
                userId: userId,
                groupId: groupId
            }
        });

        if(!memberToRemove){
            return res.status(400).json({ message: 'Admin cannot remove themselves from the group' });
        }

        await memberToRemove.destroy();

        return res.status(200).json({
            success: true,
            message: 'Member has been removed',
        })
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
}


exports.getGroupData = async (req, res) => {
    try {
        const { groupId } = req.body;

        //retrieve group member details
        const groupWithMembers = await Groups.findByPk(groupId, {
            include: [
                { model: Users, as: 'Admin', attributes: ['id', 'name'] },
                { model: Users, as: 'members', through: { attributes: [] }, attributes: ['id', 'name'] }
            ]
        });

        return res.status(201).json({
            success: true,
            groupData: groupWithMembers
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