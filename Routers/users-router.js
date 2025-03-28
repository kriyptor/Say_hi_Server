const express = require(`express`);
const userController = require(`../Controllers/user-controller`);
const router = express.Router();


router.post('/sign-in', userController.loginUser);

router.post('/sign-up', userController.createUser);


module.exports = router;