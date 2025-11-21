import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioDetailsRow from '../details/StudioDetailsRow.vue';

const router = new VueRouter({
  routes: [],
});

const mockHelpTooltip = {
  name: 'HelpTooltip',
  props: ['text', 'tooltipId'],
  template: '<span data-testid="help-tooltip">{{ text }}</span>',
};

describe('StudioDetailsRow', () => {
  it('renders label and text value', () => {
    render(StudioDetailsRow, {
      router,
      props: {
        label: 'Channel size',
        text: '1.5 GB',
      },
      stubs: {
        HelpTooltip: mockHelpTooltip,
      },
    });

    expect(screen.getByText('Channel size')).toBeInTheDocument();
    expect(screen.getByText('1.5 GB')).toBeInTheDocument();
  });

  it('renders slot content instead of text prop', () => {
    render(StudioDetailsRow, {
      router,
      props: {
        label: 'Description',
      },
      slots: {
        default: '<div>Custom Content</div>',
      },
      stubs: {
        HelpTooltip: mockHelpTooltip,
      },
    });

    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });

  it('displays HelpTooltip when definition is provided', () => {
    render(StudioDetailsRow, {
      router,
      props: {
        label: 'Resources for coaches',
        text: '5',
        definition: 'Resources for coaches are only visible to coaches in Kolibri',
      },
      stubs: {
        HelpTooltip: mockHelpTooltip,
      },
    });

    expect(screen.getByTestId('help-tooltip')).toBeInTheDocument();
    expect(
      screen.getByText('Resources for coaches are only visible to coaches in Kolibri'),
    ).toBeInTheDocument();
  });

  it('does not display HelpTooltip when definition is not provided', () => {
    render(StudioDetailsRow, {
      router,
      props: {
        label: 'Created on',
        text: 'October 11, 2025',
      },
      stubs: {
        HelpTooltip: mockHelpTooltip,
      },
    });

    expect(screen.queryByTestId('help-tooltip')).not.toBeInTheDocument();
  });

  it('renders empty text prop correctly', () => {
    const { container } = render(StudioDetailsRow, {
      router,
      props: {
        label: 'Empty Field',
        text: '',
      },
      stubs: {
        HelpTooltip: mockHelpTooltip,
      },
    });

    expect(screen.getByText('Empty Field')).toBeInTheDocument();
    const valueColumn = container.querySelector('.value-column');
    expect(valueColumn).toHaveTextContent('');
  });

  describe('edge cases with various empty/falsy values', () => {
    it('renders null value correctly', () => {
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Null Field',
          text: null,
        },
        stubs: {
          HelpTooltip: mockHelpTooltip,
        },
      });

      expect(screen.getByText('Null Field')).toBeInTheDocument();
    });

    it('renders undefined value correctly', () => {
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Undefined Field',
          text: undefined,
        },
        stubs: {
          HelpTooltip: mockHelpTooltip,
        },
      });

      expect(screen.getByText('Undefined Field')).toBeInTheDocument();
    });

    it('renders zero value correctly', () => {
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Zero Count',
          text: '0',
        },
        stubs: {
          HelpTooltip: mockHelpTooltip,
        },
      });

      expect(screen.getByText('Zero Count')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders false boolean value correctly', () => {
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Boolean Field',
          text: 'false',
        },
        stubs: {
          HelpTooltip: mockHelpTooltip,
        },
      });

      expect(screen.getByText('Boolean Field')).toBeInTheDocument();
      expect(screen.getByText('false')).toBeInTheDocument();
    });

    it('renders whitespace-only text correctly', () => {
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Whitespace Field',
          text: '   ',
        },
        stubs: {
          HelpTooltip: mockHelpTooltip,
        },
      });

      expect(screen.getByText('Whitespace Field')).toBeInTheDocument();
    });

    it('renders very long text value correctly', () => {
      const longText = 'A'.repeat(500);
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Long Text Field',
          text: longText,
        },
        stubs: {
          HelpTooltip: mockHelpTooltip,
        },
      });

      expect(screen.getByText('Long Text Field')).toBeInTheDocument();
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });

  describe('tooltip behavior', () => {
    it('displays tooltip with correct content when definition is provided', () => {
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Test Label',
          text: 'Test Value',
          definition: 'This is a detailed explanation of the field',
        },
        stubs: {
          HelpTooltip: mockHelpTooltip,
        },
      });

      expect(screen.getByTestId('help-tooltip')).toBeInTheDocument();
      expect(screen.getByText('This is a detailed explanation of the field')).toBeInTheDocument();
    });

    it('does not display tooltip when definition is empty string', () => {
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Test Label',
          text: 'Test Value',
          definition: '',
        },
        stubs: {
          HelpTooltip: mockHelpTooltip,
        },
      });

      expect(screen.queryByTestId('help-tooltip')).not.toBeInTheDocument();
    });

    it('does not display tooltip when definition is null', () => {
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Test Label',
          text: 'Test Value',
          definition: null,
        },
        stubs: {
          HelpTooltip: mockHelpTooltip,
        },
      });

      expect(screen.queryByTestId('help-tooltip')).not.toBeInTheDocument();
    });
  });

  describe('slot content rendering', () => {
    it('prioritizes slot content over text prop when both provided', () => {
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Mixed Content',
          text: 'Should not see this',
        },
        slots: {
          default: '<div>Slot content shown instead</div>',
        },
        stubs: {
          HelpTooltip: mockHelpTooltip,
        },
      });

      expect(screen.getByText('Mixed Content')).toBeInTheDocument();
      expect(screen.getByText('Slot content shown instead')).toBeInTheDocument();
      expect(screen.queryByText('Should not see this')).not.toBeInTheDocument();
    });

    it('renders multiple elements in slot correctly', () => {
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Complex Slot',
        },
        slots: {
          default: '<div>First element</div><div>Second element</div><div>Third element</div>',
        },
        stubs: {
          HelpTooltip: mockHelpTooltip,
        },
      });

      expect(screen.getByText('Complex Slot')).toBeInTheDocument();
      expect(screen.getByText('First element')).toBeInTheDocument();
      expect(screen.getByText('Second element')).toBeInTheDocument();
      expect(screen.getByText('Third element')).toBeInTheDocument();
    });
  });
});
