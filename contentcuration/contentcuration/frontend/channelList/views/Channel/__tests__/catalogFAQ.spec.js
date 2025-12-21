import { render, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import CatalogFAQ from '../CatalogFAQ.vue';

const router = new VueRouter({
  routes: [{ name: 'CATALOG_FAQ', path: '/faq' }],
});

const renderComponent = (props = {}) => {
  return render(CatalogFAQ, {
    props,
    routes: router,
  });
};

describe('CatalogFAQ test cases', () => {
  it('renders the FAQ component', () => {
    renderComponent();
    const subTitle = document.querySelectorAll('.sub-title');
    const mainTitle = document.querySelectorAll('.main-title');
    expect(mainTitle.length).toBe(1);
    expect(subTitle.length).toBe(3);
  });

  it('renders all FAQ items using StudioAccordion', () => {
    renderComponent();
    const accordions = document.querySelectorAll('.studio-accordion');
    expect(accordions.length).toBe(15);
  });

  it('expands accordion to show content when user clicks button', async () => {
    renderComponent();
    const firstAccordion = document.getElementById('selection-question');
    expect(firstAccordion).toBeInTheDocument();

    await fireEvent.click(firstAccordion);

    const accordionContent = document.querySelector('.item-content');
    expect(accordionContent).toBeInTheDocument();

    const expandedTrue = document.querySelectorAll('[aria-expanded="true"]');
    const expandedFalse = document.querySelectorAll('[aria-expanded="false"]');
    expect(expandedTrue.length).toBe(1);
    expect(expandedFalse.length).toBe(14);
  });
});
