import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import open from 'open';
import { setupSocketHandlers } from './socket';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json());

// Serve static files from the built frontend
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// API Routes (Placeholder)
app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// Socket.io Setup
setupSocketHandlers(io);

httpServer.listen(PORT, async () => {
    console.log(`🚀 Deploy-MCP Server running at http://localhost:${PORT}`);

    // Only open browser if not in CI/test
    if (!process.env.CI) {
        try {
            await open(`http://localhost:${PORT}`);
        } catch (err) {
            console.error('Failed to open browser:', err);
        }
    }
});
