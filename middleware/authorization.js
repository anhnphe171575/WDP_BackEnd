function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        const userRole = req.user.role; // giả sử role ở dạng số nguyên bitmask
    
        if (!req.user) {
          return res.status(401).json({ message: 'Chưa xác thực' });
        }
    
        
        if ((userRole & requiredRoles) === 0) {
          return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
        }
    
        next();
      };
  }
  
  module.exports = authorizeRoles;
  