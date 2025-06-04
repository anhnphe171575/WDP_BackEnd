const { hasRole } = require('./roles');

const authorizeRole = (requiredRole) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !hasRole(user.roles, requiredRole)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};

module.exports = { authorizeRole };
