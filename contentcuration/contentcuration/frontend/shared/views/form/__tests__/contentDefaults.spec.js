import { mount } from '@vue/test-utils';
import camelCase from 'lodash/camelCase';
import * as constants from '../../../constants';
import ContentDefaults from '../ContentDefaults.vue';

function makeWrapper(contentDefaults) {
  return mount(ContentDefaults, {
    propsData: {
      contentDefaults,
    },
  });
}

function assertFieldValues(keys, fields, contentDefaults, prop = 'value') {
  for (const key of keys) {
    const field = fields.filter(f => f.find(`[data-name="${camelCase(key)}"]`).exists()).at(0);
    expect(field.props(prop)).toEqual(contentDefaults[key]);
  }
}

async function updateFieldValues(keys, fields, contentDefaults) {
  for (const key of keys) {
    const selector = `[data-name="${camelCase(key)}"]`;
    const field = fields.filter(f => f.find(selector).exists()).at(0);
    const input = field.find(`.v-input ${selector}`);

    if (input.exists()) {
      // The element is a Vuetify input
      await input.setValue(contentDefaults[key]);
    } else {
      // The element is a KDS checkbox
      if (field.props('inputValue') !== contentDefaults[key]) {
        field.find('input').element.click();
      }
    }
  }
}

function assertFormValues(wrapper, contentDefaults) {
  const textFields = wrapper.findAllComponents({ name: 'v-text-field' });
  expect(textFields.length).toEqual(4);
  assertFieldValues(
    ['author', 'provider', 'aggregator', 'copyright_holder'],
    textFields,
    contentDefaults,
  );

  const selects = wrapper.findAllComponents({ name: 'v-select' });
  expect(selects.length).toEqual(1);
  assertFieldValues(['license'], selects, contentDefaults);

  const textAreas = wrapper.findAllComponents({ name: 'v-textarea' });
  if (contentDefaults.license !== 'Special Permissions') {
    expect(textAreas.length).toEqual(0);
  } else {
    expect(textAreas.length).toEqual(1);
    assertFieldValues(['license_description'], textAreas, contentDefaults);
  }

  const checkboxes = wrapper.findAllComponents({ name: 'Checkbox' });
  expect(checkboxes.length).toEqual(4);
  assertFieldValues(
    [
      'auto_derive_audio_thumbnail',
      'auto_derive_document_thumbnail',
      'auto_derive_html5_thumbnail',
      'auto_derive_video_thumbnail',
    ],
    checkboxes,
    contentDefaults,
    'inputValue',
  );
}

async function updateFormValues(wrapper, contentDefaults) {
  const textFields = wrapper.findAllComponents({ name: 'v-text-field' });
  await updateFieldValues(
    ['author', 'provider', 'aggregator', 'copyright_holder'],
    textFields,
    contentDefaults,
  );

  const selects = wrapper.findAllComponents({ name: 'v-select' });
  await updateFieldValues(['license'], selects, contentDefaults);

  const textAreas = wrapper.findAllComponents({ name: 'v-textarea' });
  if (contentDefaults.license === 'Special Permissions') {
    await updateFieldValues(['license_description'], textAreas, contentDefaults);
  }

  const checkboxes = wrapper.findAllComponents({ name: 'Checkbox' });
  expect(checkboxes.length).toEqual(4);
  await updateFieldValues(
    [
      'auto_derive_audio_thumbnail',
      'auto_derive_document_thumbnail',
      'auto_derive_html5_thumbnail',
      'auto_derive_video_thumbnail',
    ],
    checkboxes,
    contentDefaults,
    'inputValue',
  );
}

describe('contentDefaults', () => {
  describe('initial state', () => {
    it('should fill fields with provided content defaults', () => {
      const contentDefaults = {
        author: 'Buster McTester',
        provider: 'USA',
        aggregator: 'Aggregator R Us',
        copyright_holder: 'Learning Equality',
        license: 'Special Permissions',
        license_description: 'You need to ask Buster first.',
        auto_derive_audio_thumbnail: false,
        auto_derive_document_thumbnail: true,
        auto_derive_html5_thumbnail: true,
        auto_derive_video_thumbnail: false,
      };
      const wrapper = makeWrapper(contentDefaults);
      assertFormValues(wrapper, contentDefaults);
    });

    it('should fill fields with default values when no content defaults provided', () => {
      const wrapper = makeWrapper({});
      assertFormValues(wrapper, constants.ContentDefaultsDefaults);
    });

    it('should pre-validate license value', () => {
      const wrapper = makeWrapper({
        license: 'This license does not exist',
      });
      assertFormValues(wrapper, constants.ContentDefaultsDefaults);
    });
  });

  describe('updating state', () => {
    it('should update fields with new content defaults received from a parent', async () => {
      const contentDefaults = {
        author: 'Buster McTester',
        provider: 'USA',
        aggregator: 'Aggregator R Us',
        copyright_holder: 'Learning Equality',
        license: 'Special Permissions',
        license_description: 'You need to ask Buster first.',
        auto_derive_audio_thumbnail: false,
        auto_derive_document_thumbnail: true,
        auto_derive_html5_thumbnail: true,
        auto_derive_video_thumbnail: false,
      };
      const wrapper = makeWrapper(contentDefaults);
      assertFormValues(wrapper, contentDefaults);

      await wrapper.setProps({
        contentDefaults: {
          ...contentDefaults,
          author: 'Gabhowla Gabrielleclaw',
        },
      });
      assertFormValues(wrapper, {
        ...contentDefaults,
        author: 'Gabhowla Gabrielleclaw',
      });
    });

    it('should update a parent with new content defaults', async () => {
      const setValues = {
        author: 'Buster McTester',
        provider: 'USA',
        aggregator: 'Aggregator R Us',
        copyright_holder: 'Learning Equality',
        license: 'Special Permissions',
        license_description: 'You need to ask Buster first.',
        auto_derive_audio_thumbnail: false,
        auto_derive_document_thumbnail: true,
        auto_derive_html5_thumbnail: true,
        auto_derive_video_thumbnail: false,
      };
      const wrapper = makeWrapper({});
      await updateFormValues(wrapper, setValues);

      const contentDefaults = wrapper.emitted('change').pop()[0];
      expect(contentDefaults).toEqual(setValues);
    });
  });
});
