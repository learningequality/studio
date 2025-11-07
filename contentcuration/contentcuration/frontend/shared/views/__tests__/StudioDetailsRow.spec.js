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
    expect(screen.getByText('Resources for coaches are only visible to coaches in Kolibri'))
      .toBeInTheDocument();
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

  it('applies notranslate class to value when prop is true', () => {
    const { container } = render(StudioDetailsRow, {
      router,
      props: {
        label: 'Channel name',
        text: 'User Generated Name',
        notranslate: true,
      },
      stubs: {
        HelpTooltip: mockHelpTooltip,
      },
    });

    const valueColumn = container.querySelector('.value-column');
    expect(valueColumn).toHaveClass('notranslate');
  });

  it('does not apply notranslate class to value when prop is false', () => {
    const { container } = render(StudioDetailsRow, {
      router,
      props: {
        label: 'Channel size',
        text: '1.5 GB',
        notranslate: false,
      },
      stubs: {
        HelpTooltip: mockHelpTooltip,
      },
    });

    const valueColumn = container.querySelector('.value-column');
    expect(valueColumn).not.toHaveClass('notranslate');
  });

  it('has correct CSS classes for layout', () => {
    const { container } = render(StudioDetailsRow, {
      router,
      props: {
        label: 'Test Label',
        text: 'Test Value',
      },
      stubs: {
        HelpTooltip: mockHelpTooltip,
      },
    });

    expect(container.querySelector('.studio-details-row')).toBeTruthy();
    expect(container.querySelector('.label-column')).toBeTruthy();
    expect(container.querySelector('.value-column')).toBeTruthy();
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
});
