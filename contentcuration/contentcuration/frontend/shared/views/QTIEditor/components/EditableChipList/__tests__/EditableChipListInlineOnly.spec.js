import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import EditableChipList from '../index.vue';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { stubProseMirrorLayout } from 'shared/utils/testing';

const { distractorsLabel$, addDistractorBtn$, editDistractorLabel$, deleteDistractorBtn$ } =
  qtiEditorStrings;

const renderList = props =>
  render(EditableChipList, {
    props: {
      chips: [{ id: 'choice_a', content: 'Antonio' }],
      addLabel: addDistractorBtn$(),
      listLabel: distractorsLabel$(),
      chipLabel: number => editDistractorLabel$({ number }),
      deleteLabel: number => deleteDistractorBtn$({ number }),
      ...props,
    },
    routes: new VueRouter(),
  });

const openEditor = async buttonName => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: buttonName }));
  return screen.findByRole('textbox', { name: /text editor/ });
};

const openChipEditor = () => openEditor(editDistractorLabel$({ number: 1 }));

describe('EditableChipList chip editor', () => {
  stubProseMirrorLayout();

  it('edits a chip on a single line in inline-only mode', async () => {
    renderList({ inlineOnly: true });

    expect(await openChipEditor()).toHaveAttribute('aria-multiline', 'false');
  });

  it('writes a new chip on a single line in inline-only mode', async () => {
    renderList({ chips: [], inlineOnly: true });

    expect(await openEditor(addDistractorBtn$())).toHaveAttribute('aria-multiline', 'false');
  });

  it('edits a chip as full rich text by default', async () => {
    renderList();

    expect(await openChipEditor()).toHaveAttribute('aria-multiline', 'true');
  });
});
