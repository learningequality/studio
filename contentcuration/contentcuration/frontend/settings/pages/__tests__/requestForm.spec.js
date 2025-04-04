import { mount } from '@vue/test-utils';
import { factory } from '../../store';
import RequestForm from '../Storage/RequestForm';

const store = factory();

const minimumForm = {
  storage: 'storage',
  kind: 'kind',
  resource_count: 'resource_count',
  creators: 'creators',
  license: ['test'],
  audience: 'audience',
  import_count: 'import_count',
  org_or_personal: 'org_or_personal',
  message: 'message',
};

function makeWrapper() {
  return mount(RequestForm, {
    store,
    propsData: {
      value: true,
    },
    computed: {
      user() {
        return {};
      },
    },
  });
}

describe('requestForm', () => {
  let wrapper;
  let requestStorage;

  beforeEach(() => {
    wrapper = makeWrapper();
    wrapper.setData({
      form: {
        ...minimumForm,
      },
    });
    requestStorage = jest.spyOn(wrapper.vm, 'requestStorage');
    requestStorage.mockImplementation(() => Promise.resolve());
  });

  describe('toggleLicense', () => {
    it('should add license to list if it is not there', () => {
      wrapper.vm.toggleLicense('CC BY');
      expect(wrapper.vm.license.includes('CC BY')).toBe(true);
    });
    it('should remove license from list if it is there', () => {
      wrapper.vm.license = ['CC BY'];
      wrapper.vm.toggleLicense('CC BY');
      expect(wrapper.vm.license.includes('CC BY')).toBe(false);
    });
  });
  describe('validation', () => {
    it('should fail if any of the required fields are null', () => {
      function test(field) {
        wrapper.vm.resetValidation();
        wrapper.vm[field] = undefined;
        wrapper.vm.submit();
        expect(wrapper.vm.errors[field]).toBe(true);
        expect(requestStorage).not.toHaveBeenCalled();
      }
      [
        'storage',
        'kind',
        'resource_count',
        'creators',
        'audience',
        'import_count',
        'org_or_personal',
        'message',
      ].forEach(test);
    });
    it('should fail if license is not set', () => {
      wrapper.vm.license = [];
      wrapper.vm.submit();
      expect(wrapper.vm.errors.license).toBe(true);
      expect(requestStorage).not.toHaveBeenCalled();
    });
    it('should fail if organization fields are not set if org_or_personal is Organization', () => {
      wrapper.vm.org_or_personal = 'Organization';
      wrapper.vm.submit();
      expect(wrapper.vm.errors.organization).toBe(true);
      expect(wrapper.vm.errors.organization_type).toBe(true);
      expect(requestStorage).not.toHaveBeenCalled();
    });
    it('should fail if other org type is not set if organization_type is Other', () => {
      wrapper.vm.org_or_personal = 'Organization';
      wrapper.vm.organization_type = 'Other';
      wrapper.vm.submit();
      expect(wrapper.vm.errors.organization_other).toBe(true);
      expect(requestStorage).not.toHaveBeenCalled();
    });
    it('should succeed if org_or_personal is not Organization and org fields are not set', () => {
      wrapper.vm.org_or_personal = 'Not affiliated';
      wrapper.vm.submit();
      expect(wrapper.vm.errors.organization).toBeUndefined();
      expect(wrapper.vm.errors.organization_type).toBeUndefined();
      expect(wrapper.vm.errors.organization_other).toBeUndefined();
    });
  });
  describe('submission', () => {
    it('should call requestStorage', () => {
      wrapper.vm.submit();
      expect(requestStorage).toHaveBeenCalled();
    });
    it('should set lists to be comma-separated', () => {
      wrapper.vm.license = ['license-1', 'license-2'];
      wrapper.vm.publicChannels = ['channel-1', 'channel-2'];
      wrapper.vm.location = ['location-1', 'location-2'];
      wrapper.vm.submit();
      const data = requestStorage.mock.calls[0][0];
      expect(data.license).toBe(wrapper.vm.license.join(', '));
      expect(data.public).toBe(wrapper.vm.publicChannels.join(', '));
      expect(data.location).toBe(wrapper.vm.location.join(', '));
    });
    describe('organization fields', () => {
      beforeEach(() => {
        wrapper.vm.org_or_personal = 'Organization';
        wrapper.vm.organization = 'Test organization';
        wrapper.vm.organization_type = 'Some org type';
      });
      it('should set uploading_for to organization name if org is selected', () => {
        wrapper.vm.submit();
        expect(requestStorage.mock.calls[0][0].uploading_for).toBe(
          `${wrapper.vm.organization} (organization)`,
        );
      });
      it('should set uploading_for to Not affiliated if org_or_personal is not Organization', () => {
        wrapper.vm.org_or_personal = 'Not affiliated';
        wrapper.vm.submit();
        expect(requestStorage.mock.calls[0][0].uploading_for).toBe('Not affiliated');
      });
      it('should set organization type to organization_other if Other is selected', () => {
        wrapper.vm.organization_type = 'Other';
        wrapper.vm.organization_other = 'Test organization type';
        wrapper.vm.submit();
        expect(requestStorage.mock.calls[0][0].organization_type).toBe(
          wrapper.vm.organization_other,
        );
      });
      it('should set organization type to Not applicable if organization is not selected', () => {
        wrapper.vm.org_or_personal = 'Not affiliated';
        wrapper.vm.submit();
        expect(requestStorage.mock.calls[0][0].organization_type).toBe('Not applicable');
      });
    });
  });
});
