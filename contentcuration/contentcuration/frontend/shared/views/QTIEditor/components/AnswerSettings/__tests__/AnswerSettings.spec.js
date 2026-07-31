import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import AnswerSettings from '../index.vue';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';

jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => {
  const { ref } = require('vue');
  return {
    __esModule: true,
    default: () => ({ windowIsSmall: ref(false) }),
  };
});

const defaultProps = {
  settings: ['shuffle', 'showAnswerCount'],
  shuffle: false,
  showAnswerCount: true,
};

describe('AnswerSettings', () => {
  it('renders answer settings label', () => {
    render(AnswerSettings, { props: defaultProps, routes: new VueRouter() });
    expect(screen.getByText(tr.$tr('answerSettingsLabel'))).toBeInTheDocument();
  });

  it('renders shuffle checkbox when included in settings', () => {
    render(AnswerSettings, { props: defaultProps, routes: new VueRouter() });
    expect(
      screen.getByRole('checkbox', { name: tr.$tr('shuffleAnswersLabel') }),
    ).toBeInTheDocument();
  });

  it('renders show answer count checkbox when included in settings', () => {
    render(AnswerSettings, { props: defaultProps, routes: new VueRouter() });
    expect(
      screen.getByRole('checkbox', { name: tr.$tr('showAnswerCountLabel') }),
    ).toBeInTheDocument();
  });

  it('does not render shuffle checkbox when not in settings', () => {
    render(AnswerSettings, {
      props: { ...defaultProps, settings: ['showAnswerCount'] },
      routes: new VueRouter(),
    });
    expect(
      screen.queryByRole('checkbox', { name: tr.$tr('shuffleAnswersLabel') }),
    ).not.toBeInTheDocument();
  });

  it('does not render show answer count checkbox when not in settings', () => {
    render(AnswerSettings, {
      props: { ...defaultProps, settings: ['shuffle'] },
      routes: new VueRouter(),
    });
    expect(
      screen.queryByRole('checkbox', { name: tr.$tr('showAnswerCountLabel') }),
    ).not.toBeInTheDocument();
  });

  it('emits update:shuffle when shuffle checkbox toggled', async () => {
    const { emitted } = render(AnswerSettings, { props: defaultProps, routes: new VueRouter() });

    const checkbox = screen.getByRole('checkbox', { name: tr.$tr('shuffleAnswersLabel') });
    await fireEvent.click(checkbox);

    expect(emitted()['update:shuffle']).toBeTruthy();
    expect(emitted()['update:shuffle'][0]).toEqual([true]);
  });

  it('emits update:showAnswerCount when show answer count checkbox toggled', async () => {
    const { emitted } = render(AnswerSettings, { props: defaultProps, routes: new VueRouter() });

    const checkbox = screen.getByRole('checkbox', { name: tr.$tr('showAnswerCountLabel') });
    await fireEvent.click(checkbox);

    expect(emitted()['update:showAnswerCount']).toBeTruthy();
    expect(emitted()['update:showAnswerCount'][0]).toEqual([false]);
  });

  it('opens shuffle info modal when info button clicked', async () => {
    render(AnswerSettings, { props: defaultProps, routes: new VueRouter() });

    const infoButtons = screen.getAllByRole('button', { name: tr.$tr('shuffleAnswersInfoTitle') });
    await fireEvent.click(infoButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(tr.$tr('shuffleAnswersInfoBody'))).toBeInTheDocument();
  });

  it('opens show answer count info modal when info button clicked', async () => {
    render(AnswerSettings, { props: defaultProps, routes: new VueRouter() });

    const infoButtons = screen.getAllByRole('button', {
      name: tr.$tr('showAnswerCountInfoTitle'),
    });
    await fireEvent.click(infoButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(tr.$tr('showAnswerCountInfoBody'))).toBeInTheDocument();
  });

  it('closes modal when Close button clicked', async () => {
    render(AnswerSettings, { props: defaultProps, routes: new VueRouter() });

    const infoButtons = screen.getAllByRole('button', { name: tr.$tr('shuffleAnswersInfoTitle') });
    await fireEvent.click(infoButtons[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: tr.$tr('closeBtnLabel') }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reflects shuffle prop value in checkbox', () => {
    render(AnswerSettings, {
      props: { ...defaultProps, shuffle: true },
      routes: new VueRouter(),
    });

    const checkbox = screen.getByRole('checkbox', { name: tr.$tr('shuffleAnswersLabel') });
    expect(checkbox).toBeChecked();
  });

  it('reflects showAnswerCount prop value in checkbox', () => {
    render(AnswerSettings, {
      props: { ...defaultProps, showAnswerCount: false },
      routes: new VueRouter(),
    });

    const checkbox = screen.getByRole('checkbox', { name: tr.$tr('showAnswerCountLabel') });
    expect(checkbox).not.toBeChecked();
  });
});
