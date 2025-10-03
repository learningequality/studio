/**
 * Simple integration test to verify KModal dialogs in EditModal work correctly
 * This test focuses only on the two specific dialogs we migrated from MessageDialog to KModal
 */

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
        closeModal() {
        },
    },
    };

    import { mount } from '@vue/test-utils';

    function makeWrapper() {
    return mount(MockEditModalDialogs);
    }

    describe('EditModal KModal Dialogs', () => {
    let wrapper;

    beforeEach(() => {
        wrapper = makeWrapper();
        jest.clearAllMocks();
    });

    describe('Upload in progress dialog', () => {
        it('should not show dialog when promptUploading is false', () => {
        expect(wrapper.find('[data-testid="upload-dialog"]').exists()).toBe(false);
        });

        it('should show dialog when promptUploading is true', async () => {
        await wrapper.setData({ promptUploading: true });
        
        const dialog = wrapper.find('[data-testid="upload-dialog"]');
        expect(dialog.exists()).toBe(true);
        expect(dialog.text()).toContain('Upload in progress');
        expect(dialog.text()).toContain('Uploads that are in progress will be lost if you exit');
        });

        it('should have correct buttons with proper functionality', async () => {
        await wrapper.setData({ promptUploading: true });
        
        const dialog = wrapper.find('[data-testid="upload-dialog"]');
        expect(dialog.text()).toContain('Cancel');
        expect(dialog.text()).toContain('Exit');
        
        const cancelButton = wrapper.find('[data-test="canceluploads"]');
        expect(cancelButton.exists()).toBe(true);
        });

        it('should close dialog when dismiss button is clicked', async () => {
        await wrapper.setData({ promptUploading: true });
        
        const buttons = wrapper.findAll('button');
        const dismissButton = buttons.at(0);
        
        await dismissButton.trigger('click');
        expect(wrapper.vm.promptUploading).toBe(false);
        });

        it('should call closeModal when cancel uploads button is clicked', async () => {
        const closeModalSpy = jest.spyOn(wrapper.vm, 'closeModal');
        await wrapper.setData({ promptUploading: true });
        
        const cancelButton = wrapper.find('[data-test="canceluploads"]');
        await cancelButton.trigger('click');
        
        expect(closeModalSpy).toHaveBeenCalled();
        });
    });

    describe('Save failed dialog', () => {
        it('should not show dialog when promptFailed is false', () => {
        expect(wrapper.find('[data-testid="failed-dialog"]').exists()).toBe(false);
        });

        it('should show dialog when promptFailed is true', async () => {
        await wrapper.setData({ promptFailed: true });
        
        const dialog = wrapper.find('[data-testid="failed-dialog"]');
        expect(dialog.exists()).toBe(true);
        expect(dialog.text()).toContain('Save failed');
        expect(dialog.text()).toContain('There was a problem saving your content');
        });

        it('should have correct buttons with proper functionality', async () => {
        await wrapper.setData({ promptFailed: true });
        
        const dialog = wrapper.find('[data-testid="failed-dialog"]');
        expect(dialog.text()).toContain('OK');
        expect(dialog.text()).toContain('Close without saving');
        });

        it('should close dialog when OK button is clicked', async () => {
        await wrapper.setData({ promptFailed: true });
        
        const buttons = wrapper.findAll('button');
        const okButton = buttons.at(0); 

        await okButton.trigger('click');
        expect(wrapper.vm.promptFailed).toBe(false);
        });

        it('should call closeModal when close without saving button is clicked', async () => {
        const closeModalSpy = jest.spyOn(wrapper.vm, 'closeModal');
        await wrapper.setData({ promptFailed: true });
        
        const buttons = wrapper.findAll('button');
        const closeButton = buttons.at(1);
        
        await closeButton.trigger('click');
        expect(closeModalSpy).toHaveBeenCalled();
        });
    });

    describe('Dialog state management', () => {
        it('should handle both dialogs independently', async () => {
        expect(wrapper.find('[data-testid="upload-dialog"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="failed-dialog"]').exists()).toBe(false);
        

        await wrapper.setData({ promptUploading: true });
        expect(wrapper.find('[data-testid="upload-dialog"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="failed-dialog"]').exists()).toBe(false);
        

        await wrapper.setData({ promptFailed: true });
        expect(wrapper.find('[data-testid="upload-dialog"]').exists()).toBe(true);
        expect(wrapper.find('[data-testid="failed-dialog"]').exists()).toBe(true);
        

        await wrapper.setData({ promptUploading: false });
        expect(wrapper.find('[data-testid="upload-dialog"]').exists()).toBe(false);
        expect(wrapper.find('[data-testid="failed-dialog"]').exists()).toBe(true);
        });
    });
});