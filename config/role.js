const ROLES = {
    ADMIN_DEVELOPER: 0, //0
    CUSTOMER: 1 << 0, // 1
    ORDER_MANAGER: 1 << 1,
    MARKETING_MANAGER: 1 << 2, //4
    ADMIN_BUSINESS: 1 << 3 //8
}
module.exports = { ROLES };