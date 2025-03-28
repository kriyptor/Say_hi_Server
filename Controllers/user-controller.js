const bcrypt = require(`bcrypt`);
const Users = require("../Models/users-model");
const jwt = require(`jsonwebtoken`);
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

function isStringInvalid(string) {
    return string === undefined || string.length === 0;
}

const generateAccessToken = (id, name) => {
    return jwt.sign({ userId : id,  name : name }, process.env.JWT_SECRET_KEY);
}

exports.createUser = async (req, res) => {
    try {
        const { name, email, phoneNumber, password } = req.body;
        
        // Validate inputs
        if (isStringInvalid(name) || isStringInvalid(email) || isStringInvalid(password)) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        

        const isUserExist = await Users.findOne({ where: { email: email } });

        if (isUserExist) {
            return res.status(400).json({
                success: false,
                message: `User already exists!`
            });
        }

        const newId = uuidv4();
        const salt = 10;
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = await Users.create({
            id: newId,
            name: name,
            email: email,
            phoneNumber: phoneNumber,
            password: hashedPassword,
        });

        return res.status(201).json({
            success: true,
            message: 'Successfully created new user'
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

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate inputs
        if (isStringInvalid(email) || isStringInvalid(password)) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        const user = await Users.findOne({ where: { email: email } });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: `User does not exist!`
            });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: `Invalid credentials!`
            });
        }

        const token = generateAccessToken(user.id, user.name);

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token: token
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