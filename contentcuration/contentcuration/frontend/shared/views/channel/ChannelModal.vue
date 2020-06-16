<template>

  <VDialog
    ref="dialog"
    :value="channelId && routeParamID === channelId"
    attach="body"
    fullscreen
    scrollable
    transition="dialog-bottom-transition"
  >
    <VCard>
      <VToolbar card prominent dark color="primary" extension-height="48px">
        <VBtn icon data-test="close" @click="cancelChanges">
          <Icon>
            clear
          </Icon>
        </VBtn>
        <VToolbarTitle>
          <template v-if="channel.new">
            {{ $tr('creatingHeader') }}
          </template>
          <template v-else>
            {{ header }}
          </template>
        </VToolbarTitle>
        <VSpacer />
        <VBtn flat @click="saveChannel">
          {{ channel.new? $tr('createButton') : $tr('saveChangesButton' ) }}
        </VBtn>
        <template v-if="!channel.new" #extension>
          <VTabs
            v-model="currentTab"
            color="primary"
            slider-color="white"
            align-with-title
          >
            <VTab :href="`#edit`" class="px-3">
              {{ $tr('editTab') }}
            </VTab>
            <VTab :href="`#share`" class="px-3">
              {{ $tr('shareTab') }}
            </VTab>
          </VTabs>
        </template>
      </VToolbar>
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
            <VCard flat class="pa-5">
              <VLayout row>
                <VFlex style="max-width: 800px;">
                  <VForm ref="detailsform">
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
                </VFlex>
              </VLayout>
            </VCard>
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
    </VCard>
  </VDialog>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import ChannelThumbnail from './ChannelThumbnail';
  import ChannelSharing from './ChannelSharing';
  import { ChangeTracker } from 'shared/data/changes';
  import MessageDialog from 'shared/views/MessageDialog';
  import LanguageDropdown from 'shared/views/LanguageDropdown';
  import ContentDefaults from 'shared/views/form/ContentDefaults';

  export default {
    name: 'ChannelModal',
    components: {
      LanguageDropdown,
      ContentDefaults,
      ChannelThumbnail,
      ChannelSharing,
      MessageDialog,
    },
    props: {
      channelId: {
        type: String,
      },
    },
    data() {
      return {
        loading: false,
        tracker: null,
        header: '',
        changed: false,
        showUnsavedDialog: false,
      };
    },
    computed: {
      ...mapState(['currentLanguage']),
      ...mapGetters('channel', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      routeParamID() {
        return this.$route.params.channelId;
      },
      currentTab: {
        get() {
          return this.$route.query.sharing ? 'share' : 'edit';
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
            thumbnail: this.channel.thumbnail,
            thumbnail_url: this.channel.thumbnail_url,
            thumbnail_encoding: this.channel.thumbnail_encoding,
          };
        },
        set(thumbnailData) {
          this.setChannel({ thumbnailData });
        },
      },
      name: {
        get() {
          return this.channel.name || '';
        },
        set(name) {
          this.setChannel({ name });
        },
      },
      description: {
        get() {
          return this.channel.description || '';
        },
        set(description) {
          this.setChannel({ description });
        },
      },
      language: {
        get() {
          return this.channel.language || this.currentLanguage;
        },
        set(language) {
          this.setChannel({ language });
        },
      },
      contentDefaults: {
        get() {
          return this.channel.content_defaults || {};
        },
        set(contentDefaults) {
          this.setChannel({ contentDefaults });
        },
      },
    },
    watch: {
      routeParamID(val) {
        this.hideHTMLScroll(!!val);
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        const channelId = to.params.channelId;
        vm.verifyChannel(channelId)
          .then(() => {
            vm.header = vm.channel.name; // Get channel name when user enters modal
            vm.hideHTMLScroll(true);
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
      // For some reason the 'hideScroll' method of the VDialog is not
      // being called the first time the dialog is opened, so do that explicitly
      this.$refs.dialog.hideScroll();

      // Set expiry to 1ms
      this.header = this.channel.name; // Get channel name when user enters modal
      this.tracker = new ChangeTracker(1);
      this.tracker.start();
    },
    methods: {
      ...mapActions('channel', ['updateChannel', 'loadChannel', 'deleteChannel']),
      hideHTMLScroll(hidden) {
        document.querySelector('html').style = hidden
          ? 'overflow-y: hidden !important;'
          : 'overflow-y: auto !important';
      },
      saveChannel() {
        if (this.$refs.detailsform.validate()) {
          this.tracker.dismiss().then(() => {
            this.changed = false;

            if (this.channel.new) {
              // TODO: Make sure channel gets created before navigating to channel
              this.updateChannel({ id: this.channelId, new: false });
              window.location = window.Urls.channel(this.channelId);
            } else {
              this.close();
            }
          });
        } else {
          // Go back to Details tab to show validation errors
          this.currentTab = false;
        }
      },
      setChannel(data) {
        this.changed = true;
        this.updateChannel({ id: this.channelId, ...data });
      },
      cancelChanges() {
        if (this.channel.new) {
          this.deleteChannel(this.channelId);
        } else if (this.changed) {
          this.showUnsavedDialog = true;
        } else {
          this.confirmCancel();
        }
      },
      confirmCancel() {
        this.changed = false;
        this.showUnsavedDialog = false;
        this.tracker.revert().then(() => this.close());
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
