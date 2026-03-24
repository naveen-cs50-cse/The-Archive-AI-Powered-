import jwt from 'jsonwebtoken';

export default function authMiddleware(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId; // attach userId to request
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}