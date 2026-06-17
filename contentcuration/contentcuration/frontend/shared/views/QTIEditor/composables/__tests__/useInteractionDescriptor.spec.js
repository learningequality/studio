import { render } from '@testing-library/vue';
import { defineComponent, ref, nextTick } from 'vue';
import VueRouter from 'vue-router';
import useInteractionDescriptor from '../useInteractionDescriptor';
import { QtiInteraction } from '../../constants';

import {
  CHOICE_SINGLE_SELECT_XML,
  CHOICE_MULTI_SELECT_XML,
  UNKNOWN_INTERACTION_XML,
} from '../../utils/testingFixtures';

// ---------------------------------------------------------------------------
// Helper: renders a wrapper component that runs the composable inside setup()
// Returns { result, bodyXmlRef } — result holds the reactive return value,
// bodyXmlRef can be mutated to test reactivity.
// ---------------------------------------------------------------------------

function renderDescriptor(initialXml = null) {
  const bodyXmlRef = ref(initialXml);
  let result;

  const TestWrapper = defineComponent({
    setup() {
      result = useInteractionDescriptor(bodyXmlRef);
      return {};
    },
    template: '<div></div>',
  });

  render(TestWrapper, { routes: new VueRouter() });
  return { result, bodyXmlRef };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useInteractionDescriptor', () => {
  describe('with a valid choice interaction', () => {
    it('resolves the Choice descriptor by its type', () => {
      const { result } = renderDescriptor(CHOICE_SINGLE_SELECT_XML);
      expect(result.descriptor.value.type).toBe(QtiInteraction.CHOICE);
    });

    it('resolves questionType as singleSelect when max-choices is 1', () => {
      const { result } = renderDescriptor(CHOICE_SINGLE_SELECT_XML);
      expect(result.questionType.value).toBe('singleSelect');
    });

    it('resolves questionType as multiSelect when max-choices > 1', () => {
      const { result } = renderDescriptor(CHOICE_MULTI_SELECT_XML);
      expect(result.questionType.value).toBe('multiSelect');
    });

    it('returns null parseError for valid XML', () => {
      const { result } = renderDescriptor(CHOICE_SINGLE_SELECT_XML);
      expect(result.parseError.value).toBeNull();
    });
  });

  describe('with an unrecognized interaction type', () => {
    it('falls back to the default descriptor without a parse error', () => {
      const { result } = renderDescriptor(UNKNOWN_INTERACTION_XML);
      expect(result.parseError.value).toBeNull();
    });

    it('still returns a defined fallback descriptor', () => {
      const { result } = renderDescriptor(UNKNOWN_INTERACTION_XML);
      expect(result.descriptor.value).toBeDefined();
      expect(typeof result.descriptor.value.matches).toBe('function');
    });
  });

  describe('with a null or empty bodyXmlRef', () => {
    it('returns a defined descriptor when bodyXmlRef is null', () => {
      const { result } = renderDescriptor(null);
      expect(result.descriptor.value).toBeDefined();
      expect(result.parseError.value).toBeNull();
    });

    it('returns null questionType when bodyXmlRef is null', () => {
      const { result } = renderDescriptor(null);
      expect(result.questionType.value).toBeNull();
    });

    it('returns a defined descriptor when bodyXmlRef is an empty string', () => {
      const { result } = renderDescriptor('');
      expect(result.descriptor.value).toBeDefined();
      expect(result.parseError.value).toBeNull();
    });
  });

  describe('with malformed XML', () => {
    it('returns a non-null parseError', () => {
      const { result } = renderDescriptor('<unclosed');
      expect(result.parseError.value).not.toBeNull();
      expect(typeof result.parseError.value).toBe('string');
    });

    it('still returns a defined fallback descriptor on parse error', () => {
      const { result } = renderDescriptor('<bad xml!!{');
      expect(result.descriptor.value).toBeDefined();
    });
  });

  describe('reactivity', () => {
    it('recomputes questionType when bodyXmlRef changes from null to single-select', async () => {
      const { result, bodyXmlRef } = renderDescriptor(null);
      await nextTick();

      expect(result.questionType.value).toBeNull();

      bodyXmlRef.value = CHOICE_SINGLE_SELECT_XML;
      await nextTick();

      expect(result.questionType.value).toBe('singleSelect');
    });

    it('recomputes questionType when switching from single-select to multi-select', async () => {
      const { result, bodyXmlRef } = renderDescriptor(CHOICE_SINGLE_SELECT_XML);
      await nextTick();

      expect(result.questionType.value).toBe('singleSelect');

      bodyXmlRef.value = CHOICE_MULTI_SELECT_XML;
      await nextTick();

      expect(result.questionType.value).toBe('multiSelect');
    });
  });
});
