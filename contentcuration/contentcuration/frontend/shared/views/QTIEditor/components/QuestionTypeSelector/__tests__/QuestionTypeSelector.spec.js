import { render, screen, fireEvent, within } from '@testing-library/vue';
import VueRouter from 'vue-router';
import QuestionTypeSelector from '../index.vue';
import { QuestionType } from '../../../constants';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';

const defaultProps = {
  questionType: QuestionType.SINGLE_SELECT,
  settingsTargetId: 'test-settings-target',
};

const renderHeader = (props = {}) =>
  render(QuestionTypeSelector, {
    props: { ...defaultProps, ...props },
    routes: new VueRouter(),
  });

describe('QuestionTypeSelector', () => {
  it('renders the type meta-label in edit mode', () => {
    renderHeader();
    expect(screen.getByText(tr.$tr('typeLabel'))).toBeInTheDocument();
  });

  it('renders a KSelect with the selected option label (not raw enum)', () => {
    renderHeader();
    expect(screen.getByText(tr.$tr('singleSelectLabel'))).toBeInTheDocument();
    expect(screen.queryByText(QuestionType.SINGLE_SELECT)).not.toBeInTheDocument();
  });

  it('renders the selected type label inside the type group', () => {
    renderHeader();
    const group = screen.getByRole('group', { name: tr.$tr('typeLabel') });
    expect(within(group).getByText(tr.$tr('singleSelectLabel'))).toBeInTheDocument();
  });

  it('opens type info modal when info button clicked', async () => {
    renderHeader();

    const helpButton = screen.getByRole('button', { name: tr.$tr('responseTypeInfoTitle') });
    await fireEvent.click(helpButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(tr.$tr('singleChoiceDescription'))).toBeInTheDocument();
    expect(screen.getByText(tr.$tr('multipleSelectionDescription'))).toBeInTheDocument();
  });

  it('closes type info modal when Close button clicked', async () => {
    renderHeader();

    await fireEvent.click(screen.getByRole('button', { name: tr.$tr('responseTypeInfoTitle') }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: tr.$tr('closeBtnLabel') }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('emits update:questionType when a new type is selected', async () => {
    const { emitted } = renderHeader();

    // Click the currently selected option to open the dropdown
    await fireEvent.click(screen.getByText(tr.$tr('singleSelectLabel')));

    // Click the new option from the dropdown menu
    await fireEvent.click(screen.getByText(tr.$tr('multiSelectLabel')));

    expect(emitted()['update:questionType']).toBeTruthy();
    expect(emitted()['update:questionType'][0]).toEqual([QuestionType.MULTI_SELECT]);
  });

  describe('free response', () => {
    const openDropdown = async () => fireEvent.click(screen.getByText(tr.$tr('singleSelectLabel')));

    it('is offered where a question need not be scored', async () => {
      renderHeader({ allowFreeResponse: true });
      await openDropdown();
      expect(screen.getByText(tr.$tr('freeResponseLabel'))).toBeInTheDocument();
    });

    it('is not offered where the questions are scored', async () => {
      renderHeader({ allowFreeResponse: false });
      await openDropdown();
      expect(screen.queryByText(tr.$tr('freeResponseLabel'))).not.toBeInTheDocument();
    });

    it('leaves the other types alone', async () => {
      renderHeader({ allowFreeResponse: false });
      await openDropdown();
      expect(screen.getByText(tr.$tr('multiSelectLabel'))).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('numericLabel'))).toBeInTheDocument();
      expect(screen.getByText(tr.$tr('textEntryLabel'))).toBeInTheDocument();
    });

    it('stays available to a question that already is one, so it can be changed', async () => {
      renderHeader({ allowFreeResponse: false, questionType: QuestionType.FREE_RESPONSE });
      // Shown as the selection, rather than the select falling back to another type
      expect(screen.getByText(tr.$tr('freeResponseLabel'))).toBeInTheDocument();

      await fireEvent.click(screen.getByText(tr.$tr('freeResponseLabel')));
      expect(screen.getByText(tr.$tr('multiSelectLabel'))).toBeInTheDocument();
    });

    it('says why it cannot stay, for a question that already is one', () => {
      renderHeader({ allowFreeResponse: false, questionType: QuestionType.FREE_RESPONSE });
      expect(screen.getByRole('alert')).toHaveTextContent(tr.$tr('errorFreeResponseNotAllowed'));
    });

    it('says nothing when the type is allowed', () => {
      renderHeader({ allowFreeResponse: true, questionType: QuestionType.FREE_RESPONSE });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('says nothing about a question that is not a free response', () => {
      renderHeader({ allowFreeResponse: false });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
