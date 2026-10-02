import { render } from '@testing-library/vue';
import { defineComponent, ref, nextTick } from 'vue';
import VueRouter from 'vue-router';
import useInteractionDescriptor from '../useInteractionDescriptor';
import { QtiInteraction, QuestionType } from '../../constants';

import {
  CHOICE_SINGLE_SELECT_XML,
  CHOICE_MULTI_SELECT_XML,
  UNKNOWN_INTERACTION_XML,
  TEXT_ENTRY_BODY_XML,
  TEXT_ENTRY_NUMERIC_DECL_XML,
  TEXT_ENTRY_STRING_DECL_XML,
  TEXT_ENTRY_FREE_DECL_XML,
} from '../../utils/testingFixtures';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');

function renderDescriptor(initialXml = null, declarations = []) {
  const interactionRef = ref(
    initialXml ? { bodyXml: initialXml, responseDeclarations: declarations } : null,
  );
  let result;

  const TestWrapper = defineComponent({
    setup() {
      result = useInteractionDescriptor(interactionRef);
      return {};
    },
    template: '<div></div>',
  });

  render(TestWrapper, { routes: new VueRouter() });
  return { result, interactionRef };
}

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
    it('resolves no descriptor and no parse error', async () => {
      const { result } = renderDescriptor(UNKNOWN_INTERACTION_XML);
      await nextTick();
      expect(result.descriptor.value).toBeNull();
      expect(result.parseError.value).toBeNull();
    });
  });

  describe('with a null or empty bodyXmlRef', () => {
    it.each([null, ''])('resolves no descriptor for %p', async xml => {
      const { result } = renderDescriptor(xml);
      await nextTick();
      expect(result.descriptor.value).toBeNull();
      expect(result.questionType.value).toBeNull();
      expect(result.parseError.value).toBeNull();
    });
  });

  describe('with malformed XML', () => {
    it('returns a parse error for malformed XML', async () => {
      const { result } = renderDescriptor('<unclosed');
      await nextTick();
      expect(typeof result.parseError.value).toBe('string');
      expect(result.parseError.value).toBe('This question could not be loaded');
    });

    it('resolves no descriptor on parse error', async () => {
      const { result } = renderDescriptor('<bad xml!!{');
      await nextTick();
      expect(result.descriptor.value).toBeNull();
    });
  });

  describe('questionType as a writable ref', () => {
    it('descriptor recomputes when questionType is changed directly', async () => {
      const { result } = renderDescriptor(CHOICE_SINGLE_SELECT_XML);
      await nextTick();

      expect(result.questionType.value).toBe(QuestionType.SINGLE_SELECT);
      expect(result.descriptor.value.type).toBe(QtiInteraction.CHOICE);

      result.questionType.value = QuestionType.MULTI_SELECT;
      await nextTick();

      expect(result.descriptor.value.type).toBe(QtiInteraction.CHOICE);
      expect(result.questionType.value).toBe(QuestionType.MULTI_SELECT);
    });
  });

  describe('with an inline text-entry interaction (bodyXml is qti-item-body)', () => {
    it('resolves the TextEntry descriptor for a numeric declaration', async () => {
      const { result } = renderDescriptor(TEXT_ENTRY_BODY_XML, [TEXT_ENTRY_NUMERIC_DECL_XML]);
      await nextTick();
      expect(result.descriptor.value.type).toBe(QtiInteraction.TEXT_ENTRY);
      expect(result.questionType.value).toBe(QuestionType.NUMERIC);
    });

    it('resolves the TextEntry descriptor for a string + correct-response (textEntry)', async () => {
      const { result } = renderDescriptor(TEXT_ENTRY_BODY_XML, [TEXT_ENTRY_STRING_DECL_XML]);
      await nextTick();
      expect(result.descriptor.value.type).toBe(QtiInteraction.TEXT_ENTRY);
      expect(result.questionType.value).toBe(QuestionType.TEXT_ENTRY);
    });

    it('resolves the TextEntry descriptor for a string with no correct-response (freeResponse)', async () => {
      const { result } = renderDescriptor(TEXT_ENTRY_BODY_XML, [TEXT_ENTRY_FREE_DECL_XML]);
      await nextTick();
      expect(result.descriptor.value.type).toBe(QtiInteraction.TEXT_ENTRY);
      expect(result.questionType.value).toBe(QuestionType.FREE_RESPONSE);
    });
  });
});
