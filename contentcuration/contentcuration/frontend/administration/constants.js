export const RouterNames = {
  CHANNELS: 'CHANNELS',
  CHANNEL: 'CHANNEL',
  USERS: 'USERS',
  USER: 'USER',
};

export function defaultPagination(routeName) {
  let defaults = {
    descending: false,
    page: 1,
    rowsPerPage: 4,
    sortBy: 'name',
    rowsPerPageItems: [1, 2, 4, 8, 16],
    filter: 'all',
  };

  if (routeName == RouterNames.CHANNELS) {
    Object.assign(defaults, {
      filter: 'allchannels',
    });
  } else if (routeName == RouterNames.USERS) {
    Object.assign(defaults, {
      sortBy: 'last_name',
    });
  }

  return defaults;
}

export const userFilterTypes = [
  { key: 'all', label: 'All', backendParams: {} },
  { key: 'active', label: 'Active', backendParams: { is_active: 'True' } },
  { key: 'inactive', label: 'Inactive', backendParams: { is_active: 'False' } },
  { key: 'administrator', label: 'Administrator', backendParams: { is_admin: 'True' } },
  { key: 'sushichef', label: 'Sushi Chef', backendParams: { chef_channels_count__gt: '0' } },
];

export const channelFilterTypes = [
  { key: 'allchannels', label: 'All', backendParams: { all: 'True' } },
];

export const filterTypes = [...userFilterTypes, ...channelFilterTypes].reduce((prev, current) => {
  prev[current.key] = current;
  return prev;
}, {});
