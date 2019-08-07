<template>
  <VDialog
    v-model="open"
    attach="body"
    fullscreen
  >
    <VCard>
      <VToolbar card prominent color="blue">
        <VBtn icon class="hidden-xs-only" @click="close">
          <VIcon>clear</VIcon>
        </VBtn>
        <VToolbarTitle>
          {{ channel.name }}
        </VToolbarTitle>
      </VToolbar>
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
          <VCardText v-if="channel.created">
            {{ $tr('created', { date: new Date(channel.created) }) }}
          </VCardText>
          <VCardText v-if="channel.last_published">
            {{ $tr('published', { date: new Date(channel.last_published) }) }}
          </VCardText>
          <template v-if="channel.edit">
            <p>{{ $tr('deletePrompt') }}</p>
            <VBtn class="upper" color="error" @click="deleteChannel">
              {{ $tr('deleteChannel') }}
            </VBtn>
          </template>
        </VFlex>
        <VFlex xs1>
          <ChannelStar
            :channel="channel"
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
      <VLayout v-if="channelDetails && channelDetails.resource_count" row wrap>
        <VFlex xs12 sm12 md8 justifyCenter>
          <VTabs>
            <VTab :key="0">
              {{ $tr('whats_inside') }}
            </VTab>
            <VTabItem :key="0">
              <VLayout row wrap>
                <VFlex v-if="countBar" xs6>
                  {{ $tr('resource_size') }}
                  <span id="count_gauge" data-toggle="tooltip" data-placement="top" :title="$tr('resource_count', { count: channelDetails.resource_count}) + '-' + countBar.text">
                    <b v-for="(fill, i) in countBar.filled" :key="i" class="count_icon" :class="fill ? 'filled' : ''">
                      ▮
                    </b>
                  </span>
                </VFlex>
                <VFlex v-if="sizeBar" xs6>
                  {{ $tr('storage') }}
                  <span data-toggle="tooltip" data-placement="top" :title="channelDetails.resource_size + '-' + sizeBar.text">
                    <VIcon v-for="(fill, i) in sizeBar.filled" :key="i">
                      sd_storage
                    </VIcon>
                  </span>
                </VFlex>
              </VLayout>
              <VLayout row wrap>
                <template v-if="channelDetails.kind_count">
                  <VFlex xs8>
                    <!-- D3 Pie chart will be inserted here -->
                  </VFlex>
                  <VFlex xs4>
                    <!-- D3 Legend will be inserted here -->
                  </VFlex>
                </template>
              </VLayout>
              <VLayout row wrap>
                <VFlex xs12>
                  {{ $tr('includes') }}
                  <VLayout row wrap>
                    <VFlex v-if="channelDetails.languages" xs6>
                      <p>{{ $tr('languages') }}</p>
                      <VChip v-for="lang in channelDetails.languages.slice(0, 9)" :key="lang">
                        {{ lang }}
                      </VChip>
                      <VExpansionPanel v-if="channelDetails.languages.length > 10">
                        <VExpansionPanelContent>
                          <template v-slot:header>
                            {{ $tr('more', {more: channelDetails.languages.length - 10}) }}
                          </template>
                          <VChip v-for="lang in channelDetails.languages.slice(10)" :key="lang">
                            {{ lang }}
                          </VChip>
                        </VExpansionPanelContent>
                      </VExpansionPanel>
                    </VFlex>
                    <VFlex v-if="channelDetails.accessible_languages" xs6>
                      <p>{{ $tr('accessible_languages') }}</p>
                      <VChip v-for="lang in channelDetails.accessible_languages.slice(0, 9)" :key="lang">
                        {{ lang }}
                      </VChip>
                      <VExpansionPanel v-if="channelDetails.accessible_languages.length > 10">
                        <VExpansionPanelContent>
                          <template v-slot:header>
                            {{ $tr('more', {more: channelDetails.accessible_languages.length - 10}) }}
                          </template>
                          <VChip v-for="lang in channelDetails.accessible_languages.slice(10)" :key="lang">
                            {{ lang }}
                          </VChip>
                        </VExpansionPanelContent>
                      </VExpansionPanel>
                    </VFlex>
                  </VLayout>
                  <VLayout v-if="channelDetails.includes.coach_content || channelDetails.includes.exercises" row wrap>
                    <VFlex xs4>
                      {{ $tr('instructor_resources') }}
                    </VFlex>
                    <VFlex v-if="channelDetails.includes.coach_content" xs4>
                      <VChip :title="$tr('role_description')">
                        {{ $tr('coach_content') }}
                      </VChip>
                    </VFlex>
                    <VFlex v-if="channelDetails.includes.exercises" xs4>
                      <VChip :title="$tr('role_description')">
                        {{ $tr('assessments') }}
                      </VChip>
                    </VFlex>
                  </VLayout>
                  <VLayout v-if="channelDetails.sample_nodes" row wrap>
                    <VFlex xs6>
                      {{ $tr('preview') }}
                      <VLayout v-if="channelDetails.simple_pathway" row wrap>
                        <VFlex xs12>
                          <a
                            v-for="node in channelDetails.simple_pathway"
                            :key="node.node_id"
                            :href="nodeLink(node.node_id)"
                            target="_blank"
                          >
                            <VChip>
                              <VIcon>{{ node.kind | kindIcon }}</VIcon>
                              {{ node.title }}
                            </VChip>
                          </a>
                        </VFlex>
                      </VLayout>
                      <VLayout row wrap justifyCenter>
                        <VFlex v-for="node in channelDetails.sample_nodes" :key="node.node_id" xs3>
                          <a
                            :href="nodeLink(node.node_id)"
                            target="_blank"
                          >
                            <VImg contain :src="node.thumbnail" />
                            <h5>{{ node.title }}</h5>
                          </a>
                        </VFlex>
                      </VLayout>
                      <VLayout v-if="channelDetails.tags" row wrap>
                        <VFlex xs12>
                          <!-- Tag cloud will be inserted here -->
                        </VFlex>
                      </VLayout>
                    </VFlex>
                  </VLayout>
                </VFlex>
              </VLayout>
            </VTabItem>
            <VTab :key="1">
              {{ $tr('source') }}
            </VTab>
            <VTabItem :key="1">
              <VLayout row wrap>
                <VFlex v-if="channelDetails.authors" xs4>
                  <VIcon>edit</VIcon>
                  <p>{{ $tr('authors') }}</p>
                  <VChip v-for="author in channelDetails.authors.slice(0, 9)" :key="author">
                    {{ author }}
                  </VChip>
                  <VExpansionPanel v-if="channelDetails.authors.length > 10">
                    <VExpansionPanelContent>
                      <template v-slot:header>
                        {{ $tr('more', {more: channelDetails.authors.length - 10}) }}
                      </template>
                      <VChip v-for="author in channelDetails.authors.slice(10)" :key="author">
                        {{ author }}
                      </VChip>
                    </VExpansionPanelContent>
                  </VExpansionPanel>
                </VFlex>
                <VFlex v-if="channelDetails.providers" xs4>
                  <VIcon>pan_tool</VIcon>
                  <p>{{ $tr('providers') }}</p>
                  <VChip v-for="provider in channelDetails.providers.slice(0, 9)" :key="provider">
                    {{ provider }}
                  </VChip>
                  <VExpansionPanel v-if="channelDetails.providers.length > 10">
                    <VExpansionPanelContent>
                      <template v-slot:header>
                        {{ $tr('more', {more: channelDetails.providers.length - 10}) }}
                      </template>
                      <VChip v-for="provider in channelDetails.providers.slice(10)" :key="provider">
                        {{ provider }}
                      </VChip>
                    </VExpansionPanelContent>
                  </VExpansionPanel>
                </VFlex>
                <VFlex v-if="channelDetails.aggregators" xs4>
                  <VIcon>inbox</VIcon>
                  <p>{{ $tr('aggregators') }}</p>
                  <VChip v-for="aggregator in channelDetails.aggregators.slice(0, 9)" :key="aggregator">
                    {{ aggregator }}
                  </VChip>
                  <VExpansionPanel v-if="channelDetails.aggregators.length > 10">
                    <VExpansionPanelContent>
                      <template v-slot:header>
                        {{ $tr('more', {more: channelDetails.aggregators.length - 10}) }}
                      </template>
                      <VChip v-for="aggregator in channelDetails.aggregators.slice(10)" :key="aggregator">
                        {{ aggregator }}
                      </VChip>
                    </VExpansionPanelContent>
                  </VExpansionPanel>
                </VFlex>
                <VLayout row wrap>
                  <VFlex xs2>
                    <VIcon right>
                      copyright
                    </VIcon>
                  </VFlex>
                  <VFlex xs10>
                    <VLayout row wrap>
                      <VFlex v-if="channelDetails.licenses" xs12>
                        {{ $tr('license', { count: channelDetails.licenses.length }) }}
                        <VChip v-for="license in channelDetails.licenses" :key="license">
                          {{ $tr(license) }}
                        </VChip>
                      </VFlex>
                      <VFlex v-if="channelDetails.licenses" xs12>
                        {{ $tr('copyright_holder', { count: channelDetails.copyright_holders.length }) }}
                        <VChip v-for="copyright_holder in channelDetails.copyright_holders" :key="copyright_holder">
                          {{ copyright_holder }}
                        </VChip>
                      </VFlex>
                    </VLayout>
                  </VFlex>
                </VLayout>
                <VLayout v-if="channelDetails.original_channels" row wrap>
                  <VFlex xs12>
                    {{ $tr('original_channels') }}
                    <a
                      v-for="chan in channelDetails.original_channels"
                      :key="chan.id"
                      :href="channelLink(chan.id)"
                      target="_blank"
                    >
                      <VImg v-if="chan.thumbnail" :src="chan.thumbnail" />
                      <VTooltip bottom>
                        <template v-slot:activator="{ on }">
                          <span v-on="on">
                            {{ chan.name }}
                          </span>
                        </template>
                        <span>{{ $tr('resource_count', {count: chan.count }) }}</span>
                      </VTooltip>
                    </a>
                  </VFlex>
                </VLayout>
              </VLayout>
            </VTabItem>
            <VTab v-if="channel.published" :key="2">
              {{ $tr('using_channel') }}
            </VTab>
            <VTabItem v-if="channel.published" :key="2">
              <VLayout row wrap>
                <VFlex xs12>
                  {{ $tr('copy_text') }}
                  <VLayout row wrap>
                    <VFlex xs4>
                      {{ $tr('channel_tokens', { count: channel.secret_tokens && channel.secret_tokens.length || 0}) }}
                      {{ $tr('recommended') }}
                    </VFlex>
                    <VFlex xs8>
                      <CopyToken :token="channel.primary_token" />
                    </VFlex>
                  </VLayout>
                  <VLayout row wrap>
                    <VFlex xs4>
                      {{ $tr('channel_id') }}
                    </VFlex>
                    <VFlex xs8>
                      <CopyToken :token="channel.id" />
                    </VFlex>
                  </VLayout>
                </VFlex>
              </VLayout>
            </VTabItem>
          </VTabs>
        </VFlex>
      </VLayout>
      <template v-else>
        {{ $tr('empty_details') }}
      </template>
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
  import CopyToken from 'edit_channel/sharedComponents/CopyToken';
  import ChannelStar from './ChannelStar';
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
        channelDetails: null,
      };
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
    beforeRouteUpdate(to, from, next) {
      const channelId = to.params.channelId;
      return this.verifyChannel(channelId).then(() => {
        this.setChannelDetails(channelId);
      }).catch(() => {
        // Couldn't verify the channel details, so go cancel navigation!
        next(false);
      });
    },
    computed: {
      ...mapState(['currentLanguage']),
      ...mapGetters('channelList', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId) || {};
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
      ...mapActions('channelList', ['saveChannel', 'addStar', 'removeStar', 'loadChannelList', 'loadChannelDetails']),
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
          // If not, try to load the channel
          this.loadChannelList({ids: channelId }).then(channels => {
            // Did our fetch return any channels, then we have a channel!
            if (channels.length) {
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
        this.channelDetails = null;
        if (!isTempId(channelId)) {
          this.loadChannelDetails(channelId).then(details => {
            this.channelDetails = details;
          });
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
