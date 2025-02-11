<template>

  <FullscreenModal
    :value="dialog"
    :header="isNew ? $tr('creatingHeader') : header"
    @input="onDialogInput"
  >
    <ToolBar v-if="!isNew" class="tabs" color="white">
      <Tabs v-model="currentTab" slider-color="primary" height="64px">
        <!-- Details tab -->
        <VTab href="#edit" class="px-3" data-test="details-tab" @click="currentTab = 'edit'">
          {{ $tr('editTab') }}
        </VTab>
        <!-- Share tab -->
        <VTab href="#share" class="px-3" data-test="share-tab" @click="currentTab = 'share'">
          {{ $tr('shareTab') }}
        </VTab>
      </Tabs>
    </ToolBar>
    <VProgressLinear
      v-if="loading"
      indeterminate
      color="loading"
      style="margin: 0;"
      height="5"
    />
    <VCardText>
      <VTabsItems v-model="currentTab">
        <VTabItem value="edit" data-test="edit-content">
          <Banner fluid :value="isRicecooker" color="secondary lighten-1">
            {{ $tr('APIText') }}
          </Banner>
          <VContainer class="mx-0" :class="{ ricecooker: isRicecooker }">
            <VForm
              ref="detailsform"
              class="mb-5"
              style="max-width: 960px;"
              @submit.prevent="saveChannel"
            >
              <ChannelThumbnail v-model="thumbnail" />
              <fieldset class="channel-info mt-3 py-1">
                <legend class="font-weight-bold legend-title mb-2 py-1">
                  {{ $tr('details') }}
                </legend>
                <VTextField
                  v-model="name"
                  box
                  maxlength="200"
                  counter
                  :label="$tr('channelName')"
                  :rules="nameRules"
                  required
                />
                <LanguageDropdown
                  v-model="language"
                  class="notranslate"
                  box
                  required
                />
                <VTextarea
                  v-model="description"
                  box
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

              <VBtn class="mt-5" color="primary" type="submit" :disabled="isDisable">
                {{ isNew ? $tr('createButton') : $tr('saveChangesButton' ) }}
              </VBtn>
            </VForm>
          </VContainer>
        </VTabItem>
        <VTabItem value="share" data-test="share-content">
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
      <template #buttons="{ close }">
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
  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import ChannelThumbnail from './ChannelThumbnail';
  import ChannelSharing from './ChannelSharing';
  import { NEW_OBJECT, ErrorTypes } from 'shared/constants';
  import MessageDialog from 'shared/views/MessageDialog';
  import LanguageDropdown from 'shared/views/LanguageDropdown';
  import ContentDefaults from 'shared/views/form/ContentDefaults';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import { routerMixin } from 'shared/mixins';
  import Banner from 'shared/views/Banner';
  import Tabs from 'shared/views/Tabs';
  import ToolBar from 'shared/views/ToolBar';

  export default {
    name: 'ChannelModal',
    components: {
      LanguageDropdown,
      ContentDefaults,
      ChannelThumbnail,
      ChannelSharing,
      MessageDialog,
      FullscreenModal,
      Banner,
      Tabs,
      ToolBar,
    },
    mixins: [routerMixin],
    props: {
      channelId: {
        type: String,
        default: '',
      },
      tab: {
        type: String,
        default: null,
      },
    },
    data() {
      return {
        loading: false,
        header: '',
        changed: false,
        showUnsavedDialog: false,
        diffTracker: {},
        dialog: true,
        isDisable: false,
      };
    },
    computed: {
      ...mapState(['currentLanguage']),
      ...mapGetters('channel', ['getChannel']),
      ...mapState({
        user: state => state.session.currentUser,
      }),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      isNew() {
        return Boolean(this.channel[NEW_OBJECT]);
      },
      isRicecooker() {
        return Boolean(this.channel.ricecooker_version);
      },
      currentTab: {
        get() {
          const tab = this.tab === 'share' ? 'share' : 'edit';
          return tab;
        },
        set(value) {
          // Only navigate if we're changing locations
          if (value !== this.tab) {
            this.$router
              .replace({
                ...this.$route,
                query: {
                  ...this.$route.query,
                },
                params: {
                  ...this.$route.params,
                  tab: value,
                },
              })
              .catch(() => {});
          }
        },
      },
      nameRules() {
        return [name => (name.length && name.trim().length ? true : this.$tr('channelError'))];
      },
      thumbnail: {
        get() {
          return {
            // If we have thumbnail values in diffTracker, we put them there for a reason
            // so we check if the property is defined on diffTracker and use it (even if it's falsy)
            thumbnail: Object.prototype.hasOwnProperty.call(this.diffTracker, 'thumbnail')
              ? this.diffTracker.thumbnail
              : this.channel.thumbnail,
            thumbnail_url: Object.prototype.hasOwnProperty.call(this.diffTracker, 'thumbnail_url')
              ? this.diffTracker.thumbnail_url
              : this.channel.thumbnail_url,
            thumbnail_encoding: Object.prototype.hasOwnProperty.call('thumbnail_encoding')
              ? this.diffTracker.thumbnail_encoding
              : this.channel.thumbnail_encoding,
          };
        },
        set(thumbnailData) {
          this.setChannel({ ...thumbnailData });
        },
      },
      name: {
        get() {
          return Object.prototype.hasOwnProperty.call(this.diffTracker, 'name')
            ? this.diffTracker.name
            : this.channel.name || '';
        },
        set(name) {
          this.setChannel({ name });
        },
      },
      description: {
        get() {
          return Object.prototype.hasOwnProperty.call(this.diffTracker, 'description')
            ? this.diffTracker.description
            : this.channel.description || '';
        },
        set(description) {
          this.setChannel({ description });
        },
      },
      language: {
        get() {
          return Object.prototype.hasOwnProperty.call(this.diffTracker, 'language')
            ? this.diffTracker.language
            : this.channel.language || this.currentLanguage;
        },
        set(language) {
          this.setChannel({ language });
        },
      },
      contentDefaults: {
        get() {
          return {
            ...(this.channel.content_defaults || {}),
            ...(this.diffTracker.contentDefaults || {}),
          };
        },
        set(contentDefaults) {
          this.setChannel({ contentDefaults });
        },
      },
    },
    watch: {
      '$route.params.tab'() {
        this.updateTitleForPage();
      },
    },
    // NOTE: Placing verification in beforeMount is tailored for this component's use in
    // channelList. In channelEdit, if a channel does not exist, this component
    // will never be rendered.
    beforeMount() {
      const channelId = this.$route.params.channelId;
      return this.verifyChannel(channelId)
        .then(() => {
          this.header = this.channel.name; // Get channel name when user enters modal
          this.updateTitleForPage();
          if (!this.isNew) {
            this.$refs.detailsform.validate();
          }
        })
        .catch(() => {});
    },
    mounted() {
      // Set expiry to 1ms
      this.header = this.channel.name; // Get channel name when user enters modal
      this.updateTitleForPage();
    },
    methods: {
      ...mapActions('channel', ['updateChannel', 'loadChannel', 'commitChannel']),
      ...mapMutations('channel', ['REMOVE_CHANNEL']),
      saveChannel() {
        this.isDisable = true;
        if (this.$refs.detailsform.validate()) {
          this.changed = false;
          if (this.isNew) {
            return this.commitChannel({ id: this.channelId, ...this.diffTracker }).then(() => {
              // TODO: Make sure channel gets created before navigating to channel
              window.location = window.Urls.channel(this.channelId);
              this.isDisable = false;
            });
          } else {
            return this.updateChannel({ id: this.channelId, ...this.diffTracker }).then(() => {
              this.$store.dispatch('showSnackbarSimple', this.$tr('changesSaved'));
              this.header = this.channel.name;
              this.isDisable = false;
            });
          }
        } else if (this.$refs.detailsform.$el.scrollIntoView) {
          this.$refs.detailsform.$el.scrollIntoView({ behavior: 'smooth' });
          this.isDisable = false;
        }
      },
      updateTitleForPage() {
        if (this.isNew) {
          this.updateTabTitle(this.$tr('creatingHeader'));
        } else if (this.$route.params.tab === 'edit') {
          this.updateTabTitle(`${this.$tr('editTab')} - ${this.channel.name}`);
        } else {
          this.updateTabTitle(`${this.$tr('shareTab')} - ${this.channel.name}`);
        }
      },
      onDialogInput(value) {
        if (!value) {
          this.cancelChanges();
          return;
        }
        this.dialog = value;
      },
      setChannel(data) {
        for (const key in data) {
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
          this.REMOVE_CHANNEL(this.channel);
        }
        this.closeModal();
      },
      verifyChannel(channelId) {
        return new Promise((resolve, reject) => {
          // Check if we already have the channel locally
          if (this.getChannel(channelId)) {
            // Don't allow view-only channels,
            // but allow admins to access
            if (this.getChannel(channelId).edit || this.user.is_admin) {
              resolve();
            } else {
              this.$store.dispatch('errors/handleGenericError', {
                errorType: ErrorTypes.UNAUTHORIZED,
                errorText: this.$tr('unauthorizedError'),
              });
              reject();
            }
            return;
          }
          this.loading = true;
          // If not, try to load the channel
          this.loadChannel(channelId).then(channel => {
            // Did our fetch return any channels, then we have a channel!
            if (channel && channel.edit) {
              this.loading = false;
              resolve();
              return;
            }
            // If not, reject!
            this.$store.dispatch('errors/handleGenericError', {
              errorType: ErrorTypes.CHANNEL_NOT_FOUND,
              errorText: this.$tr('notFoundError'),
            });
            reject();
          });
        });
      },
      closeModal() {
        this.$router.push({
          name: this.$route.query.last,
          params: this.$route.params,
          query: {
            // we can navigate to this component
            // from the catalog search page =>
            // do not lose search query
            ...this.$route.query,
            last: undefined,
          },
        });
      },
    },
    $trs: {
      unauthorizedError: 'You cannot edit this channel',
      notFoundError: 'Channel does not exist',
      creatingHeader: 'New channel',
      details: 'Channel details',
      channelName: 'Channel name',
      channelError: 'Field is required',
      channelDescription: 'Channel description',
      editTab: 'Details',
      shareTab: 'Sharing',
      APIText: 'Channels generated automatically are not editable.',
      saveChangesButton: 'Save changes',
      createButton: 'Create',
      changesSaved: 'Changes saved',
      unsavedChangesHeader: 'Unsaved changes',
      unsavedChangesText: 'You will lose any unsaved changes. Are you sure you want to exit?',
      keepEditingButton: 'Keep editing',
      closeButton: 'Exit without saving',
    },
  };

</script>


<style lang="scss" scoped>

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

  .ricecooker {
    pointer-events: none;
    opacity: 0.5;
  }

</style>
