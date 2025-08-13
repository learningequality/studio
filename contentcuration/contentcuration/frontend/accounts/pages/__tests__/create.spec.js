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
  password1: 'tester123',
  password2: 'tester123',
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

async function makeWrapper(formData) {
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
  await wrapper.setData({
    form: {
      ...defaultData,
      ...formData,
    },
  });
  const register = jest.spyOn(wrapper.vm, 'register');
  register.mockImplementation(() => Promise.resolve());
  return [wrapper, { register }];
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
  it('should trigger submit method when form is submitted', async () => {
    const [wrapper] = await makeWrapper();
    const submit = jest.spyOn(wrapper.vm, 'submit');
    submit.mockImplementation(() => Promise.resolve());
    await wrapper.findComponent({ ref: 'form' }).trigger('submit');
    expect(submit).toHaveBeenCalled();
  });

  it('should call register with form data', async () => {
    const [wrapper, mocks] = await makeWrapper();
    await wrapper.findComponent({ ref: 'form' }).trigger('submit');
    expect(mocks.register.mock.calls[0][0]).toEqual({
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
    it('should call register if form is valid', async () => {
      const [wrapper, mocks] = await makeWrapper();
      wrapper.vm.submit();
      expect(mocks.register).toHaveBeenCalled();
    });

    it('should fail if required fields are not set', async () => {
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

      for (const field of Object.keys(form)) {
        const [wrapper, mocks] = await makeWrapper({ [field]: form[field] });
        await wrapper.vm.submit();
        expect(mocks.register).not.toHaveBeenCalled();
      }
    });

    it('should fail if password1 is too short', async () => {
      const [wrapper, mocks] = await makeWrapper({ password1: '123' });
      await wrapper.vm.submit();
      expect(mocks.register).not.toHaveBeenCalled();
    });

    it('should fail if password1 and password2 do not match', async () => {
      const [wrapper, mocks] = await makeWrapper({ password1: 'some other password' });
      await wrapper.vm.submit();
      expect(mocks.register).not.toHaveBeenCalled();
    });

    it.each(
      [uses.STORING, uses.OTHER],
      'should fail if uses field is set to fields that require more input that is not provided',
      async use => {
        const [wrapper, mocks] = await makeWrapper({ uses: [use] });
        await wrapper.vm.submit();
        expect(mocks.register).not.toHaveBeenCalled();
      },
    );

    it.each(
      [sources.ORGANIZATION, sources.CONFERENCE, sources.OTHER],
      'should fail if source field is set to an option that requires more input that is not provided',
      async source => {
        const [wrapper, mocks] = await makeWrapper({ source });
        await wrapper.vm.submit();
        expect(mocks.register).not.toHaveBeenCalled();
      },
    );
  });

  describe('on backend failures', () => {
    let wrapper, mocks;

    beforeEach(async () => {
      [wrapper, mocks] = await makeWrapper();
    });

    it('should say account with email already exists if register returns a 403', async () => {
      mocks.register.mockImplementation(makeFailedPromise(403));
      await wrapper.vm.submit();
      expect(wrapper.vm.errors.email).toHaveLength(1);
    });

    it('should say account has not been activated if register returns 405', async () => {
      mocks.register.mockImplementation(makeFailedPromise(405));
      await wrapper.vm.submit();
      expect(wrapper.vm.$route.name).toBe('AccountNotActivated');
    });

    it('registrationFailed should be true if any other error is returned', async () => {
      mocks.register.mockImplementation(makeFailedPromise());
      await wrapper.vm.submit();
      expect(wrapper.vm.valid).toBe(false);
      expect(wrapper.vm.registrationFailed).toBe(true);
    });
  });
});
