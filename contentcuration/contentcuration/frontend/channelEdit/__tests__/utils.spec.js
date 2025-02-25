import each from 'jest-each';
import {
  floatOrIntRegex,
  getCorrectAnswersIndices,
  mapCorrectAnswers,
  updateAnswersToQuestionType,
  isImportedContent,
  importedChannelLink,
  secondsToHms,
  getCompletionCriteriaLabels,
  getCompletionDataFromNode,
} from '../utils';
import router from '../router';
import { RouteNames } from '../constants';
import { MasteryModelsNames } from 'shared/leUtils/MasteryModels';
import { AssessmentItemTypes, CompletionCriteriaModels } from 'shared/constants';

describe('channelEdit utils', () => {
  describe('imported content', () => {
    it('should provide a link to the original source', () => {
      const importedContent = {
        id: 'id-imported',
        node_id: 'imported-node-id',
        original_channel_name: 'Source Channel',
        original_channel_id: 'source-channel-id',
        original_source_node_id: 'source-node-id',
      };
      const notImportedContent = {
        id: 'id-not-imported',
        node_id: 'same-node-id',
        original_channel_name: null,
        original_channel_id: null,
        original_source_node_id: 'same-node-id',
      };
      expect(isImportedContent(importedContent)).toBe(true);
      expect(isImportedContent(notImportedContent)).toBe(false);

      const expectedRoute = router.resolve({
        name: RouteNames.ORIGINAL_SOURCE_NODE_IN_TREE_VIEW,
        params: {
          originalSourceNodeId: 'source-node-id',
        },
      });

      const expectedLink = `${window.Urls.channel('source-channel-id') + expectedRoute.href}`;
      expect(importedChannelLink(importedContent, router)).toBe(expectedLink);
      expect(importedChannelLink(notImportedContent, router)).toBe(null);
    });
  });
  describe('getCorrectAnswersIndices', () => {
    let questionKind;

    describe('for a single selection question', () => {
      beforeEach(() => {
        questionKind = AssessmentItemTypes.SINGLE_SELECTION;
      });

      it('returns null if there is no correct answer', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: false },
            { answer: 'Answer 2', correct: false },
          ]),
        ).toBeNull();
      });

      it('returns a correct answer index', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: false },
            { answer: 'Answer 2', correct: true },
          ]),
        ).toBe(1);
      });
    });

    describe('for a true/false question', () => {
      beforeEach(() => {
        questionKind = AssessmentItemTypes.TRUE_FALSE;
      });

      it('returns null if there is no correct answer', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'True', correct: false },
            { answer: 'False', correct: false },
          ]),
        ).toBeNull();
      });

      it('returns a correct answer index', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'True', correct: false },
            { answer: 'False', correct: true },
          ]),
        ).toBe(1);
      });
    });

    describe('for a multiple selection question', () => {
      beforeEach(() => {
        questionKind = AssessmentItemTypes.MULTIPLE_SELECTION;
      });

      it('returns an empty array if there is no correct answer', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: false },
            { answer: 'Answer 2', correct: false },
            { answer: 'Answer 3', correct: false },
          ]),
        ).toEqual([]);
      });

      it('returns an array of correct answer indices', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: true },
            { answer: 'Answer 2', correct: false },
            { answer: 'Answer 3', correct: true },
          ]),
        ).toEqual([0, 2]);
      });
    });

    describe('for an input question', () => {
      beforeEach(() => {
        questionKind = AssessmentItemTypes.INPUT_QUESTION;
      });

      it('returns an empty array if there is no correct answer', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: false },
            { answer: 'Answer 2', correct: false },
            { answer: 'Answer 3', correct: false },
          ]),
        ).toEqual([]);
      });

      it('returns an array of correct answer indices', () => {
        expect(
          getCorrectAnswersIndices(questionKind, [
            { answer: 'Answer 1', correct: true },
            { answer: 'Answer 2', correct: true },
            { answer: 'Answer 3', correct: true },
          ]),
        ).toEqual([0, 1, 2]);
      });
    });
  });

  describe('mapCorrectAnswers', () => {
    describe('for a single correct answer index', () => {
      it('returns updated answers', () => {
        expect(
          mapCorrectAnswers(
            [
              { answer: 'Answer 1', correct: true },
              { answer: 'Answer 2', correct: false },
              { answer: 'Answer 3', correct: true },
            ],
            1,
          ),
        ).toEqual([
          { answer: 'Answer 1', correct: false },
          { answer: 'Answer 2', correct: true },
          { answer: 'Answer 3', correct: false },
        ]);
      });
    });

    describe('for an array of correct answers indices', () => {
      it('returns updated answers', () => {
        expect(
          mapCorrectAnswers(
            [
              { answer: 'Answer 1', correct: true },
              { answer: 'Answer 2', correct: false },
              { answer: 'Answer 3', correct: true },
            ],
            [1, 2],
          ),
        ).toEqual([
          { answer: 'Answer 1', correct: false },
          { answer: 'Answer 2', correct: true },
          { answer: 'Answer 3', correct: true },
        ]);
      });
    });
  });

  describe('updateAnswersToQuestionType', () => {
    let answers;

    describe('when converting originally empty answers to true/false', () => {
      it('returns true/false answers', () => {
        expect(updateAnswersToQuestionType(AssessmentItemTypes.TRUE_FALSE, [])).toEqual([
          { answer: 'True', correct: true, order: 1 },
          { answer: 'False', correct: false, order: 2 },
        ]);
      });
    });

    describe('for originally single selection answers', () => {
      beforeEach(() => {
        answers = [
          { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
          { answer: 'Peanut butter', correct: true, order: 2 },
          { answer: 'Jelly', correct: false, order: 3 },
        ];
      });

      describe('conversion to single selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers),
          ).toEqual(answers);
        });
      });

      describe('conversion to multiple selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.MULTIPLE_SELECTION, answers),
          ).toEqual(answers);
        });
      });

      describe('conversion to input question', () => {
        beforeEach(() => {
          answers = [
            { answer: '1500', correct: false, order: 1 },
            { answer: '1500.00', correct: false, order: 2 },
            { answer: '-1500.00', correct: true, order: 3 },
            { answer: '1500 with alphabetical', correct: false, order: 4 },
            { answer: '$1500.00', correct: false, order: 5 },
          ];
        });

        it('makes all answers correct and removes any answers with non-numeric characters', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.INPUT_QUESTION, answers)).toEqual([
            { answer: '1500', correct: true, order: 1 },
            { answer: '1500.00', correct: true, order: 2 },
            { answer: '-1500.00', correct: true, order: 3 },
          ]);
        });
      });

      describe('conversion to true/false', () => {
        it('returns true/false answers only', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.TRUE_FALSE, answers)).toEqual([
            { answer: 'True', correct: true, order: 1 },
            { answer: 'False', correct: false, order: 2 },
          ]);
        });
      });
    });

    describe('for originally input question', () => {
      beforeEach(() => {
        answers = [
          { answer: '8', correct: true, order: 1 },
          { answer: '8.0', correct: true, order: 2 },
          { answer: '-400.19090', correct: true, order: 3 },
          { answer: '-140140104', correct: true, order: 4 },
        ];
      });

      describe('conversion to input question', () => {
        it('returns the same answers', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.INPUT_QUESTION, answers)).toEqual(
            answers,
          );
        });
      });

      describe('conversion to multiple selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.MULTIPLE_SELECTION, answers),
          ).toEqual(answers);
        });
      });

      describe('conversion to single selection', () => {
        it('keeps only first answer as correct', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers),
          ).toEqual([
            { answer: '8', correct: true, order: 1 },
            { answer: '8.0', correct: false, order: 2 },
            { answer: '-400.19090', correct: false, order: 3 },
            { answer: '-140140104', correct: false, order: 4 },
          ]);
        });
      });

      describe('conversion to true/false', () => {
        it('returns true/false answers only', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.TRUE_FALSE, answers)).toEqual([
            { answer: 'True', correct: true, order: 1 },
            { answer: 'False', correct: false, order: 2 },
          ]);
        });
      });
    });

    describe('for originally true/false question', () => {
      beforeEach(() => {
        answers = [
          { answer: 'True', correct: false, order: 1 },
          { answer: 'False', correct: true, order: 2 },
        ];
      });

      describe('conversion to true/false question', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers),
          ).toEqual(answers);
        });
      });

      describe('conversion to multiple selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.MULTIPLE_SELECTION, answers),
          ).toEqual(answers);
        });
      });

      describe('conversion to single selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers),
          ).toEqual(answers);
        });
      });

      describe('conversion to input question', () => {
        it('remove all answers', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.INPUT_QUESTION, answers)).toEqual(
            [],
          );
        });
      });
    });

    describe('for originally multiple selection answers', () => {
      describe('conversion to multiple selection', () => {
        it('returns the same answers', () => {
          expect(
            updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers),
          ).toEqual(answers);
        });
      });

      describe('conversion to single selection', () => {
        describe('if there are some correct answers', () => {
          beforeEach(() => {
            answers = [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
              { answer: 'Peanut butter', correct: true, order: 2 },
              { answer: 'Jelly', correct: true, order: 3 },
            ];
          });

          it('keeps only first correct answer', () => {
            expect(
              updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers),
            ).toEqual([
              { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
              { answer: 'Peanut butter', correct: true, order: 2 },
              { answer: 'Jelly', correct: false, order: 3 },
            ]);
          });
        });

        describe('if there is no correct answer', () => {
          beforeEach(() => {
            answers = [
              { answer: 'Mayonnaise (I mean you can, but...)', correct: false, order: 1 },
              { answer: 'Peanut butter', correct: false, order: 2 },
              { answer: 'Jelly', correct: false, order: 3 },
            ];
          });

          it('makes a first answer correct', () => {
            expect(
              updateAnswersToQuestionType(AssessmentItemTypes.SINGLE_SELECTION, answers),
            ).toEqual([
              { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
              { answer: 'Peanut butter', correct: false, order: 2 },
              { answer: 'Jelly', correct: false, order: 3 },
            ]);
          });
        });
      });

      describe('conversion to input question', () => {
        beforeEach(() => {
          answers = [
            { answer: '1500', correct: false, order: 1 },
            { answer: '1500 00', correct: false, order: 2 },
            { answer: '1500 with alphabetical', correct: false, order: 3 },
          ];
        });

        it('makes all answers correct and removes any answers with non-numeric characters', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.INPUT_QUESTION, answers)).toEqual([
            { answer: '1500', correct: true, order: 1 },
          ]);
        });
      });

      describe('conversion to true/false', () => {
        beforeEach(() => {
          answers = [
            { answer: 'Mayonnaise (I mean you can, but...)', correct: true, order: 1 },
            { answer: 'Peanut butter', correct: false, order: 2 },
            { answer: 'Jelly', correct: true, order: 3 },
          ];
        });

        it('returns true/false answers only', () => {
          expect(updateAnswersToQuestionType(AssessmentItemTypes.TRUE_FALSE, answers)).toEqual([
            { answer: 'True', correct: true, order: 1 },
            { answer: 'False', correct: false, order: 2 },
          ]);
        });
      });
    });
  });

  // At least we know that these will work
  describe('floatOrIntRegex', () => {
    it('tests true for valid values', () => {
      [
        '1.5', // Float
        '-4.5', // Signed Float
        '+1', // Signed Int
        '10e5', // Exponentiation
        '-15.3e5', // Combo
        '-12345.67890e98', // Combo 2
      ].forEach(v => expect(floatOrIntRegex.test(v)).toBe(true));
    });

    it('tests false for invalid values', () => {
      [
        'i * 1.5', // Math
        'one.point.five', // Text
        '10 5 0 100', // Spaces
        '1.2.3.4', // IP
      ].forEach(v => expect(floatOrIntRegex.test(v)).toBe(false));
    });
  });

  describe(`secondsToHms`, () => {
    it(`converts 0 seconds to '00:00'`, () => {
      expect(secondsToHms(0)).toBe('00:00');
    });

    it(`converts seconds to 'mm:ss' when it's less than one hour`, () => {
      expect(secondsToHms(3599)).toBe('59:59');
    });

    it(`converts seconds to 'hh:mm:ss' when it's exactly one hour`, () => {
      expect(secondsToHms(3600)).toBe('01:00:00');
    });

    it(`converts seconds to 'hh:mm:ss' when it's more than one hour`, () => {
      expect(secondsToHms(7323)).toBe('02:02:03');
    });
  });

  describe(`getCompletionCriteriaLabels`, () => {
    describe(`setting default values for completion and duration`, () => {
      describe(`for audio and video content`, () => {
        it(`returns 'When time spent is equal to duration' completion label and  duration label equal to the file length in hh:mm:ss format`, () => {
          expect(
            getCompletionCriteriaLabels(
              {
                extra_fields: {
                  options: {},
                },
                kind: 'audio',
              },
              [{ duration: 100 }],
            ),
          ).toEqual({
            completion: 'When time spent is equal to duration',
            duration: '01:40',
          });
        });
        it(`returns 'When time spent is equal to duration' completion label and  duration label equal to the file length in hh:mm:ss format`, () => {
          expect(
            getCompletionCriteriaLabels(
              {
                extra_fields: {
                  options: {},
                },
                kind: 'video',
              },
              [{ duration: 100 }],
            ),
          ).toEqual({
            completion: 'When time spent is equal to duration',
            duration: '01:40',
          });
        });
      });
      describe(`for documents`, () => {
        it(`returns 'Viewed in its entirety' completion label and empty duration label`, () => {
          expect(
            getCompletionCriteriaLabels(
              {
                extra_fields: {
                  options: {},
                },
                kind: 'document',
              },
              [],
            ),
          ).toEqual({
            completion: 'Viewed in its entirety',
            duration: '-',
          });
        });
      });
      describe(`for exercises`, () => {
        it(`sets the Completion Criteria model to 'mastery'`, () => {
          expect(
            getCompletionDataFromNode(
              {
                extra_fields: {
                  options: {},
                },
                kind: 'exercise',
              },
              [],
            ).completionModel,
          ).toEqual('mastery');
        });
      });
    });

    describe(`for 'reference' completion criteria`, () => {
      it(`returns 'Reference material' completion label and empty duration label`, () => {
        expect(
          getCompletionCriteriaLabels({
            extra_fields: {
              options: {
                completion_criteria: {
                  model: CompletionCriteriaModels.REFERENCE,
                },
              },
            },
          }),
        ).toEqual({
          completion: 'Reference material',
          duration: '-',
        });
      });
    });

    describe(`for 'time' completion criteria`, () => {
      it(`returns 'When time spent is equal to duration' completion label and human-readable duration label`, () => {
        expect(
          getCompletionCriteriaLabels({
            extra_fields: {
              options: {
                completion_criteria: {
                  model: CompletionCriteriaModels.TIME,
                },
              },
            },
            suggested_duration: 3820,
          }),
        ).toEqual({
          completion: 'When time spent is equal to duration',
          duration: '01:03:40',
        });
      });
    });

    describe(`for 'approximate time' completion criteria`, () => {
      it(`returns 'When time spent is equal to duration' completion label`, () => {
        expect(
          getCompletionCriteriaLabels({
            extra_fields: {
              options: {
                completion_criteria: {
                  model: CompletionCriteriaModels.APPROX_TIME,
                },
              },
            },
            suggested_duration: 1859,
          }).completion,
        ).toBe('When time spent is equal to duration');
      });

      it(`returns 'Short activity' duration label for a short activity`, () => {
        expect(
          getCompletionCriteriaLabels({
            extra_fields: {
              options: {
                completion_criteria: {
                  model: CompletionCriteriaModels.APPROX_TIME,
                },
              },
            },
            suggested_duration: 1860,
          }).duration,
        ).toBe('Short activity');
      });

      it(`returns 'Long activity' duration label for a long activity`, () => {
        expect(
          getCompletionCriteriaLabels({
            extra_fields: {
              options: {
                completion_criteria: {
                  model: CompletionCriteriaModels.APPROX_TIME,
                },
              },
            },
            suggested_duration: 1861,
          }).duration,
        ).toBe('Long activity');
      });
    });

    describe(`for 'pages' completion criteria`, () => {
      it(`returns 'Viewed in its entirety' completion label and empty duration label`, () => {
        expect(
          getCompletionCriteriaLabels({
            extra_fields: {
              options: {
                completion_criteria: {
                  model: CompletionCriteriaModels.PAGES,
                  threshold: '100%',
                },
              },
            },
          }),
        ).toEqual({
          completion: 'Viewed in its entirety',
          duration: '-',
        });
      });
    });

    describe(`for 'determined by resource' completion criteria`, () => {
      it(`returns 'Determined by the resource' completion label and empty duration label`, () => {
        expect(
          getCompletionCriteriaLabels({
            extra_fields: {
              options: {
                completion_criteria: {
                  model: CompletionCriteriaModels.DETERMINED_BY_RESOURCE,
                },
              },
            },
          }),
        ).toEqual({
          completion: 'Determined by the resource',
          duration: '-',
        });
      });
    });

    describe(`for 'mastery' completion criteria`, () => {
      it(`returns 'Goal: m out of n' completion label and empty duration label for 'm of n' mastery`, () => {
        expect(
          getCompletionCriteriaLabels({
            extra_fields: {
              options: {
                completion_criteria: {
                  model: CompletionCriteriaModels.MASTERY,
                  threshold: {
                    mastery_model: MasteryModelsNames.M_OF_N,
                    m: 4,
                    n: 5,
                  },
                },
              },
            },
          }),
        ).toEqual({
          completion: 'Goal: 4 out of 5',
          duration: '-',
        });
      });

      it(`returns 'Goal: 100% correct' completion label and empty duration label for 'do all' mastery`, () => {
        expect(
          getCompletionCriteriaLabels({
            extra_fields: {
              options: {
                completion_criteria: {
                  model: CompletionCriteriaModels.MASTERY,
                  threshold: {
                    mastery_model: MasteryModelsNames.DO_ALL,
                  },
                },
              },
            },
          }),
        ).toEqual({
          completion: 'Goal: 100% correct',
          duration: '-',
        });
      });

      each([
        [2, MasteryModelsNames.NUM_CORRECT_IN_A_ROW_2],
        [3, MasteryModelsNames.NUM_CORRECT_IN_A_ROW_3],
        [5, MasteryModelsNames.NUM_CORRECT_IN_A_ROW_5],
        [10, MasteryModelsNames.NUM_CORRECT_IN_A_ROW_10],
      ]).it(
        `returns 'Goal: %s in a row' completion label and empty duration label for '%s' mastery`,
        (num, mastery_model) => {
          expect(
            getCompletionCriteriaLabels({
              extra_fields: {
                options: {
                  completion_criteria: {
                    model: CompletionCriteriaModels.MASTERY,
                    threshold: {
                      mastery_model,
                    },
                  },
                },
              },
            }),
          ).toEqual({
            completion: `Goal: ${num} in a row`,
            duration: '-',
          });
        },
      );
    });
  });
});
