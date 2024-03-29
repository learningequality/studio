import { mount } from '@vue/test-utils';
import router from '../../router';
import { uses, sources } from '../../constants';
import Create from '../Create';

const connectionStateMocks = {
  $store: {
    state: {
      connection: {
        offline: true,
      },
    },
  },
};

const defaultData = {
  first_name: 'Test',
  last_name: 'User',
  email: 'test@test.com',
  password1: 'pass',
  password2: 'pass',
  uses: ['tagging'],
  storage: '',
  other_use: '',
  locations: ['China'],
  source: 'demo',
  organization: '',
  conference: '',
  other_source: '',
  accepted_policy: true,
  accepted_tos: true,
};

const register = jest.fn();

function makeWrapper(formData) {
  const wrapper = mount(Create, {
    router,
    computed: {
      getPolicyAcceptedData() {
        return () => {
          return {};
        };
      },
    },
    stubs: ['PolicyModals'],
    mocks: connectionStateMocks,
  });
  wrapper.setData({
    form: {
      ...defaultData,
      ...formData,
    },
  });
  wrapper.setMethods({
    register: data => {
      return new Promise(resolve => {
        register(data);
        resolve();
      });
    },
  });
  return wrapper;
}
function makeFailedPromise(statusCode) {
  return () => {
    return new Promise((resolve, reject) => {
      reject({
        response: {
          status: statusCode || 500,
        },
      });
    });
  };
}

describe('create', () => {
  beforeEach(() => {
    register.mockReset();
  });
  it('should trigger submit method when form is submitted', () => {
    const submit = jest.fn();
    const wrapper = makeWrapper();
    wrapper.setMethods({ submit });
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(submit).toHaveBeenCalled();
  });
  it('should call register with form data', () => {
    const wrapper = makeWrapper();
    wrapper.find({ ref: 'form' }).trigger('submit');
    expect(register.mock.calls[0][0]).toEqual({
      ...defaultData,
      locations: defaultData.locations.join('|'),
      uses: defaultData.uses.join('|'),
      policies: '{}',
    });
  });
  it('should automatically fill the email if provided in the query param', () => {
    router.push({ name: 'Create', query: { email: 'newtest@test.com' } });
    const wrapper = mount(Create, { router, stubs: ['PolicyModals'], mocks: connectionStateMocks });
    expect(wrapper.vm.form.email).toBe('newtest@test.com');
  });
  describe('validation', () => {
    it('should call register if form is valid', () => {
      const wrapper = makeWrapper();
      wrapper.vm.submit();
      expect(register).toHaveBeenCalled();
    });
    it('should fail if required fields are not set', () => {
      const form = {
        first_name: '',
        last_name: '',
        email: '',
        password1: '',
        password2: '',
        uses: [],
        locations: [],
        source: '',
        accepted_policy: false,
        accepted_tos: false,
      };

      Object.keys(form).forEach(field => {
        const wrapper = makeWrapper({ [field]: form[field] });
        wrapper.vm.submit();
        expect(register).not.toHaveBeenCalled();
      });
    });
    it('should fail if password1 and password2 do not match', () => {
      const wrapper = makeWrapper({ password1: 'some other password' });
      wrapper.vm.submit();
      expect(register).not.toHaveBeenCalled();
    });
    it('should fail if uses field is set to fields that require more input that is not provided', () => {
      [uses.STORING, uses.OTHER].forEach(use => {
        const wrapper = makeWrapper({ uses: [use] });
        wrapper.vm.submit();
        expect(register).not.toHaveBeenCalled();
      });
    });
    it('should fail if source field is set to an option that requires more input that is not provided', () => {
      [sources.ORGANIZATION, sources.CONFERENCE, sources.OTHER].forEach(source => {
        const wrapper = makeWrapper({ source });
        wrapper.vm.submit();
        expect(register).not.toHaveBeenCalled();
      });
    });
  });

  describe('on backend failures', () => {
    let wrapper;
    beforeEach(() => {
      wrapper = makeWrapper();
    });
    it('should say account with email already exists if register returns a 403', async () => {
      wrapper.setMethods({ register: makeFailedPromise(403) });
      await wrapper.vm.submit();
      expect(wrapper.vm.emailErrors).toHaveLength(1);
    });
    it('should say account has not been activated if register returns 405', async () => {
      wrapper.setMethods({ register: makeFailedPromise(405) });
      await wrapper.vm.submit();
      expect(wrapper.vm.$route.name).toBe('AccountNotActivated');
    });
    it('registrationFailed should be true if any other error is returned', async () => {
      wrapper.setMethods({ register: makeFailedPromise() });
      await wrapper.vm.submit();
      expect(wrapper.vm.valid).toBe(false);
      expect(wrapper.vm.registrationFailed).toBe(true);
    });
  });
});
