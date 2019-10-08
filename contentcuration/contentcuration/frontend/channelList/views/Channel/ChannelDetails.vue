<template>
    
    <VLayout row wrap>
      <VFlex xs12 justify-center>
        <VTabs>
          <VTab :key="0">
            {{ $tr('whats_inside') }}
          </VTab>
          <VTabItem :key="0">
            <VLayout row wrap>
              <VFlex v-if="countBar" xs6>
                <VTooltip top>
                  <template v-slot:activator="{ on }">
                    {{ $tr('resource_size') }}
                    <b v-for="(fill, i) in countBar.filled" :key="i" class="count_icon" :class="fill ? 'filled' : ''">
                      ▮
                    </b>
                  </template>
                  <span>{{ $tr('resource_count', { count: channelDetails.resource_count}) + '-' + countBar.text }}</span>
                </VTooltip>
              </VFlex>
              <VFlex v-if="sizeBar" xs6>
                <VTooltip top>
                  <template v-slot:activator="{ on }">
                    {{ $tr('storage') }}
                    <VIcon v-for="(fill, i) in sizeBar.filled" :key="i">
                      sd_storage
                    </VIcon>
                  </template>
                  <span>{{ channelDetails.resource_size + '-' + sizeBar.text }}</span>
                </VTooltip>
              </VFlex>
            </VLayout>
            <VLayout row wrap>
              <template v-if="channelDetails.kind_count.length">
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
                <VLayout row wrap>
                  <VFlex v-if="channelDetails.languages.length" xs12>
                    <VLayout row wrap align-center>
                      <VFlex xs1>
                        <span>{{ $tr('languages') }}</span>
                      </VFlex>
                      <VFlex xs11>
                        <VChip v-for="lang in channelDetails.languages.slice(0, 9)" :key="lang">
                          {{ lang }}
                        </VChip>
                      </VFlex>
                    </VLayout>
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
                  <VFlex v-if="channelDetails.accessible_languages.length" xs12>
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
                        <VueWordCloud :words="channelDetails.tags.map(tag => [tag.tag_name, tag.count])" />
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
              <VFlex v-if="channelDetails.authors.length" xs12>
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
              <VFlex v-if="channelDetails.providers.length" xs12>
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
              <VFlex v-if="channelDetails.aggregators.length" xs12>
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

</template>

<script>

  import { mapGetters } from 'vuex';
  import VueWordCloud from 'vuewordcloud';
  import CopyToken from 'shared/views/CopyToken';
  import ContentNodeIcon from 'edit_channel/sharedComponents/ContentNodeIcon';

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
    name: 'ChannelDetails',
    $trs: {
      whats_inside: "What's Inside",
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
      source: 'Source',
      topic: 'topic',
      using_channel: 'Using this Channel',
      recommended: '(Recommended)',
      preview: 'Preview',
      more: 'Show More ({more})',
      less: 'Show Less',
      original_content: 'Original Content',
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
    },
    components: {
      ContentNodeIcon,
      VueWordCloud,
      CopyToken,
    },
    props: {
      channelId: {
        required: true,
        type: String,
      },
    },
    computed: {
      ...mapGetters('channelList', ['getChannel', 'getChannelDetails']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      channelDetails() {
        return this.getChannelDetails(this.channelId);
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
    },
    methods: {
      channelLink(channelId) {
        return window.Urls.channel() + `#/${channelId}/view/`;
      },
      nodeLink(nodeId) {
        return this.channelLink(this.channelId) + nodeId;
      },
    },
  }

</script>