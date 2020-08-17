import each from 'jest-each';

import { ValidationErrors } from '../../../constants';
import { validateNodeDetails, validateNodeFiles } from '../utils';

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

  describe('validateNodeFiles', () => {
    it('throws an error if there are no valid primary files', () => {
      let testFiles = [
        {
          error: ValidationErrors.UPLOAD_FAILED,
          preset: { supplementary: false },
        },
        {
          error: ValidationErrors.UPLOAD_FAILED,
          preset: { supplementary: false },
        },
        {
          preset: { supplementary: true },
        },
      ];
      expect(validateNodeFiles(testFiles)).toContain(ValidationErrors.NO_VALID_PRIMARY_FILES);
    });
    it('does not throw NO_VALID_PRIMARY_FILES if there is one valid primary file', () => {
      let testFiles = [
        {
          error: ValidationErrors.UPLOAD_FAILED,
          preset: { supplementary: false },
        },
        {
          preset: { supplementary: false },
        },
      ];
      expect(validateNodeFiles(testFiles)).not.toContain(ValidationErrors.NO_VALID_PRIMARY_FILES);
    });
    it('returns array of errors found on files', () => {
      let testFiles = [
        {
          error: ValidationErrors.NO_STORAGE,
          preset: { supplementary: true },
        },
        {
          error: ValidationErrors.UPLOAD_FAILED,
          preset: { supplementary: true },
        },
        {
          preset: { supplementary: false },
        },
      ];
      let expectedErrors = [ValidationErrors.NO_STORAGE, ValidationErrors.UPLOAD_FAILED];
      expect(validateNodeFiles(testFiles)).toEqual(expectedErrors);
    });
  });
});
