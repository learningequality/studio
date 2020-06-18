<template>

  <FullscreenModal
    v-model="dialog"
    :header="isNew? $tr('creatingHeader') : header"
  >
    <template #action>
      <VBtn flat @click="saveChannel">
        {{ isNew? $tr('createButton') : $tr('saveChangesButton' ) }}
      </VBtn>
    </template>
    <template v-if="!isNew" #tabs>
      <VTab href="#edit" class="px-3" @click="currentTab = 'edit'">
        {{ $tr('editTab') }}
      </VTab>
      <VTab href="#share" class="px-3" @click="currentTab = 'share'">
        {{ $tr('shareTab') }}
      </VTab>
    </template>
    <VProgressLinear
      v-if="loading"
      indeterminate
      color="primary"
      style="margin: 0;"
      height="5"
    />
    <VCardText v-else>
      <VTabsItems v-model="currentTab">
        <VTabItem value="edit">
          <VForm ref="detailsform" class="pa-4 mb-5" style="max-width: 800px;">
            <ChannelThumbnail v-model="thumbnail" />
            <fieldset class="py-1 mt-3 channel-info">
              <legend class="py-1 mb-2 legend-title font-weight-bold">
                {{ $tr('details') }}
              </legend>
              <VTextField
                v-model="name"
                outline
                :label="$tr('channelName')"
                :rules="[() => name.length ? true : $tr('channelError')]"
                required
              />
              <LanguageDropdown
                v-model="language"
                class="notranslate"
                outline
                required
              />
              <VTextarea
                v-model="description"
                outline
                :label="$tr('channelDescription')"
                maxlength="400"
                rows="4"
                auto-grow
                counter
              />
            </fieldset>

            <ContentDefaults
              v-model="contentDefaults"
            />
          </VForm>
        </VTabItem>
        <VTabItem value="share">
          <VCard flat class="pa-5">
            <ChannelSharing :channelId="channelId" />
          </VCard>
        </VTabItem>
      </VTabsItems>
    </VCardText>

    <MessageDialog
      v-model="showUnsavedDialog"
      :header="$tr('unsavedChangesHeader')"
      :text="$tr('unsavedChangesText')"
    >
      <template #buttons="{close}">
        <VBtn flat @click="confirmCancel">
          {{ $tr('closeButton') }}
        </VBtn>
        <VBtn color="primary" @click="close">
          {{ $tr('keepEditingButton') }}
        </VBtn>
      </template>
    </MessageDialog>
  </FullscreenModal>

</template>


