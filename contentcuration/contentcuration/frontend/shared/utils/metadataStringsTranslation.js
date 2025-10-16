import camelCase from 'lodash/camelCase';

import { metadataStrings } from 'shared/strings/metadataStrings';

/**
 * An object mapping ad hoc keys (like those to be passed to CommonMetadataStrings()) which do not
 * conform to the expectations. Examples:
 *
 * - Misspelling of the key in CommonMetadataStrings but a kolibri-constant used to access it is
 *   spelled correctly and will not map.
 * - Keys were defined and string-froze which are not camelCase.
 * - Keys which, when _.camelCase()'ed will not result in a valid key, requiring manual mapping
 */
const nonconformingKeys = {
  PAPER_PENCIL: 'toUseWithPaperAndPencil',
  PEERS: 'peers',
  TEACHER: 'teacher',
  INTERNET: 'needsInternet',
  BASIC_SKILLS: 'allLevelsBasicSkills',
  FOUNDATIONS: 'basicSkills',
  foundationsLogicAndCriticalThinking: 'logicAndCriticalThinking',
  toolsAndSoftwareTraining: 'softwareToolsAndTraining',
  foundations: 'basicSkills',
  OTHER_SUPPLIES: 'needsMaterials',
  SPECIAL_SOFTWARE: 'softwareTools',
  PROFESSIONAL: 'specializedProfessionalTraining',
  WORK_SKILLS: 'allLevelsWorkSkills',
};

export function translateMetadataString(key) {
  const camelKey = camelCase(key);
  if (nonconformingKeys[key]) {
    key = nonconformingKeys[key];
  } else if (nonconformingKeys[camelKey]) {
    key = nonconformingKeys[camelKey];
  } else if (!metadataStrings._defaultMessages[key] && metadataStrings._defaultMessages[camelKey]) {
    key = camelKey;
  }
  return metadataStrings.$tr(key);
}
