import { render, screen, within, configure } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import VueRouter from 'vue-router';
import AccessibilityOptions from '../AccessibilityOptions.vue';
import { AccessibilityCategories } from 'shared/constants';
import { metadataStrings } from 'shared/strings/metadataStrings';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

configure({ testIdAttribute: 'data-test' });

describe('AccessibilityOptions', () => {
  const renderComponent = props => {
    return render(AccessibilityOptions, {
      props: {
        kind: ContentKindsNames.DOCUMENT,
        value: [],
        ...props,
      },
      routes: new VueRouter(),
    });
  };

  it('shows document-specific accessibility options to the user', () => {
    renderComponent({ kind: ContentKindsNames.DOCUMENT });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    expect(screen.getByText(metadataStrings.$tr('altText'))).toBeInTheDocument();
    expect(screen.getByText(metadataStrings.$tr('highContrast'))).toBeInTheDocument();
    expect(screen.getByText(metadataStrings.$tr('taggedPdf'))).toBeInTheDocument();
  });

  it('shows video-specific accessibility options to the user', () => {
    renderComponent({ kind: ContentKindsNames.VIDEO });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    expect(screen.getByText(metadataStrings.$tr('signLanguage'))).toBeInTheDocument();
    expect(screen.getByText(metadataStrings.$tr('audioDescription'))).toBeInTheDocument();
    expect(screen.getByText(metadataStrings.$tr('captionsSubtitles'))).toBeInTheDocument();

    expect(screen.queryByTestId('tooltip-captionsSubtitles')).not.toBeInTheDocument();
  });

  it('shows exercise-specific accessibility options to the user', () => {
    renderComponent({ kind: ContentKindsNames.EXERCISE });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(1);

    expect(screen.getByText(metadataStrings.$tr('altText'))).toBeInTheDocument();
  });

  it('shows HTML5-specific accessibility options to the user', () => {
    renderComponent({ kind: ContentKindsNames.HTML5 });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);

    expect(screen.getByText(metadataStrings.$tr('altText'))).toBeInTheDocument();
    expect(screen.getByText(metadataStrings.$tr('highContrast'))).toBeInTheDocument();
  });

  it('shows audio-specific accessibility options to the user', () => {
    renderComponent({ kind: ContentKindsNames.AUDIO });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(1);

    expect(screen.getByText(metadataStrings.$tr('captionsSubtitles'))).toBeInTheDocument();
    expect(screen.queryByTestId('tooltip-captionsSubtitles')).not.toBeInTheDocument();
  });

  it('renders informative tooltips next to the corresponding options', () => {
    renderComponent({ kind: ContentKindsNames.DOCUMENT });

    expect(screen.getByTestId('tooltip-altText')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-highContrast')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-taggedPdf')).toBeInTheDocument();
  });

  describe('User Interactions', () => {
    it('emits an input event with the updated array when a user checks an option', async () => {
      const { emitted } = renderComponent({ kind: ContentKindsNames.DOCUMENT, value: [] });

      const altTextCheckbox = within(screen.getByTestId('checkbox-altText')).getByRole('checkbox');
      await userEvent.click(altTextCheckbox);

      expect(emitted()).toHaveProperty('input');
      expect(emitted().input[0][0]).toEqual([AccessibilityCategories.ALT_TEXT]);
    });

    it('emits an updated array with the item removed when a user unchecks a pre-checked option', async () => {
      const { emitted } = renderComponent({
        kind: ContentKindsNames.VIDEO,
        value: [AccessibilityCategories.SIGN_LANGUAGE],
      });

      const signLanguageCheckbox = within(screen.getByTestId('checkbox-signLanguage')).getByRole(
        'checkbox',
      );
      await userEvent.click(signLanguageCheckbox);

      expect(emitted()).toHaveProperty('input');
      expect(emitted().input[0][0]).toEqual([]);
    });

    it('renders correctly when accessibility options are pre-checked via v-model', () => {
      renderComponent({
        kind: ContentKindsNames.VIDEO,
        value: [AccessibilityCategories.SIGN_LANGUAGE, AccessibilityCategories.CAPTIONS_SUBTITLES],
      });

      expect(
        within(screen.getByTestId('checkbox-signLanguage')).getByRole('checkbox'),
      ).toBeChecked();
      expect(
        within(screen.getByTestId('checkbox-captionsSubtitles')).getByRole('checkbox'),
      ).toBeChecked();
      expect(
        within(screen.getByTestId('checkbox-audioDescription')).getByRole('checkbox'),
      ).not.toBeChecked();
    });
  });
});
