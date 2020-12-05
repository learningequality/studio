import { mount } from '@vue/test-utils';
import FeedbackForm from '../errors/FeedbackForm';

function makeWrapper() {
  return mount(FeedbackForm, {
    propsData: {
      value: true,
    },

    // TODO: remove this once feedback form is working
    computed: {
      isAdmin() {
        return true;
      },
    },
  });
}

describe('feedbackForm', () => {
  let wrapper;
  let submitFeedback;

  beforeEach(() => {
    wrapper = makeWrapper();
    submitFeedback = jest.fn().mockReturnValue(Promise.resolve());
    wrapper.setMethods({ submitFeedback });
  });

  it('should fail if one or more of the fields is null', () => {
    wrapper.vm.submit();
    expect(submitFeedback).not.toHaveBeenCalled();
  });
  it('should fail if one or more of the fields is an empty string', () => {
    wrapper.setData({
      form: {
        feedback: ' ',
      },
    });
    wrapper.vm.submit();
    expect(submitFeedback).not.toHaveBeenCalled();
  });
  it('should succeed if form is valid', () => {
    wrapper.setData({
      form: {
        feedback: 'feedback',
      },
    });
    wrapper.vm.submit();
    expect(submitFeedback).toHaveBeenCalled();
  });
});
