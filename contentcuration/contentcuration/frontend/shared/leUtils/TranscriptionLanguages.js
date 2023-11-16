/**
 * This file generates the list of supported caption languages by
 * filtering the full list of languages against the whisperLanguages object.
 * To switch to a new model for supported languages, you can update the
 * ai_supported_languages.json.
 */

import { LanguagesList } from 'shared/leUtils/Languages';
import aiSupportedLanguages from 'static/ai_supported_languages.json';

const whisperLanguages = aiSupportedLanguages

export const supportedCaptionLanguages = LanguagesList.filter(
  language => language.lang_code in whisperLanguages
);

export const notSupportedCaptionLanguages = LanguagesList.filter(
  language => !(language.lang_code in whisperLanguages)
);

export default supportedCaptionLanguages;
