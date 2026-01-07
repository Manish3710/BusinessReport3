const express = require('express');
const bcrypt = require('bcryptjs');
const { executeProcedure, oracledb } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Hash the password to compare with stored hash
        const users = await executeProcedure(
            'SELECT USER_ID, USERNAME, EMAIL, PASSWORD_HASH, FIRST_NAME, LAST_NAME, ROLE, IS_ACTIVE FROM USERS WHERE USERNAME = :username AND IS_ACTIVE = 1',
            { username }
        );

        if (users.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.PASSWORD_HASH);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await executeProcedure(
            'UPDATE USERS SET LAST_LOGIN = CURRENT_TIMESTAMP WHERE USER_ID = :userId',
            { userId: user.USER_ID }
        );

        // Generate token
        const token = generateToken(user);

        // Return user data without password
        const { PASSWORD_HASH, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, firstName, lastName } = req.body;

        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Generate user ID
        const userIdResult = await executeProcedure(
            'SELECT FN_GENERATE_ID(:prefix) as USER_ID FROM DUAL',
            { prefix: 'USR' }
        );
        const userId = userIdResult.rows[0].USER_ID;

        // Create user using stored procedure
        const result = await executeProcedure(
            'BEGIN SP_CREATE_USER(:userId, :username, :email, :passwordHash, :firstName, :lastName, :role, :createdBy, :result); END;',
            {
                userId,
                username,
                email,
                passwordHash,
                firstName,
                lastName,
                role: 'user',
                createdBy: 'SYSTEM',
                result: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 }
            }
        );

        if (result.outBinds.result === 'SUCCESS') {
            res.json({
                success: true,
                message: 'User registered successfully',
                userId
            });
        } else {
            res.status(400).json({ error: result.outBinds.result });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production');
        
        // Get fresh user data
        const result = await executeProcedure(
            'SELECT USER_ID, USERNAME, EMAIL, FIRST_NAME, LAST_NAME, ROLE, IS_ACTIVE FROM USERS WHERE USER_ID = :userId AND IS_ACTIVE = 1',
            { userId: decoded.userId }
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;