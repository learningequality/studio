import { nextTick } from 'vue';
import VueRouter from 'vue-router';
import { editors, registry } from '../index';
import { renderFocused } from './renderFocused';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false), windowIsLarge: ref(true) }),
  };
});

/**
 * The card focuses an editor's question when it opens, through the editor's focus(), and
 * nothing else does: so every editor has to provide one.
 */

describe('every interaction editor', () => {
  // Editors teleport their answer settings into the type selector's header. The target
  // outlives every editor: one teleported into a removed target never finishes unmounting.
  let settingsTarget;
  beforeAll(() => {
    settingsTarget = document.createElement('div');
    settingsTarget.id = 'settings-target';
    document.body.appendChild(settingsTarget);
  });
  afterAll(() => settingsTarget.remove());

  it.each(Object.keys(editors))(
    '%s opens and focuses its question when its card opens',
    async type => {
      renderFocused(editors[type], {
        props: {
          mode: 'edit',
          questionType: registry[type].questionTypes[0],
          interaction: { bodyXml: '', responseDeclarations: [] },
          teleportTargetId: 'settings-target',
        },
        routes: new VueRouter(),
      });
      // Opening the question re-renders it, and the rich text editor then takes focus.
      await nextTick();
      await nextTick();
      expect(document.activeElement.tagName).toBe('TEXTAREA');
    },
  );
});
