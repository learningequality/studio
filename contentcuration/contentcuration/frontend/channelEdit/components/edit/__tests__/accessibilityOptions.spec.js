import { render, screen, configure, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import AccessibilityOptions from '../AccessibilityOptions.vue';
import { AccessibilityCategories } from 'shared/constants';

describe('AccessibilityOptions', () => {
  beforeAll(() => {
    configure({ testIdAttribute: 'data-test' });
  });

  afterAll(() => {
    configure({ testIdAttribute: 'data-testid' });
  });

  const mockConstantsMixin = {};
  const mockMetadataMixin = {
    methods: {
      translateMetadataString: (str) => str,
    }
  };

  const renderComponent = props => {
    return render(AccessibilityOptions, {
      props: {
        kind: 'document',
        value: [], 
        ...props,
      },
      routes: [],
      mixins: [mockConstantsMixin, mockMetadataMixin],
      mocks: {
        $tr: (key) => key,
      }
    });
  };

  it('smoke test', () => {
    renderComponent();
    expect(screen.getByTestId('checkbox-altText')).toBeInTheDocument();
  });

  it('displays the correct accessibility options for a document', () => {
    renderComponent({ kind: 'document' });

    expect(screen.getByTestId('checkbox-altText')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-highContrast')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-taggedPdf')).toBeInTheDocument();

    expect(screen.queryByTestId('checkbox-signLanguage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-audioDescription')).not.toBeInTheDocument();
  });

  it('displays the correct accessibility options for a video without captions tooltip', () => {
    renderComponent({ kind: 'video' });

    expect(screen.getByTestId('checkbox-signLanguage')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-audioDescription')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-captionsSubtitles')).toBeInTheDocument();

    expect(screen.queryByTestId('checkbox-altText')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-highContrast')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-taggedPdf')).not.toBeInTheDocument();

    expect(screen.queryByTestId('tooltip-captionsSubtitles')).not.toBeInTheDocument();
  });

  it('displays the correct accessibility options for an exercise', () => {
    renderComponent({ kind: 'exercise' });

    expect(screen.getByTestId('checkbox-altText')).toBeInTheDocument();

    expect(screen.queryByTestId('checkbox-highContrast')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-taggedPdf')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-signLanguage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-audioDescription')).not.toBeInTheDocument();
  });

  it('displays the correct accessibility options for HTML5/ZIP apps', () => {
    renderComponent({ kind: 'html5' });

    expect(screen.getByTestId('checkbox-altText')).toBeInTheDocument();
    expect(screen.getByTestId('checkbox-highContrast')).toBeInTheDocument();

    expect(screen.queryByTestId('checkbox-taggedPdf')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-signLanguage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('checkbox-audioDescription')).not.toBeInTheDocument();
  });

  it('displays the correct accessibility options for an audio file without tooltip', () => {
    renderComponent({ kind: 'audio' });

    expect(screen.getByTestId('checkbox-captionsSubtitles')).toBeInTheDocument();
    expect(screen.queryByTestId('tooltip-captionsSubtitles')).not.toBeInTheDocument();
  });

  it('renders appropriate tooltips next to the corresponding checkboxes', () => {
    renderComponent({ kind: 'document' });

    expect(screen.getByTestId('tooltip-altText')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-highContrast')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-taggedPdf')).toBeInTheDocument();

    expect(screen.queryByTestId('tooltip-signLanguage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tooltip-audioDescription')).not.toBeInTheDocument();
  });

  describe('User Interactions and v-model', () => {
    it('emits an input event with the updated array when a user checks an option', async () => {
      const { emitted } = renderComponent({ kind: 'document', value: [] });

      const checkboxWrapper = screen.getByTestId('checkbox-altText');
      const actualCheckbox = within(checkboxWrapper).getByRole('checkbox');
      
      await userEvent.click(actualCheckbox);

      expect(emitted()).toHaveProperty('input');
      expect(emitted().input[0][0]).toEqual([AccessibilityCategories.ALT_TEXT]);
    });

    it('emits an updated array with the item removed when a user unchecks a pre-checked option', async () => {
      const { emitted } = renderComponent({
        kind: 'video',
        value: [AccessibilityCategories.SIGN_LANGUAGE], // Pre-checked state
      });
      
      const checkboxWrapper = screen.getByTestId('checkbox-signLanguage');
      const actualCheckbox = within(checkboxWrapper).getByRole('checkbox');
      
      await userEvent.click(actualCheckbox);
      expect(emitted()).toHaveProperty('input');
      expect(emitted().input[0][0]).toEqual([]); 
    });

    it('renders correctly when accessibility options are pre-checked via v-model', () => {
      renderComponent({ 
        kind: 'video', 
        value: [AccessibilityCategories.SIGN_LANGUAGE, AccessibilityCategories.CAPTIONS_SUBTITLES] 
      });

      const signLanguageCheckbox = within(screen.getByTestId('checkbox-signLanguage')).getByRole('checkbox');
      const captionsCheckbox = within(screen.getByTestId('checkbox-captionsSubtitles')).getByRole('checkbox');
      const audioDescCheckbox = within(screen.getByTestId('checkbox-audioDescription')).getByRole('checkbox');
      expect(signLanguageCheckbox).toBeChecked();
      expect(captionsCheckbox).toBeChecked();
      expect(audioDescCheckbox).not.toBeChecked();
    });
  });
});