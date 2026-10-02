import { createTranslator } from 'shared/i18n';

export const studioMyChannelsStrings = createTranslator('StudioMyChannels', {
  newChannel: { message: 'New channel', context: 'Button to create a channel' },
  createOrganization: {
    message: 'Create',
    context: 'Button to create an organization beside the channel filter',
  },
  title: { message: 'My channels', context: 'Heading for the editable channel list' },
  moreOptions: { message: 'More options', context: 'Accessible label for channel actions' },
  editChannel: { message: 'Edit channel details', context: 'Menu action to edit channel details' },
  deleteChannel: { message: 'Delete channel', context: 'Menu action to delete a channel' },
  copyToken: { message: 'Copy channel token', context: 'Menu action to copy a channel token' },
  goToWebsite: {
    message: 'Go to source website',
    context: 'Menu action to open the channel source website',
  },
  viewContent: {
    message: 'View channel on Kolibri',
    context: 'Menu action to view a channel on Kolibri',
  },
});
