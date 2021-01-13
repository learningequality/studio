// Constant values for Roles sorted by value
const Roles = new Set(['coach', 'learner']);

export default Roles;

export const RolesList = Array.from(Roles);

export const RolesNames = {
  COACH: 'coach',
  LEARNER: 'learner',
};
