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
});
