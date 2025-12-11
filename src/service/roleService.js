import { Role } from "../model/entity/index.js";

const createRole = async ({ name }) => {
  await Role.create({ name });
};

const updateRole = async ({ roleId, name }) => {
  const role = Role.findByPk(roleId);
  await role.update({ name });
};

const deleteRole = async ({ roleId }) => {
  const role = Role.findByPk(roleId);
  await role.destroy();
};

export default { updateRole, createRole, deleteRole };
