import { toPairs } from 'lodash';
import { queryFromPagination } from '../router';
import { defaultPagination } from '../constants';

describe('pagination and query helpers', () => {
  test('we can get a minimal query from some pagination state', () => {
    let pagination = { ...defaultPagination(), sortBy: 'quality' };
    let query = queryFromPagination(pagination);
    expect(toPairs(query)).toEqual([['sortBy', 'quality']]);
  });
});
