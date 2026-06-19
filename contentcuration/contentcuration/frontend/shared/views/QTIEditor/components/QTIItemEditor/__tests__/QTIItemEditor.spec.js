import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import QTIItemEditor from '../index.vue';
import { qtiEditorStrings } from '../../../qtiEditorStrings';
import { AssessmentItemTypes } from '../../../constants';

const { closeBtnLabel$, questionContentPlaceholder$ } = qtiEditorStrings;

const defaultProps = {
  item: {
    assessment_id: 'test-item-id',
    type: AssessmentItemTypes.QTI,
  },
  index: 0,
  total: 5,
  mode: 'view',
  showAnswers: false,
};

const renderComponent = (props = {}, slots = {}) => {
  return render(QTIItemEditor, {
    props: { ...defaultProps, ...props },
    slots,
    routes: new VueRouter(),
  });
};

describe('QTIItemEditor', () => {
  describe('view mode', () => {
    test('shows the card body (placeholder) even in view mode', () => {
      renderComponent({ mode: 'view' });
      expect(screen.getByText(questionContentPlaceholder$())).toBeInTheDocument();
    });

    test('does not show the close button', () => {
      renderComponent({ mode: 'view' });
      expect(screen.queryByRole('button', { name: closeBtnLabel$() })).not.toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    test('shows the card body', () => {
      renderComponent({ mode: 'edit' });
      expect(screen.getByText(questionContentPlaceholder$())).toBeInTheDocument();
    });

    test('shows the close button', () => {
      renderComponent({ mode: 'edit' });
      expect(screen.getByRole('button', { name: closeBtnLabel$() })).toBeInTheDocument();
    });

    test('emits a close event when the close button is clicked', async () => {
      const { emitted } = renderComponent({ mode: 'edit' });
      await fireEvent.click(screen.getByRole('button', { name: closeBtnLabel$() }));
      expect(emitted().close).toHaveLength(1);
    });
  });

  describe('showAnswers', () => {
    test('shows the card body in view mode when showAnswers is true', () => {
      renderComponent({ mode: 'view', showAnswers: true });
      expect(screen.getByText(questionContentPlaceholder$())).toBeInTheDocument();
    });

    test('does not show the close button even when showAnswers is true', () => {
      renderComponent({ mode: 'view', showAnswers: true });
      expect(screen.queryByRole('button', { name: closeBtnLabel$() })).not.toBeInTheDocument();
    });
  });

  describe('toolbarActions slot', () => {
    test('renders content injected into the toolbarActions slot', () => {
      renderComponent({}, { toolbarActions: '<button>Edit</button>' });
      expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });
  });
});
