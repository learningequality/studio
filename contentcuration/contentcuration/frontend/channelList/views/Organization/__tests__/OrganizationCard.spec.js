import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createLocalVue } from '@vue/test-utils';
import VueRouter from 'vue-router';
import OrganizationCard from '../OrganizationCard.vue';
import { RouteNames } from '../../../constants';

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
  it('emits "click" when the card title is clicked', async () => {
    const router = new VueRouter();
    const { container, emitted } = render(OrganizationCard, {
      localVue,
      router,
      props: baseProps(),
    });

    const user = userEvent.setup();
    await user.click(container.querySelector('[data-focus="true"]'));

    expect(emitted().click).toBeTruthy();
  });

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
    await user.click(screen.getByRole('button', { name: 'More options for Acme' }));
    await user.click(screen.getByText('Edit organization'));

    expect(router.currentRoute.name).toBe(RouteNames.ORGANIZATION_EDIT);
    expect(router.currentRoute.params).toMatchObject({ organizationId: 'org-1', tab: 'details' });
  });
});
