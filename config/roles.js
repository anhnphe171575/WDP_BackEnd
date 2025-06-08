const ROLES = {
    ADMIN_DEVELOPER: 0,
    CUSTOMER: 1 << 0,
    ORDER_MANAGER: 1 << 1,
    MARKETING_MANAGER: 1 << 2,
    WAREHOUSE_STAFF: 1 << 3,
    CUSTOMER_SERVICE: 1 << 4,
    ADMIN_BUSINESS: 1 << 5,
};

const hasRole = (userRoles, requiredRole) => {
    return (userRoles & requiredRole) === requiredRole;
};


module.exports = { ROLES, hasRole };
