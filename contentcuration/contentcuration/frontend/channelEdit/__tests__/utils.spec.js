import each from 'jest-each';
import {
  isImportedContent,
  importedChannelLink,
  secondsToHms,
  getCompletionCriteriaLabels,
  getCompletionDataFromNode,
} from '../utils';
import router from '../router';
import { RouteNames } from '../constants';
import { MasteryModelsNames } from 'shared/leUtils/MasteryModels';
import { CompletionCriteriaModels } from 'shared/constants';

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
