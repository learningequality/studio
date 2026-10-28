import router from '../router';
import { RouteNames } from '../constants';

describe('organization routes', () => {
  it.each(['/organizations', '/my-organizations'])('opens the organization list at %s', path => {
    expect(router.resolve(path).route.name).toBe(RouteNames.MY_ORGANIZATIONS);
  });

  it.each(['/organizations/new', '/organization/new'])('opens the creation form at %s', path => {
    expect(router.resolve(path).route.name).toBe(RouteNames.NEW_ORGANIZATION);
  });

  it.each(['/organizations/org-1', '/organization/org-1/details'])(
    'opens organization details at %s',
    path => {
      const route = router.resolve(path).route;
      expect(route.name).toBe(RouteNames.ORGANIZATION_EDIT);
      expect(route.params.organizationId).toBe('org-1');
    },
  );
});
