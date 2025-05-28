const Roles = {
  MarketingManager: 2,
  WarehouseStaff: 8,
  AdminDev: 32
};

const requestedRole = Roles.AdminDev;


if ((userRoles & requestedRole) === requestedRole) {
  console.log("Cho phép truy cập với vai trò AdminDev");
} else {
  console.log("Không có quyền");
}
