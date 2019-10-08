<template>
  <VDialog
    :value="$route.params.channelId == channelId"
    ref="dialog"
    attach="body"
    fullscreen
    scrollable
    transition="dialog-bottom-transition"
  >
    <VCard>
      <VToolbar card prominent dark color="primary">
        <VBtn icon class="hidden-xs-only" @click="close">
          <VIcon>clear</VIcon>
        </VBtn>
        <VToolbarTitle>
          {{ channel.name }}
        </VToolbarTitle>
      </VToolbar>
      <VProgressLinear
        v-if="loading"
        indeterminate
        color="primary"
        style="margin: 0px;"
        height="5"
      />
      <VCardText v-else>
        <VLayout row justify-center>
          <VFlex md12 lg10 xl8>
            <VLayout row wrap>
              <VFlex xs12 sm12 md3>
                <ThumbnailUpload v-model="thumbnail" :readonly="!canEdit" />
              </VFlex>
              <VFlex xs12 sm12 md8>
                <LanguageDropdown
                  v-model="language"
                  :readonly="!canEdit"
                  :required="canEdit"
                  :placeholder="$tr('channelLanguagePlaceholder')"
                />
                <VTextField
                  v-model="name"
                  :label="$tr('channelName')"
                  :placeholder="$tr('channelNamePlaceholder')"
                  :readonly="!canEdit"
                  :rules="[() => name.length ? true : $tr('channelError')]"
                />
                <VTextarea
                  v-model="description"
                  :label="$tr('channelDescription')"
                  :placeholder="$tr('channelDescriptionPlaceholder')"
                  :readonly="!canEdit"
                  maxlength="400"
                  rows="4"
                  counter
                />
                <span v-if="channel.created">
                  {{ $tr('created', { date: new Date(channel.created) }) }}
                </span>
                <span v-if="channel.last_published">
                  {{ $tr('published', { date: new Date(channel.last_published) }) }}
                </span>
              </VFlex>
              <VFlex xs1>
                <ChannelStar
                  :channelId="channelId"
                  :bookmark="channel.bookmark || false"
                />
              </VFlex>
            </VLayout>
            <ChannelDetails  v-if="channelDetails && channel.count" :channelId="channelId"/>
            <template v-else>
              {{ $tr('empty_details') }}
            </template>
          </VFlex>
        </VLayout>
      </VCardText>
      <VCardActions v-if="channel.edit">
        <VMenu v-if="channel.count" offset-y>
          <template v-slot:activator="{ on }">
            <VBtn
              class="upper"
              color="info"
              v-on="on"
            >
              {{ $tr('downloadReport') }}
            </VBtn>
          </template>
          <VList>
            <VListTile
              v-for="(item, index) in downloadOptions"
              :key="index"
              :href="item.href"
              download
            >
              <VListTileTitle>{{ item.title }}</VListTileTitle>
            </VListTile>
          </VList>
        </VMenu>
        <VSpacer/>
        <VBtn class="upper" color="error" @click="deleteDialog=true">
          {{ $tr('deleteChannel') }}
        </VBtn>
        <VBtn class="upper" color="success" @click="save">
          {{ $tr('save') }}
        </VBtn>
      </VCardActions>
    </VCard>
    <PrimaryDialog v-model="deleteDialog" :title="$tr('deleteTitle')">
      {{ $tr('deletePrompt') }}
      <template v-slot:actions>
        <VSpacer/>
        <VBtn
          color="primary"
          flat
          @click="deleteDialog=false"
        >
          {{ $tr('cancel') }}
        </VBtn>
        <VBtn
          color="primary"
          @click="deleteChannelAndClose"
        >
          {{ $tr('deleteChannel') }}
        </VBtn>
      </template>
    </PrimaryDialog>
  </VDialog>
</template>


