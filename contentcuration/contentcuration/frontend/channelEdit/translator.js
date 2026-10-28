import { createTranslator } from 'shared/i18n';

const NAMESPACE = 'channelEditVue';

const MESSAGES = {
  selectionCount:
    '{topicCount, plural, =0 {} one {# folder, } other {# folders, }}{resourceCount, plural, one {# resource} other {# resources}}',
};

export default createTranslator(NAMESPACE, MESSAGES);
