const express = require('express');
const path = require('path');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Log all requests for debugging
app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.url}`);
    next();
});

// Register all routes
app.use('/', routes);

// 404 handler for debugging
app.use((req, res) => {
    console.log(`❌ 404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Route not found', path: req.url });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📝 Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`🎯 Modular architecture loaded`);
});

// Serve static files - this is CRITICAL
app.use(express.static(path.join(__dirname, '../public')));

// Specifically serve simulation assets
app.use('/js/simulations/assets', express.static(path.join(__dirname, '../public/js/simulations/assets')));