<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import pick from 'lodash/pick';
  import { isTempId } from '../../utils';
  import { RouterNames } from '../../constants';
  import Constants from 'edit_channel/constants/index';

  // Components
  import PrimaryDialog from 'shared/views/PrimaryDialog';
  import ChannelStar from './ChannelStar';
  import ChannelDetails from './ChannelDetails';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown';
  import ThumbnailUpload from 'shared/views/ThumbnailUpload';

  export default {
    name: 'ChannelModal',
    components: {
      ChannelStar,
      ChannelDetails,
      LanguageDropdown,
      PrimaryDialog,
      ThumbnailUpload,
    },
    $trs: {
      channelName: 'Channel Name',
      channelError: 'Channel name cannot be blank',
      channelNamePlaceholder: 'Enter channel name...',
      channelDescription: 'Channel Description',
      channelDescriptionPlaceholder: 'Enter channel description...',
      channelLanguagePlaceholder: 'Select a language...',
      create: 'Create',
      save: 'Save',
      cancel: 'Cancel',
      invalidChannel: 'Must fill out required fields',
      errorChannelSave: 'Error Saving Channel',
      saving: 'Saving...',
      created: 'Created {date, date, medium}',
      published: 'Last published {date, date, medium}',
      openChannel: 'Open channel',
      editDetails: 'Edit details',
      deleteTitle: 'Delete this channel',
      deletePrompt: 'Once you delete a channel, the channel will be permanently deleted.',
      deleteChannel: 'Delete channel',
      deletingChannel: 'Deleting channel...',
      deleteWarning:
        'All content under this channel will be deleted.\nAre you sure you want to delete this channel?',
      empty_details: 'This channel is empty',
      downloadReport: 'Download Channel Report',
      downloadDetailedPDF: 'Download Detailed PDF',
      downloadPDF: 'Download PDF',
      downloadCSV: 'Download CSV',
      downloadPPT: 'Download PPT',
      downloadStartedHeader: 'Download Started',
      downloadStartedTextPDF:
        'Generating a PDF for {channelName}. Download will start automatically.',
      downloadStartedTextPPT:
        'Generating a PPT for {channelName}. Download will start automatically.',
      downloadStartedTextCSV:
        'Generating a CSV for {channelName}. Download will start automatically.',
      downloadFailedHeader: 'Download Failed',
      downloadFailedTextPDF: 'Failed to download a PDF for {channelName}',
      downloadFailedTextPPT: 'Failed to download a PPT for {channelName}',
      downloadFailedTextCSV: 'Failed to download a CSV for {channelName}',
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        saving: false,
        loading: false,
        deleteDialog: false,
      };
    },
    mounted() {
      // For some reason the 'hideScroll' method of the VDialog is not
      // being called the first time the dialog is opened, so do that explicitly
      this.$refs.dialog.hideScroll();
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        const channelId = to.params.channelId;
        vm.verifyChannel(channelId).then(() => {
          vm.setChannelDetails(channelId);
        }).catch(() => {
          // Couldn't verify the channel details, so go back!
          // We should probaly replace this with a 404 page, as
          // when navigating in from an external link (as this behaviour
          // would often be from - it produces a confusing back step)
          vm.$router.back();
        });
      });
    },
    computed: {
      ...mapState(['currentLanguage']),
      ...mapGetters('channelList', ['getChannel', 'getChannelDetails']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      channelDetails() {
        return this.getChannelDetails(this.channelId);
      },
      canEdit() {
        return this.channel.edit && !this.channel.ricecooker_version;
      },
      name: {
        get() {
          return this.channel.name || '';
        },
        set(name) {
          this.updateChannel({ id: this.channelId, name });
        },
      },
      description: {
        get() {
          return this.channel.description || '';
        },
        set(description) {
          this.updateChannel({ id: this.channelId, description });
        },
      },
      language: {
        get() {
          return this.channel.language || this.currentLanguage;
        },
        set(language) {
          this.updateChannel({ id: this.channelId, language });
        },
      },
      thumbnail: {
        get() {
          return pick(this.channel, ['thumbnail', 'thumbnail_url', 'thumbnail_encoding']);
        },
        set(thumbnailData) {
          this.updateChannel({ id: this.channelId, thumbnailData });
        },
      },
      languages() {
        return Constants.Languages.sort((langA, langB) =>
          langA.native_name.localeCompare(langB.native_name)
        );
      },
      isNew() {
        return isTempId(this.channelId);
      },
      open: {
        get() {
          return true;
        },
        set(open) {
          if (!open) {
            this.close();
          }
        },
      },
      downloadOptions() {
        return [
          {
            title: this.$tr('downloadCSV'),
            href: window.Urls.get_channel_details_csv_endpoint(this.channelId),
          },
          {
            title: this.$tr('downloadDetailedPDF'),
            href: window.Urls.get_channel_details_pdf_endpoint(this.channelId),
          },
          {
            title: this.$tr('downloadPDF'),
            href: window.Urls.get_channel_details_pdf_endpoint(this.channelId) + '?condensed=true',
          },
          {
            title: this.$tr('downloadPPT'),
            href: window.Urls.get_channel_details_ppt_endpoint(this.channelId),
          },
        ];
      },
    },
    methods: {
      ...mapActions('channelList', ['saveChannel', 'loadChannel', 'loadChannelDetails', 'deleteChannel']),
      ...mapMutations('channelList', {
        updateChannel: 'UPDATE_CHANNEL',
      }),
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
            if (channel) {
              this.loading = false;
              resolve();
              return;
            }
            // If not, reject!
            reject();
          })
        });
      },
      setChannelDetails(channelId) {
        if (!isTempId(channelId) && !this.channelDetails) {
          this.loadChannelDetails(channelId);
        }
      },
      close() {
        this.$router.push({
          name: RouterNames.CHANNELS,
          params: { listType: this.$route.params.listType },
        });
      },
      save() {
        this.saving = true;
        return this.saveChannel(this.channelId).then(newId => {
          if (newId) {
            this.$router.replace({
              name: RouterNames.CHANNEL_DETAILS,
              params: { channelId: newId },
            });
          }
          this.saving = false;
        });
      },
      saveAndClose() {
        this.save().then(this.close);
      },
      deleteChannelAndClose() {
        this.deleteChannel(this.channelId).then(this.close);
      },
    },
  };

</script>


<style lang="less">

</style>
