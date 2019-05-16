import { mapActions, mapMutations, mapState } from 'vuex';
import { createTranslator } from 'utils/i18n';
import { dialog, alert } from 'edit_channel/utils/dialog';

const channelStrings = createTranslator('ChannelStrings', {
  unsavedChanges: 'Unsaved Changes!',
  unsavedChangesText: 'Exiting now will undo any new changes. Are you sure you want to exit?',
  dontSave: 'Discard Changes',
  keepOpen: 'Keep Editing',
  save: 'Save',
  errorChannelSave: 'Error Saving Channel',
});

export const setChannelMixin = {
  computed: {
    ...mapState('channel_list', ['activeChannel', 'changed']),
    channelStrings() {
      return channelStrings;
    },
  },
  methods: {
    ...mapActions('channel_list', ['saveChannel']),
    ...mapMutations('channel_list', {
      setActiveChannel: 'SET_ACTIVE_CHANNEL',
      cancelChanges: 'CANCEL_CHANNEL_CHANGES',
    }),
    setChannel(channelID) {
      // Check for changes here when user switches or closes panel
      if (this.changed && channelID !== this.activeChannel.id) {
        dialog(
          this.channelStrings('unsavedChanges'),
          this.channelStrings('unsavedChangesText'),
          {
            [this.channelStrings('dontSave')]: () => {
              this.cancelChanges();
              this.setActiveChannel(channelID);
            },
            [this.channelStrings('keepOpen')]: () => {},
            [this.channelStrings('save')]: () => {
              this.saveChannel()
                .then(() => {
                  this.setActiveChannel(channelID);
                })
                .catch(error => {
                  alert(this.channelStrings('errorChannelSave'), error.responseText || error);
                });
            },
          },
          null
        );
      } else {
        this.setActiveChannel(channelID);
      }
    },
  },
};

export const tabMixin = {
  mounted() {
    this.$nextTick(() => {
      this.$refs.firstTab.focus();
    });
  },
};
