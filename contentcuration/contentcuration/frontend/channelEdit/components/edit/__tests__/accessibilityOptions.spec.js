import { render, screen, configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import AccessibilityOptions from '../AccessibilityOptions.vue';
import { AccessibilityCategories } from 'shared/constants';
import { metadataStrings } from 'shared/strings/metadataStrings';

configure({ testIdAttribute: 'data-test' });

describe('AccessibilityOptions', () => {
  const renderComponent = props => {
    return render(AccessibilityOptions, {
      props: {
        kind: 'document',
        value: [],
        ...props,
      },
    });
  };

  it('shows document-specific accessibility options to the user', () => {
    renderComponent({ kind: 'document' });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('altText') })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('highContrast') })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('taggedPdf') })).toBeInTheDocument();
  });

  it('shows video-specific accessibility options to the user', () => {
    renderComponent({ kind: 'video' });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('signLanguage') })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('audioDescription') })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('captionsSubtitles') })).toBeInTheDocument();

    expect(screen.queryByTestId('tooltip-captionsSubtitles')).not.toBeInTheDocument();
  });

  it('shows exercise-specific accessibility options to the user', () => {
    renderComponent({ kind: 'exercise' });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('altText') })).toBeInTheDocument();
  });

  it('shows HTML5-specific accessibility options to the user', () => {
    renderComponent({ kind: 'html5' });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('altText') })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('highContrast') })).toBeInTheDocument();
  });

  it('shows audio-specific accessibility options to the user', () => {
    renderComponent({ kind: 'audio' });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('captionsSubtitles') })).toBeInTheDocument();
    expect(screen.queryByTestId('tooltip-captionsSubtitles')).not.toBeInTheDocument();
  });

  it('renders informative tooltips next to the corresponding options', () => {
    renderComponent({ kind: 'document' });

    expect(screen.getByTestId('tooltip-altText')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-highContrast')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-taggedPdf')).toBeInTheDocument();
  });

  describe('User Interactions', () => {
    it('emits an input event with the updated array when a user checks an option', async () => {
      const { emitted } = renderComponent({ kind: 'document', value: [] });

      const altTextCheckbox = screen.getByRole('checkbox', { name: metadataStrings.$tr('altText') });
      await userEvent.click(altTextCheckbox);

      expect(emitted()).toHaveProperty('input');
      expect(emitted().input[0][0]).toEqual([AccessibilityCategories.ALT_TEXT]);
    });

    it('emits an updated array with the item removed when a user unchecks a pre-checked option', async () => {
      const { emitted } = renderComponent({
        kind: 'video',
        value: [AccessibilityCategories.SIGN_LANGUAGE],
      });

      const signLanguageCheckbox = screen.getByRole('checkbox', { name: metadataStrings.$tr('signLanguage') });
      await userEvent.click(signLanguageCheckbox);

      expect(emitted()).toHaveProperty('input');
      expect(emitted().input[0][0]).toEqual([]);
    });

    it('renders correctly when accessibility options are pre-checked via v-model', () => {
      renderComponent({
        kind: 'video',
        value: [AccessibilityCategories.SIGN_LANGUAGE, AccessibilityCategories.CAPTIONS_SUBTITLES],
      });

      expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('signLanguage') })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('captionsSubtitles') })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: metadataStrings.$tr('audioDescription') })).not.toBeChecked();
    });
  });
});
