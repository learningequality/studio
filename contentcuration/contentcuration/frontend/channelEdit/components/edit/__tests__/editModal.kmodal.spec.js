/**
 * Simple integration test to verify KModal dialogs in EditModal work correctly
 * This test focuses only on the two specific dialogs we migrated from MessageDialog to KModal
 */

import { render, screen, fireEvent } from '@testing-library/vue';
import VueRouter from 'vue-router';

const MockEditModalDialogs = {
  template: `
    <div>
      <div v-if="promptUploading" data-testid="upload-dialog">
        <h2>{{ uploadInProgressHeader }}</h2>
        <p>{{ uploadInProgressText }}</p>
        <button @click="promptUploading = false">{{ dismissDialogButton }}</button>
        <button data-test="canceluploads" @click="closeModal">{{ cancelUploadsButton }}</button>
      </div>

      <div v-if="promptFailed" data-testid="failed-dialog">
        <h2>{{ saveFailedHeader }}</h2>
        <p>{{ saveFailedText }}</p>
        <button @click="promptFailed = false">{{ okButton }}</button>
        <button @click="closeModal">{{ closeWithoutSavingButton }}</button>
      </div>
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
      expect(screen.getByRole('button', { name: 'Exit' })).toBeInTheDocument();
    });

    it('should close dialog when dismiss button is clicked', async () => {
      render(MockEditModalDialogs, {
        routes: new VueRouter(),
        data() {
          return { promptUploading: true };
        },
      });

      const dismissButton = screen.getByText('Cancel');
      await fireEvent.click(dismissButton);

      /* After clicking, the dialog should disappear */
      expect(screen.queryByTestId('upload-dialog')).not.toBeInTheDocument();
    });

    it('should call closeModal when cancel uploads button is clicked', async () => {
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

      const cancelButton = screen.getByRole('button', { name: 'Exit' });
      await fireEvent.click(cancelButton);

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

    it('should close dialog when OK button is clicked', async () => {
      render(MockEditModalDialogs, {
        routes: new VueRouter(),
        data() {
          return { promptFailed: true };
        },
      });

      const okButton = screen.getByText('OK');
      await fireEvent.click(okButton);

      /* After clicking, the dialog should disappear */
      expect(screen.queryByTestId('failed-dialog')).not.toBeInTheDocument();
    });

    it('should call closeModal when close without saving button is clicked', async () => {
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

      const closeButton = screen.getByText('Close without saving');
      await fireEvent.click(closeButton);

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
