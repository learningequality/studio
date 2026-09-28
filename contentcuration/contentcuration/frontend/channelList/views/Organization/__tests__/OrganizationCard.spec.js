import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import OrganizationCard from '../OrganizationCard.vue';
import { RouteNames } from '../../../constants';
import { organizationStrings } from 'shared/strings/organizationStrings';

const localVue = createLocalVue();
localVue.use(VueRouter);

const baseProps = () => ({
  organization: {
    id: 'org-1',
    name: 'Acme',
    description: 'A learning organization',
    role: 'admin',
  },
  headingLevel: 2,
});

describe('OrganizationCard', () => {
  it('navigates to the organization edit page from the options menu', async () => {
    const router = new VueRouter({
      routes: [
        {
          name: RouteNames.ORGANIZATION_EDIT,
          path: '/organization/:organizationId/:tab',
          component: { template: '<div>Edit</div>' },
        },
      ],
    });
    render(OrganizationCard, { localVue, router, props: baseProps() });

    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: organizationStrings.moreOptions$({ name: 'Acme' }) }),
    );
    await user.click(screen.getByText(organizationStrings.editOrganization$()));

    expect(router.currentRoute.name).toBe(RouteNames.ORGANIZATION_EDIT);
    expect(router.currentRoute.params).toMatchObject({ organizationId: 'org-1', tab: 'details' });
  });
});
