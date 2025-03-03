export function count(state) {
  return state.pageData.count;
}

export function users(state) {
  return state.pageData.results;
}

export function getUser(state) {
  return function (userId) {
    return state.usersMap[userId];
  };
}

export function getUsers(state) {
  return function (userIds) {
    return userIds.map(id => getUser(state)(id));
  };
}
