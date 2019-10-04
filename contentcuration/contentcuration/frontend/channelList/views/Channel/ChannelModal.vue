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
      <VToolbar card prominent dark color="blue">
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
      />
      <VCardText v-else>
        <VLayout row justify-center>
          <VFlex md12 lg10 xl8>
            <VLayout row wrap>
              <VFlex xs12 sm12 md3>
                <ThumbnailUpload v-model="thumbnail" :readonly="!canEdit" />
              </VFlex>
              <VFlex xs12 sm12 md8>
                <VAutocomplete
                  v-model="language"
                  :items="languages"
                  prependInnerIcon="language"
                  :readonly="!canEdit"
                  itemText="native_name"
                  itemValue="id"
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
            <VLayout v-if="channelDetails && channelDetails.resource_count" row wrap justify-center>
              <VFlex xs4>
                <VMenu offset-y>
                  <template v-slot:activator="{ on }">
                    <VBtn
                      color="primary"
                      dark
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
              </VFlex>
            </VLayout>
            <ChannelDetails  v-if="channelDetails && channelDetails.resource_count"/>
            <template v-else>
              {{ $tr('empty_details') }}
            </template>
          </VFlex>
        </VLayout>
      </VCardText>
      <VCardActions v-if="channel.edit">
        <VSpacer/>
        <VBtn class="upper" color="error" @click="deleteChannel">
          {{ $tr('deleteChannel') }}
        </VBtn>
        <VBtn class="upper" color="success" @click="save">
          {{ $tr('save') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>


<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import pick from 'lodash/pick';

  // Components
  import { isTempId } from '../../utils';
  import { RouterNames } from '../../constants';
  import Constants from 'edit_channel/constants/index';
  import CopyToken from 'shared/views/CopyToken';
  import ChannelStar from './ChannelStar';
  import ChannelDetails from './ChannelDetails';
  import ThumbnailUpload from 'shared/views/ThumbnailUpload';

  const SCALE_TEXT = [
    'very_small',
    'very_small',
    'small',
    'small',
    'average',
    'average',
    'average',
    'large',
    'large',
    'very_large',
    'very_large',
  ];

  const CHANNEL_SIZE_DIVISOR = 100000000;

  export default {
    name: 'ChannelModal',
    components: {
      CopyToken,
      ChannelStar,
      ChannelDetails,
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
      published: 'Last Published {date, date, medium}',
      openChannel: 'Open channel',
      editDetails: 'Edit details',
      deleteTitle: 'Delete this Channel',
      deletePrompt: 'Once you delete a channel, the channel will be permanently deleted.',
      deleteChannel: 'Delete channel',
      deletingChannel: 'Deleting Channel...',
      deleteWarning:
        'All content under this channel will be deleted.\nAre you sure you want to delete this channel?',
      authors: 'This channel features resources created by',
      aggregators: 'Material in this channel was originally hosted at',
      providers: 'The material in this channel was provided by',
      empty_details: 'This channel is empty',
      topic_author: 'This topic features resources created by',
      topic_aggregator: 'Material in this topic was originally hosted at',
      topic_provider: 'The material in this topic was provided by',
      topic_empty_details: 'This topic is empty',
      no_license: 'No license selected',
      author_description: 'Person or organization who created the content',
      aggregator_description:
        'Website or org hosting the content collection but not necessarily the creator or copyright holder',
      provider_description: 'Organization that commissioned or is distributing the content',
      license: '{count, plural,\n =1 {License}\n other {Licenses}}',
      copyright_holder: '{count, plural,\n =1 {Copyright Holder}\n other {Copyright Holders}}',
      auth_info: 'Authoring Information',
      metadata_info: 'Content Metadata',
      summary_info: 'Summary',
      total_resources: '# of Resources',
      resource_size: 'Size',
      storage: 'Storage',
      visibility_breakdown: 'Visibility',
      content_breakdown: 'Content Summary',
      languages: 'Languages',
      tags: 'Content Tags',
      resource_count: '{count, plural,\n =1 {# Resource}\n other {# Resources}}',
      visibility_count:
        '{count, plural,\n =1 {# resource is}\n other {# resources are}} visible to {user}',
      kind_count: '{count, plural,\n =1 {# {kind}}\n other {# {kind_plural}}}',
      role_description: 'Coach content is visible to coaches only in Kolibri',
      sample_pathway: 'Sample Pathway',
      channel_id: 'Channel ID',
      channel_tokens: '{count, plural,\n =1 {Channel Token}\n other {Channel Tokens}}',
      copy: 'Copy',
      copy_text: 'Copy the following into Kolibri to import this channel',
      total_resource_count: '{data, plural,\n =1 {Total Resource}\n other {Total Resources}}',
      invalid_channel: 'Cannot save invalid channel',
      original_channels: 'Includes Content From',
      whats_inside: "What's Inside",
      source: 'Source',
      topic: 'topic',
      using_channel: 'Using this Channel',
      very_small: 'Very Small',
      small: 'Small',
      average: 'Average',
      large: 'Large',
      very_large: 'Very Large',
      includes: 'Includes',
      coach_content: 'Coach Content',
      assessments: 'Assessments',
      accessible_languages: 'Subtitles',
      instructor_resources: 'For Educators',
      recommended: '(Recommended)',
      preview: 'Preview',
      more: 'Show More ({more})',
      less: 'Show Less',
      original_content: 'Original Content',
      details_tooltip: '{kind} ({percent}%)',
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
      countBar() {
        // Get data for count bar indicator
        if (this.channelDetails && this.channelDetails.resource_count) {
          const sizeIndex = Math.max(
            1,
            Math.min(Math.floor(Math.log(this.channelDetails.resource_count) / Math.log(2.8)), 10)
          );
          const bar = [];
          for (var i = 0; i < 10; ++i) {
            bar.push(i < sizeIndex);
          }
          return {
            filled: bar,
            text: this.$tr(SCALE_TEXT[sizeIndex]),
          };
        }
      },
      sizeBar() {
        // Get data for count bar indicator
        if (this.channelDetails && this.channelDetails.size) {
          const sizeIndex = Math.max(
            1,
            Math.min(
              Math.ceil(Math.log(this.channelDetails.size / CHANNEL_SIZE_DIVISOR) / Math.log(2)),
              10
            )
          );
          return {
            filled: Array(sizeIndex),
            text: this.$tr(SCALE_TEXT[sizeIndex]),
          };
        }
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
      ...mapActions('channelList', ['saveChannel', 'loadChannel', 'loadChannelDetails']),
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
      channelLink(channelId) {
        return window.Urls.channel() + `#/${channelId}/view/`;
      },
      nodeLink(nodeId) {
        return this.channelLink(this.channelId) + nodeId;
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
      deleteChannel() {},
    },
  };

</script>


<style lang="less">

</style>
