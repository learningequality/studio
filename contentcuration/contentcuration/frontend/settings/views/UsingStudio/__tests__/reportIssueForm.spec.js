import { mount } from '@vue/test-utils';
import ReportIssueForm from '../ReportIssueForm';

function makeWrapper() {
  return mount(ReportIssueForm, {
    propsData: {
      value: true,
    },
  });
}

describe('reportIssueForm', () => {
  let wrapper;
  let reportIssue;

  beforeEach(() => {
    wrapper = makeWrapper();
    reportIssue = jest.fn().mockReturnValue(Promise.resolve());
    wrapper.setMethods({ reportIssue });
  });

  it('should fail if one or more of the fields is null', () => {
    wrapper.vm.submit();
    expect(reportIssue).not.toHaveBeenCalled();
  });
  it('should fail if one or more of the fields is an empty string', () => {
    wrapper.setData({
      form: {
        operating_system: ' ',
        browser: 'browser',
        channel: 'channel',
        description: 'description',
      },
    });
    wrapper.vm.submit();
    expect(reportIssue).not.toHaveBeenCalled();
  });
  it('should succeed if form is valid', () => {
    wrapper.setData({
      form: {
        operating_system: 'os',
        browser: 'browser',
        channel: 'channel',
        description: 'description',
      },
    });
    wrapper.vm.submit();
    expect(reportIssue).toHaveBeenCalled();
  });
});
