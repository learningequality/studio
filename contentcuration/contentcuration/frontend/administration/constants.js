export const RouterNames = {
  CHANNELS: 'CHANNELS',
  CHANNEL: 'CHANNEL',
  USERS: 'USERS',
  USER: 'USER',
};

export const rowsPerPageItems = [25, 50, 75, 100];

export const userFilterTypes = [
  { key: 'all', label: 'All', backendParams: {} },
  { key: 'active', label: 'Active', backendParams: { is_active: 'True' } },
  { key: 'inactive', label: 'Inactive', backendParams: { is_active: 'False' } },
  { key: 'administrator', label: 'Administrator', backendParams: { is_admin: 'True' } },
  { key: 'sushichef', label: 'Sushi Chef', backendParams: { chef_channels_count__gt: '0' } },
];

export const filterTypes = [...userFilterTypes].reduce((prev, current) => {
  prev[current.key] = current;
  return prev;
}, {});
