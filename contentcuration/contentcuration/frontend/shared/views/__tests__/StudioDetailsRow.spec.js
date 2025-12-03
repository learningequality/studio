import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioDetailsRow from '../details/StudioDetailsRow.vue';

const router = new VueRouter({ routes: [] });

const HelpTooltipStub = {
  name: 'HelpTooltip',
  props: ['text', 'tooltipId'],
  template: '<span data-testid="help-tooltip">{{ text }}</span>',
};

describe('StudioDetailsRow', () => {
  describe('basic rendering', () => {
    it('renders label and text value', () => {
      render(StudioDetailsRow, {
        router,
        props: { label: 'Channel size', text: '1.5 GB' },
        stubs: { HelpTooltip: HelpTooltipStub },
      });

      expect(screen.getByText('Channel size')).toBeInTheDocument();
      expect(screen.getByText('1.5 GB')).toBeInTheDocument();
    });

    it('renders slot content instead of text prop', () => {
      render(StudioDetailsRow, {
        router,
        props: { label: 'Authors' },
        slots: { default: '<div>Author One, Author Two</div>' },
        stubs: { HelpTooltip: HelpTooltipStub },
      });

      expect(screen.getByText('Authors')).toBeInTheDocument();
      expect(screen.getByText('Author One, Author Two')).toBeInTheDocument();
    });

    it('prioritizes slot content over text prop', () => {
      render(StudioDetailsRow, {
        router,
        props: { label: 'Field', text: 'Text Value' },
        slots: { default: '<span>Slot Value</span>' },
        stubs: { HelpTooltip: HelpTooltipStub },
      });

      expect(screen.getByText('Slot Value')).toBeInTheDocument();
      expect(screen.queryByText('Text Value')).not.toBeInTheDocument();
    });
  });

  describe('tooltip behavior', () => {
    it('displays HelpTooltip when definition is provided', () => {
      render(StudioDetailsRow, {
        router,
        props: {
          label: 'Resources for coaches',
          text: '5',
          definition: 'Resources only visible to coaches',
        },
        stubs: { HelpTooltip: HelpTooltipStub },
      });

      expect(screen.getByTestId('help-tooltip')).toBeInTheDocument();
      expect(screen.getByText('Resources only visible to coaches')).toBeInTheDocument();
    });

    it('does not display HelpTooltip when definition is not provided', () => {
      render(StudioDetailsRow, {
        router,
        props: { label: 'Created on', text: 'October 11, 2025' },
        stubs: { HelpTooltip: HelpTooltipStub },
      });

      expect(screen.queryByTestId('help-tooltip')).not.toBeInTheDocument();
    });
  });
});
