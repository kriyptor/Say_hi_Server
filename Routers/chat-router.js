const express = require(`express`);
const privateChatController = require(`../Controllers/private-chat-controller`);
const groupChatController = require(`../Controllers/group-chat-controller`);
const { authenticate } = require(`../Middleware/auth`);
const router = express.Router();


router.get('/get-messages', authenticate, privateChatController.getConversations);

router.get('/get-all-group', authenticate, groupChatController.getAllGroups);

router.get('/get-private-chat', authenticate, privateChatController.getPrivateChats);

router.post('/post-messages', authenticate, privateChatController.sendMessage);

router.post('/create-group', authenticate,  groupChatController.createGroup);

router.post('/post-message-group', groupChatController.sendGroupMessage);

router.get('/get-message-group', authenticate, groupChatController.getAllGroupMessages);

router.post('/remove-group-member', authenticate, groupChatController.removeGroupMember);

router.post('/get-group', authenticate, groupChatController.getGroupData);


module.exports = router;