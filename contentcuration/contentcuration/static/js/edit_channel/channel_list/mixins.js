import _ from 'underscore';
import { mapActions, mapMutations, mapState, mapGetters } from 'vuex';
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
    ...mapGetters('channel_list', ['activeChannelHasBeenModified']),
    channelStrings() {
      return channelStrings;
    },
  },
  methods: {
    ...mapActions('channel_list', ['saveChannel']),
    ...mapMutations('channel_list', {
      cancelChanges: 'CANCEL_CHANNEL_CHANGES',
    }),
    setActiveChannel(channelId) {
      if (channelId) {
        this.$router.push({ query: { channel_id: channelId } });
      } else {
        this.$router.push({ query: _.omit(this.$route.query, 'channel_id') });
      }
      this.$store.commit('channel_list/SET_ACTIVE_CHANNEL', channelId);
    },
    setChannel(channelID) {
      let checkForChanges = false;
      if (this.activeChannel) {
        checkForChanges = this.activeChannel.id !== channelID || !channelID;
      }
      // Check for changes here when user switches or closes panel
      if (this.activeChannelHasBeenModified && checkForChanges) {
        dialog(
          this.channelStrings('unsavedChanges'),
          this.channelStrings('unsavedChangesText'),
          {
            [this.channelStrings('dontSave')]: () => {
              // If going from "Create Channel" to new "Create Channel"
              if (this.activeChannel.id === undefined && channelID === '') {
                this.$store.commit('channel_list/CLEAR_CHANNEL_CHANGES');
              } else {
                this.setActiveChannel(channelID);
              }
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
