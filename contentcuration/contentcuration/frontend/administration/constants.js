export const RouterNames = {
  CHANNELS: 'CHANNELS',
  CHANNEL: 'CHANNEL',
  USERS: 'USERS',
  USER: 'USER',
};

export function defaultPagination() {
  return {
    descending: true,
    page: 1,
    rowsPerPage: 4,
    sortBy: 'name',
    rowsPerPageItems: [1, 2, 4, 8, 16],
  };
}
