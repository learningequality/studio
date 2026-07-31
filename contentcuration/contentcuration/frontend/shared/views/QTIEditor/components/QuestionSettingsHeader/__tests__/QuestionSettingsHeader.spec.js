import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import QuestionSettingsHeader from '../index.vue';
import { QuestionType } from '../../../constants';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';

jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false) }),
  };
});

const defaultProps = {
  questionType: QuestionType.SINGLE_SELECT,
  questionTypeOptions: [
    {
      value: QuestionType.SINGLE_SELECT,
      label: tr.$tr('singleSelectLabel'),
      description: tr.$tr('singleChoiceDescription'),
    },
    {
      value: QuestionType.MULTI_SELECT,
      label: tr.$tr('multiSelectLabel'),
      description: tr.$tr('multipleSelectionDescription'),
    },
  ],
  mode: 'edit',
};

const renderHeader = (props = {}) =>
  render(QuestionSettingsHeader, {
    props: { ...defaultProps, ...props },
    routes: new VueRouter(),
  });

describe('QuestionSettingsHeader', () => {
  it('renders the type meta-label in edit mode', () => {
    renderHeader();
    expect(screen.getByText(tr.$tr('typeLabel'))).toBeInTheDocument();
  });

  it('does not render in view mode', () => {
    renderHeader({ mode: 'view' });
    expect(screen.queryByText(tr.$tr('typeLabel'))).not.toBeInTheDocument();
  });

  it('renders a KSelect with the selected option label (not raw enum)', () => {
    renderHeader();
    expect(screen.getByText(tr.$tr('singleSelectLabel'))).toBeInTheDocument();
    expect(screen.queryByText(QuestionType.SINGLE_SELECT)).not.toBeInTheDocument();
  });

  it('renders the globe icon inside the KSelect via #display slot', () => {
    renderHeader();
    expect(document.querySelector('.select-globe-icon')).not.toBeNull();
    expect(document.querySelector('.select-display-row')).not.toBeNull();
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

  it('renders answer settings slot content when provided', () => {
    render(QuestionSettingsHeader, {
      props: defaultProps,
      slots: {
        answerSettings: '<div>Answer Settings Content</div>',
      },
      routes: new VueRouter(),
    });

    expect(screen.getByText('Answer Settings Content')).toBeInTheDocument();
  });

  it('disables selector when only one option available', () => {
    renderHeader({
      questionTypeOptions: [defaultProps.questionTypeOptions[0]],
    });

    const hiddenInput = document.querySelector('input[type="hidden"]');
    expect(hiddenInput).not.toBeNull();
    expect(screen.getByText(tr.$tr('typeLabel'))).toBeInTheDocument();
  });
});
