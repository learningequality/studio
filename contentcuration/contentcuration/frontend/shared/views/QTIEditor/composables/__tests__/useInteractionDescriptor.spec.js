import { render } from '@testing-library/vue';
import { defineComponent, ref, nextTick } from 'vue';
import VueRouter from 'vue-router';
import useInteractionDescriptor from '../useInteractionDescriptor';
import { QtiInteraction, QuestionType } from '../../constants';

import {
  CHOICE_SINGLE_SELECT_XML,
  CHOICE_MULTI_SELECT_XML,
  UNKNOWN_INTERACTION_XML,
} from '../../utils/testingFixtures';

// ---------------------------------------------------------------------------
// Helper: renders a wrapper component that runs the composable inside setup().
// Because questionType is now set on mount (not as a computed), we must wait
// for the component to mount before checking reactive values.
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
    it('resolves the Choice descriptor by its type', async () => {
      const { result } = renderDescriptor(CHOICE_SINGLE_SELECT_XML);
      await nextTick();
      expect(result.descriptor.value.type).toBe(QtiInteraction.CHOICE);
    });

    it('resolves questionType as singleSelect when max-choices is 1', async () => {
      const { result } = renderDescriptor(CHOICE_SINGLE_SELECT_XML);
      await nextTick();
      expect(result.questionType.value).toBe(QuestionType.SINGLE_SELECT);
    });

    it('resolves questionType as multiSelect when max-choices > 1', async () => {
      const { result } = renderDescriptor(CHOICE_MULTI_SELECT_XML);
      await nextTick();
      expect(result.questionType.value).toBe(QuestionType.MULTI_SELECT);
    });

    it('returns null parseError for valid XML', async () => {
      const { result } = renderDescriptor(CHOICE_SINGLE_SELECT_XML);
      await nextTick();
      expect(result.parseError.value).toBeNull();
    });
  });

  describe('with an unrecognized interaction type', () => {
    it('falls back to the default descriptor without a parse error', async () => {
      const { result } = renderDescriptor(UNKNOWN_INTERACTION_XML);
      await nextTick();
      expect(result.parseError.value).toBeNull();
    });

    it('still returns a defined fallback descriptor', async () => {
      const { result } = renderDescriptor(UNKNOWN_INTERACTION_XML);
      await nextTick();
      expect(result.descriptor.value).toBeDefined();
      expect(typeof result.descriptor.value.matches).toBe('function');
    });
  });

  describe('with a null or empty bodyXmlRef', () => {
    it('returns the default descriptor when bodyXmlRef is null', async () => {
      const { result } = renderDescriptor(null);
      await nextTick();
      expect(result.descriptor.value).toBeDefined();
      expect(result.parseError.value).toBeNull();
    });

    it('returns null questionType when bodyXmlRef is null', async () => {
      const { result } = renderDescriptor(null);
      await nextTick();
      expect(result.questionType.value).toBeNull();
    });

    it('returns the default descriptor when bodyXmlRef is an empty string', async () => {
      const { result } = renderDescriptor('');
      await nextTick();
      expect(result.descriptor.value).toBeDefined();
      expect(result.parseError.value).toBeNull();
    });
  });

  describe('with malformed XML', () => {
    it('returns a non-null parseError', async () => {
      const { result } = renderDescriptor('<unclosed');
      await nextTick();
      expect(result.parseError.value).not.toBeNull();
      expect(typeof result.parseError.value).toBe('string');
    });

    it('still returns a defined fallback descriptor on parse error', async () => {
      const { result } = renderDescriptor('<bad xml!!{');
      await nextTick();
      expect(result.descriptor.value).toBeDefined();
    });
  });

  describe('questionType as a writable ref', () => {
    it('descriptor recomputes when questionType is changed directly', async () => {
      const { result } = renderDescriptor(CHOICE_SINGLE_SELECT_XML);
      await nextTick();

      expect(result.questionType.value).toBe(QuestionType.SINGLE_SELECT);
      expect(result.descriptor.value.type).toBe(QtiInteraction.CHOICE);

      // Simulate user switching question type via the selector
      result.questionType.value = QuestionType.MULTI_SELECT;
      await nextTick();

      // Still the same descriptor (choice handles both), but questionType changed
      expect(result.descriptor.value.type).toBe(QtiInteraction.CHOICE);
      expect(result.questionType.value).toBe(QuestionType.MULTI_SELECT);
    });
  });
});
