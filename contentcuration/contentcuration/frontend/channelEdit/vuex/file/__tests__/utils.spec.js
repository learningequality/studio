import { ValidationErrors } from '../../../constants';
import { validateNodeFiles } from '../utils';

describe('utils', () => {
  describe('validateNodeFiles', () => {
    it('throws an error if there are no valid primary files', () => {
      let testFiles = [
        {
          error: { type: ValidationErrors.UPLOAD_FAILED },
          preset: { supplementary: false },
        },
        {
          error: { type: ValidationErrors.UPLOAD_FAILED },
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
          error: { type: ValidationErrors.UPLOAD_FAILED },
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
          error: { type: ValidationErrors.NO_STORAGE },
          preset: { supplementary: true },
        },
        {
          error: { type: ValidationErrors.UPLOAD_FAILED },
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
