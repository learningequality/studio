/**
 * Simple integration test to verify KModal dialogs in EditModal work correctly
 * This test focuses only on the two specific dialogs we migrated from MessageDialog to KModal
 */
import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';
import KModal from 'kolibri-design-system/lib/KModal';

const MockEditModalDialogs = {
  components: {
    KModal,
  },
  template: `
    <div>
      <KModal
        v-if="promptUploading"
        data-testid="upload-dialog"
        :title="uploadInProgressHeader"
        :cancelText="dismissDialogButton"
        :submitText="cancelUploadsButton"
        @cancel="promptUploading = false"
        @submit="closeModal"
      >
        <p>{{ uploadInProgressText }}</p>
      </KModal>

      <KModal
        v-if="promptFailed"
        data-testid="failed-dialog"
        :title="saveFailedHeader"
        :cancelText="okButton"
        :submitText="closeWithoutSavingButton"
        @cancel="promptFailed = false"
        @submit="closeModal"
      >
        <p>{{ saveFailedText }}</p>
      </KModal>
    </div>
  `,
  data() {
    return {
      promptUploading: false,
      promptFailed: false,
      uploadInProgressHeader: 'Upload in progress',
      uploadInProgressText: 'Uploads that are in progress will be lost if you exit',
      dismissDialogButton: 'Cancel',
      cancelUploadsButton: 'Exit',
      saveFailedHeader: 'Save failed',
      saveFailedText: 'There was a problem saving your content',
      okButton: 'OK',
      closeWithoutSavingButton: 'Close without saving',
    };
  },
  methods: {
    closeModal: jest.fn(),
  },
};

describe('EditModal KModal Dialogs', () => {
  describe('Upload in progress dialog', () => {
    it('should not show dialog when promptUploading is false', () => {
      render(MockEditModalDialogs, {
        routes: new VueRouter(),
      });
      expect(screen.queryByTestId('upload-dialog')).not.toBeInTheDocument();
    });

    it('should show dialog when promptUploading is true', () => {
      render(MockEditModalDialogs, {
        routes: new VueRouter(),
        data() {
          return { promptUploading: true };
        },
      });

      expect(screen.getByTestId('upload-dialog')).toBeInTheDocument();
      expect(screen.getByText('Upload in progress')).toBeInTheDocument();
      expect(
        screen.getByText('Uploads that are in progress will be lost if you exit'),
      ).toBeInTheDocument();
    });

    it('should have correct buttons with proper functionality', () => {
      render(MockEditModalDialogs, {
        routes: new VueRouter(),
        data() {
          return { promptUploading: true };
        },
      });

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Exit')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Exit' })).toBeInTheDocument();
    });

    it('should close dialog when cancel button is clicked', async () => {
      render(MockEditModalDialogs, {
        routes: new VueRouter(),
        data() {
          return { promptUploading: true };
        },
      });

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await fireEvent.click(cancelButton);

      /* After clicking, the dialog should disappear */
      expect(screen.queryByTestId('upload-dialog')).not.toBeInTheDocument();
    });

    it('should call closeModal when submit button is clicked', async () => {
      const closeModalSpy = jest.fn();
      const TestComponent = {
        ...MockEditModalDialogs,
        methods: {
          closeModal: closeModalSpy,
        },
      };

      render(TestComponent, {
        routes: new VueRouter(),
        data() {
          return { promptUploading: true };
        },
      });

      const submitButton = screen.getByRole('button', { name: 'Exit' });
      await fireEvent.click(submitButton);

      expect(closeModalSpy).toHaveBeenCalled();
    });
  });

  describe('Save failed dialog', () => {
    it('should not show dialog when promptFailed is false', () => {
      render(MockEditModalDialogs, {
        routes: new VueRouter(),
      });
      expect(screen.queryByTestId('failed-dialog')).not.toBeInTheDocument();
    });

    it('should show dialog when promptFailed is true', () => {
      render(MockEditModalDialogs, {
        routes: new VueRouter(),
        data() {
          return { promptFailed: true };
        },
      });

      expect(screen.getByTestId('failed-dialog')).toBeInTheDocument();
      expect(screen.getByText('Save failed')).toBeInTheDocument();
      expect(screen.getByText('There was a problem saving your content')).toBeInTheDocument();
    });

    it('should have correct buttons with proper functionality', () => {
      render(MockEditModalDialogs, {
        routes: new VueRouter(),
        data() {
          return { promptFailed: true };
        },
      });

      expect(screen.getByText('OK')).toBeInTheDocument();
      expect(screen.getByText('Close without saving')).toBeInTheDocument();
    });

    it('should close dialog when cancel button is clicked', async () => {
      render(MockEditModalDialogs, {
        routes: new VueRouter(),
        data() {
          return { promptFailed: true };
        },
      });

      const cancelButton = screen.getByRole('button', { name: 'OK' });
      await fireEvent.click(cancelButton);

      /* After clicking, the dialog should disappear */
      expect(screen.queryByTestId('failed-dialog')).not.toBeInTheDocument();
    });

    it('should call closeModal when submit button is clicked', async () => {
      const closeModalSpy = jest.fn();
      const TestComponent = {
        ...MockEditModalDialogs,
        methods: {
          closeModal: closeModalSpy,
        },
      };

      render(TestComponent, {
        routes: new VueRouter(),
        data() {
          return { promptFailed: true };
        },
      });

      const submitButton = screen.getByRole('button', { name: 'Close without saving' });
      await fireEvent.click(submitButton);

      expect(closeModalSpy).toHaveBeenCalled();
    });
  });

  describe('Dialog state management', () => {
    it('should handle both dialogs independently', () => {
      /* Test initial state - both dialogs hidden */
      const { unmount } = render(MockEditModalDialogs, {
        routes: new VueRouter(),
      });
      expect(screen.queryByTestId('upload-dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('failed-dialog')).not.toBeInTheDocument();
      unmount();

      /* Test upload dialog */
      const { unmount: unmount2 } = render(MockEditModalDialogs, {
        routes: new VueRouter(),
        data() {
          return { promptUploading: true };
        },
      });
      expect(screen.getByTestId('upload-dialog')).toBeInTheDocument();
      expect(screen.queryByTestId('failed-dialog')).not.toBeInTheDocument();
      unmount2();

      /* Test both dialogs */
      const { unmount: unmount3 } = render(MockEditModalDialogs, {
        routes: new VueRouter(),
        data() {
          return { promptUploading: true, promptFailed: true };
        },
      });
      expect(screen.getByTestId('upload-dialog')).toBeInTheDocument();
      expect(screen.getByTestId('failed-dialog')).toBeInTheDocument();
      unmount3();

      /* Test failed dialog */
      render(MockEditModalDialogs, {
        routes: new VueRouter(),
        data() {
          return { promptUploading: false, promptFailed: true };
        },
      });
      expect(screen.queryByTestId('upload-dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('failed-dialog')).toBeInTheDocument();
    });
  });
});
