import { render, screen, within } from '@testing-library/vue';
import VueRouter from 'vue-router';
import shuffle from 'lodash/shuffle';
import { themePalette } from 'kolibri-design-system/lib/styles/theme';
import ShuffledResponsePool from '../index.vue';
import { qtiEditorStrings } from '../../../qtiEditorStrings';

jest.mock('shared/views/TipTapEditor/TipTapEditor/TipTapEditor');
jest.mock('lodash/shuffle', () => jest.fn(list => [...list].reverse()));

const { responsePoolLabel$ } = qtiEditorStrings;

const CHOICES = [
  { content: 'Antonio', isCorrect: true },
  { content: 'Prospero', isCorrect: false },
  { content: 'Capulet', isCorrect: false },
];

const renderPool = (choices = CHOICES) =>
  render(ShuffledResponsePool, {
    props: { choices, label: responsePoolLabel$() },
    routes: new VueRouter(),
  });

const pool = () => screen.getByRole('list', { name: responsePoolLabel$() });
const chipTexts = () =>
  within(pool())
    .getAllByRole('listitem')
    .map(item => item.textContent.trim());
const chip = text => within(pool()).getByText(text).closest('li');

describe('ShuffledResponsePool', () => {
  beforeEach(() => {
    shuffle.mockImplementation(list => [...list].reverse());
  });

  it('labels the pool heading and the list, with one item per choice', () => {
    renderPool();
    expect(screen.getByRole('heading', { name: responsePoolLabel$() })).toBeInTheDocument();
    expect(within(pool()).getAllByRole('listitem')).toHaveLength(3);
  });

  it('renders two choices with the same content as two items', () => {
    renderPool([
      { content: 'Antonio', isCorrect: false },
      { content: 'Antonio', isCorrect: false },
    ]);
    expect(chipTexts()).toEqual(['Antonio', 'Antonio']);
  });

  it('paints only the correct choice green, wherever the shuffle puts it', () => {
    const palette = themePalette();
    renderPool();
    expect(chipTexts()).toEqual(['Capulet', 'Prospero', 'Antonio']);
    expect(chip('Antonio')).toHaveStyle({
      borderColor: palette.green.v_600,
      backgroundColor: palette.green.v_50,
    });
    expect(chip('Prospero')).not.toHaveStyle({ borderColor: palette.green.v_600 });
    expect(chip('Prospero')).not.toHaveStyle({ backgroundColor: palette.green.v_50 });
  });

  it('keeps its order when only correctness changes', async () => {
    const { updateProps } = renderPool();
    shuffle.mockImplementation(list => [...list]);
    await updateProps({ choices: CHOICES.map(choice => ({ ...choice, isCorrect: false })) });
    expect(chipTexts()).toEqual(['Capulet', 'Prospero', 'Antonio']);
  });

  it('reshuffles when the contents change', async () => {
    const { updateProps } = renderPool();
    await updateProps({ choices: [...CHOICES, { content: 'Montague', isCorrect: false }] });
    expect(chipTexts()).toEqual(['Montague', 'Capulet', 'Prospero', 'Antonio']);
  });
});
