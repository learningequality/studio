import { RouteNames } from './constants';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { MasteryModelsNames } from 'shared/leUtils/MasteryModels';
import { metadataStrings } from 'shared/strings/metadataStrings';
import { constantStrings } from 'shared/mixins';
import {
  ContentModalities,
  CompletionCriteriaModels,
  SHORT_LONG_ACTIVITY_MIDPOINT,
  defaultCompletionCriteriaModels,
  defaultCompletionCriteriaThresholds,
} from 'shared/constants';

export function isImportedContent(node) {
  return Boolean(
    node && node.original_source_node_id && node.node_id !== node.original_source_node_id,
  );
}

export function isDisableSourceEdits(node) {
  return node.freeze_authoring_data || isImportedContent(node);
}

export function importedChannelLink(node, router) {
  if (node && isImportedContent(node)) {
    const channelURI = window.Urls.channel(node.original_channel_id);
    const sourceNodeRoute = router.resolve({
      name: RouteNames.ORIGINAL_SOURCE_NODE_IN_TREE_VIEW,
      params: { originalSourceNodeId: node.original_source_node_id },
    });
    return `${channelURI + sourceNodeRoute.href}`;
  } else {
    return null;
  }
}

/**
 * Converts a value in seconds to a human-readable format.
 * If the value is greater than or equal to one hour, the format will be hh:mm:ss.
 * If the value is less than one hour, the format will be mm:ss.
 *
 * @param {Number} seconds - The value in seconds to be converted.
 * @returns {String} The value in human-readable format.
 */
export function secondsToHms(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds - hours * 3600) / 60);
  const remainingSeconds = seconds - hours * 3600 - minutes * 60;

  let hms = '';
  if (hours > 0) {
    hms += hours.toString().padStart(2, '0') + ':';
  }
  hms += minutes.toString().padStart(2, '0') + ':' + remainingSeconds.toString().padStart(2, '0');
  return hms;
}

/**
 * Set a default duration for audiovisual content
 * equal to the file length in seconds (parsed), or a fallback placeholder
 *
 * @param {Array} files
 * @returns {String|Number} {human-readable duration}
 */
export function getAudioVideoDefaultDuration(files) {
  return files && files[0] ? secondsToHms(files[0].duration) : '-';
}

/**
 * Set a default completion threshold for audiovisual content
 * equal to the file's duration
 *
 * @param {Object} node
 * @returns {String|Number} {human-readable threshold}
 */
export function generateDefaultThreshold(node) {
  if (node.kind !== ContentKindsNames.AUDIO || node.kind !== ContentKindsNames.VIDEO) {
    return defaultCompletionCriteriaThresholds[node.kind];
  }
}

/**
 * Gathers data from a content node related to its completion.
 *
 * @param {Object} node
 * @returns {Object} { completionModel, completionThreshold, masteryModel,
 *                     suggestedDurationType, suggestedDuration}
 */
export function getCompletionDataFromNode(node) {
  if (!node) {
    return;
  }

  const extraFields = node?.extra_fields || {};
  const options = extraFields?.options || {};
  const completionCriteria = options?.completion_criteria || null;
  const threshold = completionCriteria?.threshold || generateDefaultThreshold(node);
  const model = completionCriteria?.model || defaultCompletionCriteriaModels[node.kind];
  const modality = options?.modality || null;
  const suggestedDurationType = extraFields?.suggested_duration_type;
  const suggestedDuration = node.suggested_duration;

  return {
    completionModel: model,
    completionThreshold: threshold,
    masteryModel: threshold?.mastery_model,
    modality,
    suggestedDurationType,
    suggestedDuration,
  };
}

/**
 * @param {Object} node
 * @returns {Boolean, undefined}
 */
export function isLongActivity(node) {
  if (!node) {
    return;
  }
  const { completionModel, suggestedDuration } = getCompletionDataFromNode(node);
  return (
    completionModel === CompletionCriteriaModels.APPROX_TIME &&
    suggestedDuration > SHORT_LONG_ACTIVITY_MIDPOINT
  );
}

/**
 * Determines completion and duration labels from completion
 * criteria and related of a content node.
 *
 * @param {Object} node
 * @returns {Object} { completion, duration }
 */
export function getCompletionCriteriaLabels(node = {}, files = []) {
  if (!node && !files) {
    return;
  }
  const { completionModel, completionThreshold, masteryModel, modality, suggestedDuration } =
    getCompletionDataFromNode(node);

  const labels = {
    completion: '-',
    duration: '-',
  };

  switch (completionModel) {
    case CompletionCriteriaModels.REFERENCE:
      labels.completion = metadataStrings.$tr('reference');
      break;

    case CompletionCriteriaModels.TIME:
      labels.completion = metadataStrings.$tr('completeDuration');
      if (node.kind === ContentKindsNames.AUDIO || node.kind === ContentKindsNames.VIDEO) {
        labels.duration = getAudioVideoDefaultDuration(files);
      } else if (suggestedDuration) {
        labels.duration = secondsToHms(suggestedDuration);
      }
      break;

    case CompletionCriteriaModels.APPROX_TIME:
      labels.completion = metadataStrings.$tr('completeDuration');
      if (isLongActivity(node)) {
        labels.duration = metadataStrings.$tr('longActivity');
      } else {
        labels.duration = metadataStrings.$tr('shortActivity');
      }
      break;

    case CompletionCriteriaModels.PAGES:
      if (completionThreshold === '100%') {
        labels.completion = metadataStrings.$tr('allContent');
      }
      break;

    case CompletionCriteriaModels.MASTERY:
      if (!masteryModel) {
        break;
      }
      if (masteryModel === MasteryModelsNames.M_OF_N) {
        labels.completion = metadataStrings.$tr('masteryMofN', {
          m: completionThreshold.m,
          n: completionThreshold.n,
        });
      } else if (
        masteryModel === MasteryModelsNames.DO_ALL &&
        modality === ContentModalities.QUIZ
      ) {
        labels.completion = metadataStrings.$tr('practiceQuiz');
      } else {
        labels.completion = constantStrings.$tr(masteryModel);
      }
      break;

    case CompletionCriteriaModels.DETERMINED_BY_RESOURCE:
      labels.completion = metadataStrings.$tr('determinedByResource');
      break;

    default:
      break;
  }

  return labels;
}
