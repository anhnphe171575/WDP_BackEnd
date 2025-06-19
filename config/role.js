const ROLES = {
    ADMIN_DEVELOPER: 0,
    CUSTOMER: 1 << 0,
    ORDER_MANAGER: 1 << 1,
    MARKETING_MANAGER: 1 << 2,
    CUSTOMER_SERVICE: 1 << 3,
    ADMIN_BUSINESS: 1 << 4
}
module.exports = { ROLES };