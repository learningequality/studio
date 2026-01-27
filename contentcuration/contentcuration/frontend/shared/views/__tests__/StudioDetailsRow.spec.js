import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import StudioDetailsRow from '../details/StudioDetailsRow.vue';

const renderComponent = (props = {}, slots = {}) => {
  return render(StudioDetailsRow, {
    props,
    slots,
    routes: new VueRouter(),
  });
};

describe('StudioDetailsRow', () => {
  it('renders label and text value', () => {
    renderComponent({
      label: 'Channel size',
      text: '1.5 GB',
    });

    expect(screen.getByText('Channel size')).toBeInTheDocument();
    expect(screen.getByText('1.5 GB')).toBeInTheDocument();
  });

  it('renders slot content', () => {
    renderComponent({ label: 'Authors' }, { default: '<div>Author One, Author Two</div>' });

    expect(screen.getByText('Authors')).toBeInTheDocument();
    expect(screen.getByText('Author One, Author Two')).toBeInTheDocument();
  });

  it('displays tooltip when definition is provided', () => {
    renderComponent({
      label: 'Resources for coaches',
      text: '5',
      definition: 'Resources only visible to coaches',
    });

    expect(screen.getByLabelText('Resources only visible to coaches')).toBeInTheDocument();
  });
});
