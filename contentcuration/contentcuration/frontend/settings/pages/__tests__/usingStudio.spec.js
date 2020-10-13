import { mount } from '@vue/test-utils';
import UsingStudio from '../UsingStudio/index';

function makeWrapper() {
  return mount(UsingStudio);
}

describe('usingStudio tab', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('clicking privacy link should open policies modal', () => {
    wrapper.find('[data-test="policy-link"]').trigger('click');
    expect(wrapper.vm.showPrivacyPolicy).toBe(true);
  });
  it('clicking terms of service link should open tos modal', () => {
    wrapper.find('[data-test="tos-link"]').trigger('click');
    expect(wrapper.vm.showTermsOfService).toBe(true);
  });
  it('clicking community standards link should open standards modal', () => {
    wrapper.find('[data-test="communitystandards-link"]').trigger('click');
    expect(wrapper.vm.showCommunityStandards).toBe(true);
  });
});
