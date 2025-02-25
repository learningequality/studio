import each from 'jest-each';
import CompletionCriteriaModels from 'kolibri-constants/CompletionCriteria';
import { AssessmentItemTypes, ValidationErrors } from '../constants';
import {
  translateValidator,
  getTitleValidators,
  getNodeTitleErrors,
  getNodeLicenseErrors,
  getNodeCopyrightHolderErrors,
  getNodeLicenseDescriptionErrors,
  getNodeMasteryModelErrors,
  getNodeMasteryModelMErrors,
  getNodeMasteryModelNErrors,
  isNodeComplete,
  getNodeDetailsErrors,
  getNodeFilesErrors,
  sanitizeAssessmentItemAnswers,
  sanitizeAssessmentItemHints,
  sanitizeAssessmentItem,
  getAssessmentItemErrors,
  getNodeLearningActivityErrors,
} from './validation';
import { MasteryModelsNames } from 'shared/leUtils/MasteryModels';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

function generateMasteryExtraFields(mastery) {
  return {
    options: {
      completion_criteria: {
        model: CompletionCriteriaModels.MASTERY,
        threshold: mastery,
      },
    },
  };
}

describe('channelEdit utils', () => {
  describe('translateValidator', () => {
    it('returns true if a validator function returns true for a value', () => {
      const title = 'Title';
      expect(translateValidator(getTitleValidators()[0])(title)).toBe(true);
    });

    it('returns an error message if a validator function returns an error code for a value', () => {
      const title = '';
      expect(translateValidator(getTitleValidators()[0])(title)).toBe('This field is required');
    });
  });

  describe('getNodeTitleErrors', () => {
    it('returns no errors for a non-empty title', () => {
      const node = { title: 'title' };
      expect(getNodeTitleErrors(node)).toEqual([]);
    });

    it('returns an error for an empty title', () => {
      const node = { title: '' };
      expect(getNodeTitleErrors(node)).toEqual([ValidationErrors.TITLE_REQUIRED]);
    });

    it('returns an error for a whitespace title', () => {
      const node = { title: '  ' };
      expect(getNodeTitleErrors(node)).toEqual([ValidationErrors.TITLE_REQUIRED]);
    });
  });

  describe('getNodeLicenseErrors', () => {
    it('returns no errors for a supported license', () => {
      // see shared/leUtils/Licenses
      const node = { license: { id: 1 } };
      expect(getNodeLicenseErrors(node)).toEqual([]);
    });

    it('returns an error for an empty license', () => {
      const node = { license: null };
      expect(getNodeLicenseErrors(node)).toEqual([ValidationErrors.LICENSE_REQUIRED]);
    });

    it('returns an error for an unsupported license', () => {
      // see shared/leUtils/Licenses
      const node = { license: { id: 10 } };
      expect(getNodeLicenseErrors(node)).toEqual([ValidationErrors.LICENSE_REQUIRED]);
    });
  });

  describe('getNodeCopyrightHolderErrors', () => {
    it(`returns no errors for an empty copyright holder
      when no license is specified`, () => {
      const node = { copyright_holder: '' };
      expect(getNodeCopyrightHolderErrors(node)).toEqual([]);
    });

    it(`returns no errors for an empty copyright holder
      when a copyright holder is not required`, () => {
      // see shared/leUtils/Licenses
      const node = {
        license: { id: 8, copyright_holder_required: false },
        copyright_holder: '',
      };
      expect(getNodeCopyrightHolderErrors(node)).toEqual([]);
    });

    it(`returns an error for an empty copyright holder
      when a copyright holder is required`, () => {
      // see shared/leUtils/Licenses
      const node = {
        license: { id: 1, copyright_holder_required: true },
        copyright_holder: '',
      };
      expect(getNodeCopyrightHolderErrors(node)).toEqual([
        ValidationErrors.COPYRIGHT_HOLDER_REQUIRED,
      ]);
    });

    it(`returns an error for a whitespace copyright holder
      when a copyright holder is required`, () => {
      // see shared/leUtils/Licenses
      const node = {
        license: { id: 1, copyright_holder_required: true },
        copyright_holder: ' ',
      };
      expect(getNodeCopyrightHolderErrors(node)).toEqual([
        ValidationErrors.COPYRIGHT_HOLDER_REQUIRED,
      ]);
    });

    it(`returns no errors for a non-empty copyright holder
      when a copyright holder is required`, () => {
      // see shared/leUtils/Licenses
      const node = {
        license: { id: 1, copyright_holder_required: true },
        copyright_holder: 'Copyright holder',
      };
      expect(getNodeCopyrightHolderErrors(node)).toEqual([]);
    });
  });

  describe('getNodeLicenseDescriptionErrors', () => {
    it(`returns no errors for an empty license description
      when no license is specified`, () => {
      const node = { license_description: '' };
      expect(getNodeLicenseDescriptionErrors(node)).toEqual([]);
    });

    it(`returns no errors for an empty license description
      when a license is not custom`, () => {
      // see shared/leUtils/Licenses
      const node = {
        license: { id: 1, is_custom: false },
        license_description: '',
      };
      expect(getNodeLicenseDescriptionErrors(node)).toEqual([]);
    });

    it(`returns an error for an empty license description
      when a license is custom`, () => {
      // see shared/leUtils/Licenses
      const node = {
        license: { id: 9, is_custom: true },
        license_description: '',
      };
      expect(getNodeLicenseDescriptionErrors(node)).toEqual([
        ValidationErrors.LICENSE_DESCRIPTION_REQUIRED,
      ]);
    });

    it(`returns an error for a whitespace license description
      when a license is custom`, () => {
      // see shared/leUtils/Licenses
      const node = {
        license: { id: 9, is_custom: true },
        license_description: ' ',
      };
      expect(getNodeLicenseDescriptionErrors(node)).toEqual([
        ValidationErrors.LICENSE_DESCRIPTION_REQUIRED,
      ]);
    });

    it(`returns no errors for a non-empty license description
      when a license is custom`, () => {
      // see shared/leUtils/Licenses
      const node = {
        license: { id: 9, is_custom: true },
        license_description: 'License description',
      };
      expect(getNodeLicenseDescriptionErrors(node)).toEqual([]);
    });
  });

  describe('getNodeLearningActivityErrors', () => {
    it(`returns an error for an empty learning activity input`, () => {
      const node = {
        learning_activities: {},
      };
      expect(getNodeLearningActivityErrors(node)).toEqual([
        ValidationErrors.LEARNING_ACTIVITY_REQUIRED,
      ]);
    });
    it('returns no errors when learning activity is specified', () => {
      const node = {
        learning_activities: { test: true },
      };
      expect(getNodeLearningActivityErrors(node)).toEqual([]);
    });
  });

  describe('getNodeMasteryModelErrors', () => {
    it('returns an error for an empty mastery model', () => {
      const node = { extra_fields: null };
      expect(getNodeMasteryModelErrors(node)).toEqual([ValidationErrors.MASTERY_MODEL_REQUIRED]);
    });

    it('returns no errors when a mastery model specified', () => {
      const node = {
        extra_fields: generateMasteryExtraFields({ mastery_model: MasteryModelsNames.DO_ALL }),
      };
      expect(getNodeMasteryModelErrors(node)).toEqual([]);
    });
  });

  describe('getNodeMasteryModelMErrors', () => {
    it(`returns no errors for empty m value
      when no mastery model is specified`, () => {
      const node = { extra_fields: generateMasteryExtraFields({ mastery_model: null, m: null }) };
      expect(getNodeMasteryModelMErrors(node)).toEqual([]);
    });

    it(`returns no errors for empty m value
      for mastery models other than m of n`, () => {
      const node = {
        extra_fields: generateMasteryExtraFields({
          mastery_model: MasteryModelsNames.DO_ALL,
          m: null,
        }),
      };
      expect(getNodeMasteryModelMErrors(node)).toEqual([]);
    });

    describe('for a mastery model m of n', () => {
      let node;
      beforeEach(() => {
        node = {
          extra_fields: generateMasteryExtraFields({ mastery_model: MasteryModelsNames.M_OF_N }),
        };
      });

      it('returns errors for empty m value', () => {
        node.extra_fields.options.completion_criteria.threshold.m = undefined;
        node.extra_fields.options.completion_criteria.threshold.n = 3;

        expect(getNodeMasteryModelMErrors(node)).toEqual([
          ValidationErrors.MASTERY_MODEL_M_REQUIRED,
          ValidationErrors.MASTERY_MODEL_M_WHOLE_NUMBER,
          ValidationErrors.MASTERY_MODEL_M_GT_ZERO,
          ValidationErrors.MASTERY_MODEL_M_LTE_N,
        ]);
      });

      it('returns an error for non-integer m value', () => {
        node.extra_fields.options.completion_criteria.threshold.m = 1.27;
        node.extra_fields.options.completion_criteria.threshold.n = 3;

        expect(getNodeMasteryModelMErrors(node)).toEqual([
          ValidationErrors.MASTERY_MODEL_M_WHOLE_NUMBER,
        ]);
      });

      it('returns an error for m value smaller than zero', () => {
        node.extra_fields.options.completion_criteria.threshold.m = -2;
        node.extra_fields.options.completion_criteria.threshold.n = 3;

        expect(getNodeMasteryModelMErrors(node)).toEqual([
          ValidationErrors.MASTERY_MODEL_M_GT_ZERO,
        ]);
      });

      it('returns an error for m value larger than n value', () => {
        node.extra_fields.options.completion_criteria.threshold.m = 4;
        node.extra_fields.options.completion_criteria.threshold.n = 3;

        expect(getNodeMasteryModelMErrors(node)).toEqual([ValidationErrors.MASTERY_MODEL_M_LTE_N]);
      });

      it('returns no errors for m whole number smaller than n value', () => {
        node.extra_fields.options.completion_criteria.threshold.m = 3;
        node.extra_fields.options.completion_criteria.threshold.n = 4;

        expect(getNodeMasteryModelMErrors(node)).toEqual([]);
      });
    });
  });

  describe('getNodeMasteryModelNErrors', () => {
    it(`returns no errors for empty n value
      when no mastery model is specified`, () => {
      const node = { extra_fields: generateMasteryExtraFields({ mastery_model: null, n: null }) };
      expect(getNodeMasteryModelNErrors(node)).toEqual([]);
    });

    it(`returns no errors for empty n value
      for mastery models other than m of n`, () => {
      const node = {
        extra_fields: generateMasteryExtraFields({
          mastery_model: MasteryModelsNames.DO_ALL,
          n: null,
        }),
      };
      expect(getNodeMasteryModelNErrors(node)).toEqual([]);
    });

    describe('for a mastery model m of n', () => {
      let node;
      beforeEach(() => {
        node = {
          extra_fields: generateMasteryExtraFields({ mastery_model: MasteryModelsNames.M_OF_N }),
        };
      });

      it('returns errors for empty n value', () => {
        node.extra_fields.options.completion_criteria.threshold.n = undefined;

        expect(getNodeMasteryModelNErrors(node)).toEqual([
          ValidationErrors.MASTERY_MODEL_N_REQUIRED,
          ValidationErrors.MASTERY_MODEL_N_WHOLE_NUMBER,
          ValidationErrors.MASTERY_MODEL_N_GT_ZERO,
        ]);
      });

      it('returns an error for non-integer n value', () => {
        node.extra_fields.options.completion_criteria.threshold.n = 1.27;

        expect(getNodeMasteryModelNErrors(node)).toEqual([
          ValidationErrors.MASTERY_MODEL_N_WHOLE_NUMBER,
        ]);
      });

      it('returns an error for n value smaller than zero', () => {
        node.extra_fields.options.completion_criteria.threshold.n = -2;

        expect(getNodeMasteryModelNErrors(node)).toEqual([
          ValidationErrors.MASTERY_MODEL_N_GT_ZERO,
        ]);
      });

      it('returns no errors for n whole number', () => {
        node.extra_fields.options.completion_criteria.threshold.n = 3;

        expect(getNodeMasteryModelNErrors(node)).toEqual([]);
      });
    });
  });

  describe('isNodeComplete', () => {
    describe('for all kinds of nodes', () => {
      it('throws a reference error if node details are not defined', () => {
        expect(() => isNodeComplete({ nodeDetails: undefined })).toThrowError(
          new ReferenceError('node details must be defined'),
        );
        expect(() => isNodeComplete({ nodeDetails: null })).toThrowError(
          new ReferenceError('node details must be defined'),
        );
      });
    });

    describe('for a topic node', () => {
      let nodeDetails;
      beforeEach(() => {
        nodeDetails = {
          title: 'Topic',
          kind: ContentKindsNames.TOPIC,
        };
      });

      it('returns false if node details are not valid', () => {
        const invalidNodeDetails = {
          ...nodeDetails,
          title: '',
        };
        expect(isNodeComplete({ nodeDetails: invalidNodeDetails })).toBe(false);
      });

      it('returns true if node details are valid', () => {
        expect(isNodeComplete({ nodeDetails })).toBe(true);
      });
    });

    describe('for an exercise node', () => {
      let nodeDetails, assessmentItems;

      beforeEach(() => {
        nodeDetails = {
          title: 'Exercise',
          kind: ContentKindsNames.EXERCISE,
          license: { id: 8 },
          learning_activities: { test: true },
          extra_fields: {
            mastery_model: MasteryModelsNames.DO_ALL,
            options: {
              completion_criteria: {
                model: CompletionCriteriaModels.TIME,
                threshold: 10,
              },
            },
          },
        };
        assessmentItems = [
          {
            question: 'Question',
            type: AssessmentItemTypes.SINGLE_SELECTION,
            answers: [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
              { answer: 'Peanut butter', correct: false, order: 2 },
            ],
          },
        ];
      });

      it('throws a reference error if assessment items are not defined', () => {
        const error = new ReferenceError('assessment items must be defined for exercises');
        expect(() => isNodeComplete({ nodeDetails, assessmentItems: undefined })).toThrowError(
          error,
        );
        expect(() => isNodeComplete({ nodeDetails, assessmentItems: null })).toThrowError(error);
      });

      it('returns false if node details are not valid', () => {
        const invalidNodeDetails = {
          ...nodeDetails,
          title: '',
        };
        expect(isNodeComplete({ nodeDetails: invalidNodeDetails, assessmentItems })).toBe(false);
      });

      it('returns false if there are no assessment items', () => {
        expect(isNodeComplete({ nodeDetails, assessmentItems: [] })).toBe(false);
      });

      it('returns false if there is at least one invalid assessment item', () => {
        const invalidAssessmentItem = {
          question: 'A question with missing answers',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [],
        };
        expect(
          isNodeComplete({
            nodeDetails,
            assessmentItems: {
              ...assessmentItems,
              invalidAssessmentItem,
            },
          }),
        ).toBe(false);
      });

      it('returns false if completion_criteria is invalid', () => {
        const details = {
          ...nodeDetails,
          extra_fields: {
            ...nodeDetails.extra_fields,
            options: {
              completion_criteria: {
                // pages model not allowed for exercise
                model: CompletionCriteriaModels.PAGES,
                threshold: 12,
              },
            },
          },
        };
        expect(isNodeComplete({ nodeDetails: details, assessmentItems })).toBe(false);
      });

      it(`
        returns true if node details are valid,
        there is at least one assessment items,
        and all assessment items are valid`, () => {
        const details = {
          ...nodeDetails,
          extra_fields: {
            ...nodeDetails.extra_fields,
            options: {
              completion_criteria: {
                // mastery model only allowed for exercise
                model: CompletionCriteriaModels.MASTERY,
                threshold: {
                  mastery_model: 'do_all',
                },
              },
            },
          },
        };
        expect(isNodeComplete({ nodeDetails: details, assessmentItems })).toBe(true);
      });
    });

    each(
      Object.values(ContentKindsNames).filter(
        kind => ![ContentKindsNames.TOPIC, ContentKindsNames.EXERCISE].includes(kind),
      ),
    ).describe('for nodes other than topic or exercise', kind => {
      let nodeDetails, files;
      beforeEach(() => {
        nodeDetails = {
          title: 'A node',
          license: { id: 8 },
          kind,
          learning_activities: { test: true },
          extra_fields: {
            options: {
              completion_criteria: {
                model: CompletionCriteriaModels.TIME,
                threshold: 10,
              },
            },
          },
        };
        files = [
          {
            id: 'file-id',
            error: undefined,
            preset: {
              supplementary: false,
            },
          },
        ];
      });

      it('throws a reference error if files are not defined', () => {
        const error = new ReferenceError(
          'files must be defined for a node other than topic or exercise',
        );
        expect(() => isNodeComplete({ nodeDetails, files: undefined })).toThrowError(error);
        expect(() => isNodeComplete({ nodeDetails, files: null })).toThrowError(error);
      });

      it('returns false if node details are not valid', () => {
        const invalidNodeDetails = {
          ...nodeDetails,
          title: '',
        };
        expect(isNodeComplete({ nodeDetails: invalidNodeDetails, files })).toBe(false);
      });

      it('returns false if there is at least one invalid file', () => {
        const invalidFile = { id: 'file-id', error: 'error' };
        expect(isNodeComplete({ nodeDetails, files: [...files, invalidFile] })).toBe(false);
      });

      it('returns false if completion_criteria is invalid', () => {
        const details = {
          ...nodeDetails,
          extra_fields: {
            options: {
              completion_criteria: {
                model: 'pages',
                threshold: -1,
              },
            },
          },
        };
        expect(isNodeComplete({ nodeDetails: details, files })).toBe(false);
      });

      it('returns false if completion_criteria is invalid for kind', () => {
        const details = {
          ...nodeDetails,
          extra_fields: {
            options: {
              completion_criteria: {
                // mastery model only allowed for exercise
                model: CompletionCriteriaModels.MASTERY,
                threshold: {
                  mastery_model: 'do_all',
                },
              },
            },
          },
        };
        expect(isNodeComplete({ nodeDetails: details, files })).toBe(false);
      });

      it('returns true if node details and all files are valid', () => {
        expect(isNodeComplete({ nodeDetails, files })).toBe(true);
      });
    });
  });

  describe('getNodeDetailsErrors', () => {
    it('returns a correct error code when title missing', () => {
      expect(
        getNodeDetailsErrors({
          title: '',
          kind: 'document',
          license: 8,
          learning_activities: { test: true },
        }),
      ).toEqual([ValidationErrors.TITLE_REQUIRED]);
    });

    each([
      [
        {
          title: 'Title',
          kind: 'document',
          license: null,
          learning_activities: { test: true },
        },
        [ValidationErrors.LICENSE_REQUIRED],
      ],
      [
        {
          title: 'Title',
          kind: 'document',
          license: 8,
          learning_activities: { test: true },
        },
        [],
      ],
      // license is not required for topics
      [
        {
          title: 'Title',
          kind: 'topic',
          license: null,
          learning_activities: { test: true },
        },
        [],
      ],
      // license is not required when authoring data freezed
      [
        {
          title: 'Title',
          freeze_authoring_data: true,
          license: null,
          learning_activities: { test: true },
        },
        [],
      ],
    ]).it('validates license presence', (node, errors) => {
      expect(getNodeDetailsErrors(node)).toEqual(errors);
    });

    each([
      // copyright holder is required for licenses other than Public Domain
      [
        {
          title: 'Title',
          license: 1,
          learning_activities: { test: true },
        },
        [ValidationErrors.COPYRIGHT_HOLDER_REQUIRED],
      ],
      [
        {
          title: 'Title',
          license: 1,
          copyright_holder: 'Copyright holder',
          learning_activities: { test: true },
        },
        [],
      ],
    ]).it('validates copyright holder', (node, errors) => {
      expect(getNodeDetailsErrors(node)).toEqual(errors);
    });

    each([
      // description is required for a custom license
      [
        {
          title: 'Title',
          license: 9,
          copyright_holder: 'Copyright holder',
          learning_activities: { test: true },
        },
        [ValidationErrors.LICENSE_DESCRIPTION_REQUIRED],
      ],
      [
        {
          title: 'Title',
          license: 9,
          copyright_holder: 'Copyright holder',
          license_description: 'My custom license',
          learning_activities: { test: true },
        },
        [],
      ],
    ]).it('validates license description', (node, errors) => {
      expect(getNodeDetailsErrors(node)).toEqual(errors);
    });

    each([
      [
        {
          title: 'Title',
          kind: 'exercise',
          license: 8,
          learning_activities: { test: true },
        },
        [ValidationErrors.MASTERY_MODEL_REQUIRED],
      ],
      [
        {
          title: 'Title',
          kind: 'exercise',
          license: 8,
          learning_activities: { test: true },
          extra_fields: generateMasteryExtraFields({
            mastery_model: 'do_all',
          }),
        },
        [],
      ],
      [
        {
          title: 'Title',
          kind: 'exercise',
          license: 8,
          learning_activities: { test: true },
          extra_fields: generateMasteryExtraFields({
            mastery_model: 'm_of_n',
            m: 3,
          }),
        },
        [
          ValidationErrors.MASTERY_MODEL_M_LTE_N,
          ValidationErrors.MASTERY_MODEL_N_REQUIRED,
          ValidationErrors.MASTERY_MODEL_N_WHOLE_NUMBER,
          ValidationErrors.MASTERY_MODEL_N_GT_ZERO,
        ],
      ],
      [
        {
          title: 'Title',
          kind: 'exercise',
          license: 8,
          learning_activities: { test: true },
          extra_fields: generateMasteryExtraFields({
            mastery_model: 'm_of_n',
            m: 3,
            n: 2,
          }),
        },
        [ValidationErrors.MASTERY_MODEL_M_LTE_N],
      ],
      [
        {
          title: 'Title',
          kind: 'exercise',
          license: 8,
          learning_activities: { test: true },
          extra_fields: generateMasteryExtraFields({
            mastery_model: 'm_of_n',
            m: 2,
            n: 3,
          }),
        },
        [],
      ],
    ]).it('validates mastery model for exercises', (node, errors) => {
      expect(getNodeDetailsErrors(node)).toEqual(errors);
    });
  });

  describe('getNodeFilesErrors', () => {
    it('throws an error if there are no valid primary files', () => {
      const testFiles = [
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
      expect(getNodeFilesErrors(testFiles)).toContain(ValidationErrors.NO_VALID_PRIMARY_FILES);
    });
    it('does not throw NO_VALID_PRIMARY_FILES if there is one valid primary file', () => {
      const testFiles = [
        {
          error: ValidationErrors.UPLOAD_FAILED,
          preset: { supplementary: false },
        },
        {
          preset: { supplementary: false },
        },
      ];
      expect(getNodeFilesErrors(testFiles)).not.toContain(ValidationErrors.NO_VALID_PRIMARY_FILES);
    });
    it('returns array of errors found on files', () => {
      const testFiles = [
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
      const expectedErrors = [ValidationErrors.NO_STORAGE, ValidationErrors.UPLOAD_FAILED];
      expect(getNodeFilesErrors(testFiles)).toEqual(expectedErrors);
    });
  });

  describe('sanitizeAssessmentItemAnswers', () => {
    it('trims answers', () => {
      const answers = [
        { answer: '', order: 1, correct: true },
        { answer: ' 3 ', order: 2, correct: false },
        { answer: '  ', order: 3, correct: true },
      ];

      expect(sanitizeAssessmentItemAnswers(answers)).toEqual([
        { answer: '', order: 1, correct: true },
        { answer: '3', order: 2, correct: false },
        { answer: '', order: 3, correct: true },
      ]);
    });

    it('removes all empty answers and reorders remaining answers if removeEmpty true', () => {
      const answers = [
        { answer: '', order: 1, correct: true },
        { answer: ' 3 ', order: 2, correct: false },
        { answer: '  ', order: 3, correct: true },
      ];

      expect(sanitizeAssessmentItemAnswers(answers, true)).toEqual([
        { answer: '3', order: 1, correct: false },
      ]);
    });
  });

  describe('sanitizeAssessmentItemHints', () => {
    it('trims hints', () => {
      const hints = [
        { hint: '', order: 1 },
        { hint: ' Hint 1 ', order: 2 },
        { hint: '  ', order: 3 },
      ];

      expect(sanitizeAssessmentItemHints(hints)).toEqual([
        { hint: '', order: 1 },
        { hint: 'Hint 1', order: 2 },
        { hint: '', order: 3 },
      ]);
    });

    it('removes all empty hints and reorders remaining hints if removeEmpty true', () => {
      const hints = [
        { hint: '', order: 1 },
        { hint: ' Hint 1 ', order: 2 },
        { hint: '  ', order: 3 },
      ];

      expect(sanitizeAssessmentItemHints(hints, true)).toEqual([{ hint: 'Hint 1', order: 1 }]);
    });
  });

  describe('sanitizeAssessmentItem', () => {
    it('trims question, hints and answers', () => {
      const assessmentItem = {
        order: 1,
        question: ' Question text ',
        answers: [
          { answer: ' Answer 1', order: 1, correct: false },
          { answer: '', order: 2, correct: true },
          { answer: 'Answer 3    ', order: 3, correct: true },
        ],
        hints: [
          { hint: ' ', order: 1 },
          { hint: '', order: 2 },
          { hint: ' Hint 3', order: 3 },
        ],
      };

      expect(sanitizeAssessmentItem(assessmentItem)).toEqual({
        order: 1,
        question: 'Question text',
        answers: [
          { answer: 'Answer 1', order: 1, correct: false },
          { answer: '', order: 2, correct: true },
          { answer: 'Answer 3', order: 3, correct: true },
        ],
        hints: [
          { hint: '', order: 1 },
          { hint: '', order: 2 },
          { hint: 'Hint 3', order: 3 },
        ],
      });
    });

    it('removes all empty hints and answers if removeEmpty true', () => {
      const assessmentItem = {
        order: 1,
        question: ' Question text ',
        answers: [
          { answer: ' Answer 1', order: 1, correct: false },
          { answer: '', order: 2, correct: true },
          { answer: 'Answer 3    ', order: 3, correct: true },
        ],
        hints: [
          { hint: ' ', order: 1 },
          { hint: '', order: 2 },
          { hint: ' Hint 3', order: 3 },
        ],
      };

      expect(sanitizeAssessmentItem(assessmentItem, true)).toEqual({
        order: 1,
        question: 'Question text',
        answers: [
          { answer: 'Answer 1', order: 1, correct: false },
          { answer: 'Answer 3', order: 2, correct: true },
        ],
        hints: [{ hint: 'Hint 3', order: 1 }],
      });
    });
  });

  describe('getAssessmentItemErrors', () => {
    describe('when question text is missing', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: '',
          answers: [{ answer: 'Answer', correct: true, order: 1 }],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([
          ValidationErrors.QUESTION_REQUIRED,
        ]);
      });
    });

    describe('for single selection with no answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ]);
      });
    });

    describe('for single selection with no correct answer', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [{ answer: 'Answer', correct: false, order: 1 }],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ]);
      });
    });

    describe('for single selection with more correct answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Answer 1', correct: true, order: 1 },
            { answer: 'Answer 2', correct: true, order: 2 },
          ],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ]);
      });
    });

    describe('for single selection with one correct answer', () => {
      it('returns positive validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.SINGLE_SELECTION,
          answers: [
            { answer: 'Answer 1', correct: false, order: 1 },
            { answer: 'Answer 2', correct: true, order: 2 },
          ],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([]);
      });
    });

    describe('for multiple selection with no answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          answers: [],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ]);
      });
    });

    describe('for multiple selection with no correct answer', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          answers: [
            { answer: 'Answer 1', correct: false, order: 1 },
            { answer: 'Answer 2', correct: false, order: 2 },
          ],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ]);
      });
    });

    describe('for multiple selection with at least one correct answer', () => {
      it('returns positive validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.MULTIPLE_SELECTION,
          answers: [
            { answer: 'Answer 1', correct: true, order: 1 },
            { answer: 'Answer 2', correct: false, order: 2 },
          ],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([]);
      });
    });

    describe('for input question with no answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.INPUT_QUESTION,
          answers: [],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ]);
      });
    });

    describe('for input question with no correct answer', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.INPUT_QUESTION,
          answers: [
            { answer: 'Answer 1', correct: false, order: 1 },
            { answer: 'Answer 2', correct: false, order: 2 },
          ],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ]);
      });
    });

    describe('for input question with at least one correct answer', () => {
      it('returns positive validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.INPUT_QUESTION,
          answers: [
            { answer: 'Answer 1', correct: true, order: 1 },
            { answer: 'Answer 2', correct: true, order: 2 },
          ],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([]);
      });
    });

    describe('for true/false with no answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.TRUE_FALSE,
          answers: [],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ]);
      });
    });

    describe('for true/false with no correct answer', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.TRUE_FALSE,
          answers: [
            { answer: 'True', correct: false, order: 1 },
            { answer: 'False', correct: false, order: 2 },
          ],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ]);
      });
    });

    describe('for true/false with more correct answers', () => {
      it('returns negative validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.TRUE_FALSE,
          answers: [
            { answer: 'True', correct: true, order: 1 },
            { answer: 'False', correct: true, order: 2 },
          ],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([
          ValidationErrors.INVALID_NUMBER_OF_CORRECT_ANSWERS,
        ]);
      });
    });

    describe('for true/false with one correct answer', () => {
      it('returns positive validation results', () => {
        const assessmentItem = {
          question: 'Question',
          type: AssessmentItemTypes.TRUE_FALSE,
          answers: [
            { answer: 'True', correct: false, order: 1 },
            { answer: 'False', correct: true, order: 2 },
          ],
        };

        expect(getAssessmentItemErrors(assessmentItem)).toEqual([]);
      });
    });
  });
});
