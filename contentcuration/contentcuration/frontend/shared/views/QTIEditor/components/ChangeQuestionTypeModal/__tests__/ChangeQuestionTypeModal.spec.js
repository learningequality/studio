import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import ChangeQuestionTypeModal from '../index.vue';
import { ConversionLoss } from '../../../constants';
import { qtiEditorStrings as tr } from '../../../qtiEditorStrings';

const renderModal = (props = {}) =>
  render(ChangeQuestionTypeModal, {
    props: {
      questionTypeLabel: 'Numeric input',
      losses: [ConversionLoss.INCORRECT_ANSWERS_REMOVED, ConversionLoss.FORMATTING_REMOVED],
      ...props,
    },
    routes: new VueRouter(),
  });

describe('ChangeQuestionTypeModal', () => {
  it('asks to confirm the change, naming the new type', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(tr.$tr('changeQuestionTypeTitle'))).toBeInTheDocument();
    expect(
      within(dialog).getByText(tr.$tr('changeQuestionTypeIntro', { type: 'Numeric input' })),
    ).toBeInTheDocument();
  });

  it('lists what the change would remove or change, one sentence each', () => {
    renderModal();
    const items = screen.getAllByRole('listitem').map(item => item.textContent.trim());
    expect(items).toEqual([tr.$tr('incorrectAnswersRemovedLoss'), tr.$tr('formattingRemovedLoss')]);
  });

  it('shows each blank of a folded passage as it will appear in the question', () => {
    renderModal({ losses: [ConversionLoss.PASSAGE_ADDED_TO_QUESTION] });
    expect(screen.getByRole('listitem')).toHaveTextContent(/"_____"/);
  });

  it.each(Object.values(ConversionLoss))('has a sentence for %s', loss => {
    renderModal({ losses: [loss] });
    expect(screen.getByRole('listitem').textContent.trim()).not.toBe('');
  });

  it('confirms with the Change button', async () => {
    const user = userEvent.setup();
    const { emitted } = renderModal();
    await user.click(screen.getByRole('button', { name: tr.$tr('changeQuestionTypeAction') }));
    expect(emitted().submit).toHaveLength(1);
    expect(emitted().cancel).toBeUndefined();
  });

  it('cancels with the Cancel button', async () => {
    const user = userEvent.setup();
    const { emitted } = renderModal();
    await user.click(screen.getByRole('button', { name: tr.$tr('cancelAction') }));
    expect(emitted().cancel).toHaveLength(1);
    expect(emitted().submit).toBeUndefined();
  });

  it('can be used with the keyboard only', async () => {
    const user = userEvent.setup();
    const { emitted } = renderModal();
    await user.keyboard('{Escape}');
    expect(emitted().cancel).toHaveLength(1);

    const change = screen.getByRole('button', { name: tr.$tr('changeQuestionTypeAction') });
    change.focus();
    await user.keyboard('{Enter}');
    expect(emitted().submit).toHaveLength(1);
  });
});
