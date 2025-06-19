const ROLES = {
    ADMIN_DEVELOPER: 0,
    CUSTOMER: 1 << 0,
    ORDER_MANAGER: 1 << 1,
    MARKETING_MANAGER: 1 << 2,
    ADMIN_BUSINESS: 1 << 3
}
module.exports = { ROLES };