<script>

  import Vue from 'vue';
  import { mapActions, mapGetters, mapState } from 'vuex';
  import ChannelThumbnail from './ChannelThumbnail';
  import ChannelSharing from './ChannelSharing';
  import { NEW_OBJECT } from 'shared/constants';
  import MessageDialog from 'shared/views/MessageDialog';
  import LanguageDropdown from 'shared/views/LanguageDropdown';
  import ContentDefaults from 'shared/views/form/ContentDefaults';
  import FullscreenModal from 'shared/views/FullscreenModal';

  export default {
    name: 'ChannelModal',
    components: {
      LanguageDropdown,
      ContentDefaults,
      ChannelThumbnail,
      ChannelSharing,
      MessageDialog,
      FullscreenModal,
    },
    props: {
      channelId: {
        type: String,
      },
    },
    data() {
      return {
        loading: false,
        header: '',
        changed: false,
        showUnsavedDialog: false,
        diffTracker: {},
      };
    },
    computed: {
      ...mapState(['currentLanguage']),
      ...mapGetters('channel', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      isNew() {
        return Boolean(this.channel[NEW_OBJECT]);
      },
      routeParamID() {
        return this.$route.params.channelId;
      },
      dialog: {
        get() {
          return this.channelId && this.routeParamID === this.channelId;
        },
        set(value) {
          if (!value) {
            this.cancelChanges();
          }
        },
      },
      currentTab: {
        get() {
          const sharing = this.$route.query.sharing;
          // On load, sharing counts as string, so just process as if a string
          return sharing && sharing.toString() === 'true' ? 'share' : 'edit';
        },
        set(value) {
          this.$router.replace({
            ...this.$route,
            query: {
              ...this.$route.query,
              sharing: value === 'share',
            },
          });
        },
      },
      thumbnail: {
        get() {
          return {
            thumbnail: this.diffTracker.thumbnail || this.channel.thumbnail,
            thumbnail_url: this.diffTracker.thumbnail_url || this.channel.thumbnail_url,
            thumbnail_encoding:
              this.diffTracker.thumbnail_encoding || this.channel.thumbnail_encoding,
          };
        },
        set(thumbnailData) {
          this.setChannel({ thumbnailData });
        },
      },
      name: {
        get() {
          return this.diffTracker.name || this.channel.name || '';
        },
        set(name) {
          this.setChannel({ name });
        },
      },
      description: {
        get() {
          return this.diffTracker.description || this.channel.description || '';
        },
        set(description) {
          this.setChannel({ description });
        },
      },
      language: {
        get() {
          return this.diffTracker.language || this.channel.language || this.currentLanguage;
        },
        set(language) {
          this.setChannel({ language });
        },
      },
      contentDefaults: {
        get() {
          return {
            ...(this.diffTracker.content_defaults || {}),
            ...(this.channel.content_defaults || {}),
          };
        },
        set(contentDefaults) {
          this.setChannel({ contentDefaults });
        },
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        const channelId = to.params.channelId;
        vm.verifyChannel(channelId)
          .then(() => {
            vm.header = vm.channel.name; // Get channel name when user enters modal
          })
          .catch(() => {
            // Couldn't verify the channel details, so go back!
            // We should probably replace this with a 404 page, as
            // when navigating in from an external link (as this behaviour
            // would often be from - it produces a confusing back step)
            vm.$router.back();
          });
      });
    },
    mounted() {
      // Set expiry to 1ms
      this.header = this.channel.name; // Get channel name when user enters modal
    },
    methods: {
      ...mapActions('channel', ['updateChannel', 'loadChannel', 'deleteChannel', 'commitChannel']),
      saveChannel() {
        if (this.$refs.detailsform.validate()) {
          this.changed = false;
          if (this.isNew) {
            return this.commitChannel(this.channelId).then(() => {
              // TODO: Make sure channel gets created before navigating to channel
              window.location = window.Urls.channel(this.channelId);
            });
          } else {
            return this.updateChannel({ id: this.channelId, ...this.diffTracker }).then(this.close);
          }
        } else {
          // Go back to Details tab to show validation errors
          this.currentTab = false;
        }
      },
      setChannel(data) {
        for (let key in data) {
          Vue.set(this.diffTracker, key, data[key]);
        }
        this.changed = true;
      },
      cancelChanges() {
        if (this.changed) {
          this.showUnsavedDialog = true;
        } else {
          this.confirmCancel();
        }
      },
      confirmCancel() {
        this.changed = false;
        this.showUnsavedDialog = false;
        if (this.isNew) {
          return this.deleteChannel(this.channelId).then(this.close);
        }
        this.close();
      },
      verifyChannel(channelId) {
        return new Promise((resolve, reject) => {
          // Check if we already have the channel locally
          if (this.getChannel(channelId)) {
            resolve();
            return;
          }
          this.loading = true;
          // If not, try to load the channel
          this.loadChannel(channelId).then(channel => {
            // Did our fetch return any channels, then we have a channel!
            if (channel && channel.edit && !channel.ricecooker_version) {
              this.loading = false;
              resolve();
              return;
            }
            // If not, reject!
            reject();
          });
        });
      },
      close() {
        delete this.$route.query['sharing'];
        this.$router.push({
          name: this.$route.matched[0].name,
          query: this.$route.query,
          params: {
            ...this.$route.params,
            channelId: null,
          },
        });
      },
    },
    $trs: {
      creatingHeader: 'Creating channel',
      details: 'Channel details',
      channelName: 'Channel name',
      channelError: 'Channel name cannot be blank',
      channelDescription: 'Channel description',
      editTab: 'Details',
      shareTab: 'Sharing',
      saveChangesButton: 'Save and close',
      createButton: 'Create',
      unsavedChangesHeader: 'Unsaved changes',
      unsavedChangesText: 'Closing now will undo any new changes. Are you sure you want to close?',
      keepEditingButton: 'Keep editing',
      closeButton: 'Close without saving',
    },
  };

</script>


<style lang="less" scoped>

  .channel-info {
    border: 0;
  }

  .legend-title {
    font-size: 18px;
    line-height: 1;
    letter-spacing: 0.02em;
  }

  .v-select {
    max-width: 400px;
  }

</style>
