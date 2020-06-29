import each from 'jest-each';

import { ValidationErrors } from '../../../constants';
import { validateNodeDetails } from '../utils';

describe('utils', () => {
  describe('validateNodeDetails', () => {
    it('returns a correct error code when title missing', () => {
      // copyright holder is not required for Public Domain
      expect(
        validateNodeDetails({
          title: '',
          kind: 'document',
          license: 8,
        })
      ).toEqual([ValidationErrors.TITLE_REQUIRED]);
    });

    each([
      [
        {
          title: 'Title',
          kind: 'document',
          license: null,
        },
        [ValidationErrors.LICENCE_REQUIRED],
      ],
      [
        {
          title: 'Title',
          kind: 'document',
          license: 8,
        },
        [],
      ],
      // license is not required for topics
      [
        {
          title: 'Title',
          kind: 'topic',
          license: null,
        },
        [],
      ],
      // license is not required when authoring data freezed
      [
        {
          title: 'Title',
          freeze_authoring_data: true,
          license: null,
        },
        [],
      ],
    ]).it('validates license presence', (node, errors) => {
      expect(validateNodeDetails(node)).toEqual(errors);
    });

    each([
      // copyright holder is required for licences other than Public Domain
      [
        {
          title: 'Title',
          license: 1,
        },
        [ValidationErrors.COPYRIGHT_HOLDER_REQUIRED],
      ],
      [
        {
          title: 'Title',
          license: 1,
          copyright_holder: 'Copyright holder',
        },
        [],
      ],
    ]).it('validates copyright holder', (node, errors) => {
      expect(validateNodeDetails(node)).toEqual(errors);
    });

    each([
      // description is required for a custom license
      [
        {
          title: 'Title',
          license: 9,
          copyright_holder: 'Copyright holder',
        },
        [ValidationErrors.LICENCE_DESCRIPTION_REQUIRED],
      ],
      [
        {
          title: 'Title',
          license: 9,
          copyright_holder: 'Copyright holder',
          license_description: 'My custom license',
        },
        [],
      ],
    ]).it('validates license description', (node, errors) => {
      expect(validateNodeDetails(node)).toEqual(errors);
    });

    each([
      [
        {
          title: 'Title',
          kind: 'exercise',
          license: 8,
        },
        [ValidationErrors.MASTERY_MODEL_REQUIRED],
      ],
      [
        {
          title: 'Title',
          kind: 'exercise',
          license: 8,
          extra_fields: {
            mastery_model: 'do_all',
          },
        },
        [],
      ],
      [
        {
          title: 'Title',
          kind: 'exercise',
          license: 8,
          extra_fields: {
            mastery_model: 'm_of_n',
            m: 3,
          },
        },
        [ValidationErrors.MASTERY_MODEL_INVALID],
      ],
      [
        {
          title: 'Title',
          kind: 'exercise',
          license: 8,
          extra_fields: {
            mastery_model: 'm_of_n',
            m: 3,
            n: 2,
          },
        },
        [ValidationErrors.MASTERY_MODEL_INVALID],
      ],
      [
        {
          title: 'Title',
          kind: 'exercise',
          license: 8,
          extra_fields: {
            mastery_model: 'm_of_n',
            m: 2,
            n: 3,
          },
        },
        [],
      ],
    ]).it('validates mastery model for exercises', (node, errors) => {
      expect(validateNodeDetails(node)).toEqual(errors);
    });
  });
});
