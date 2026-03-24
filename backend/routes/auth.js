import express from 'express';
const router = express.Router();
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';

// ─── SIGNUP ──────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // 1. Check if user already exists
        const existing = await prisma.user.findUnique({
            where: { email }
        });
        if (existing) {
            return res.status(400).json({ error: "Email already registered" });
        }

        // 2. Hash password (never store plain text)
        const hashed = await bcrypt.hash(password, 10);

        // 3. Create user
        const user = await prisma.user.create({
            data: { name, email, password: hashed }
        });

        // 4. Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token, userId: user.id, name: user.name });

    } catch (err) {
        console.log("signup error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ─── LOGIN ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        // 2. Compare password
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        // 3. Generate token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ token, userId: user.id, name: user.name });

    } catch (err) {
        console.log("login error:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
