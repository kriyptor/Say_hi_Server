const express = require(`express`);
const userController = require(`../Controllers/user-controller`);
const { authenticate } = require(`../Middleware/auth`);
const router = express.Router();


router.post('/sign-in', userController.loginUser);

router.post('/sign-up', userController.createUser);

router.get('/get-all-users', authenticate, userController.getAllUsers);


module.exports = router;