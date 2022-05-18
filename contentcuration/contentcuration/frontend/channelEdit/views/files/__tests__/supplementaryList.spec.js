import { mount } from '@vue/test-utils';
import SupplementaryList from '../supplementaryLists/SupplementaryList';
import { factory } from '../../../store';

const testNodeId = 'testnode';

function makeWrapper() {
  const store = factory();
  return mount(SupplementaryList, {
    store,
    attachToDocument: true,
    propsData: {
      nodeId: testNodeId,
      presetID: 'video_subtitle',
    },
    computed: {
      node() {
        return {
          files: ['file-1', 'file-2'],
        };
      },
    },
    stubs: {
      SupplementaryItem: true,
    },
  });
}

describe('supplementaryList', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('files should filter files based on presetID', () => {
    expect(wrapper.vm.files).toHaveLength(1);
    expect(wrapper.vm.files[0].id).toBe('file-1');
  });
  it('currentLanguages should reflect languages that have been selected', () => {
    expect(wrapper.vm.currentLanguages).toHaveLength(1);
    expect(wrapper.vm.currentLanguages[0]).toBe('en');
  });
  it('readonly should disable uploading', () => {
    wrapper.setProps({ readonly: true });
    expect(wrapper.find('[data-test="add-file"]').exists()).toBe(false);
  });
  describe('uploading workflow', () => {
    it('clicking add file link should enable language selection', () => {
      wrapper.find('[data-test="add-file"]').trigger('click');
      expect(wrapper.find('[data-test="select-language"]').exists()).toBe(true);
    });
    it('selecting a language should enable file uploading', () => {
      wrapper.setData({ selectedLanguage: 'en' });
      expect(wrapper.find('[data-test="upload-file"]').exists()).toBe(true);
    });
  });
});
