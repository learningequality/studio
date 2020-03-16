<template>

  <div>
    <!-- Filters -->
    <div v-if="showChannelList">
      <VLayout row wrap>
        <VFlex sm3 class="mr-3">
          <VSelect
            v-model="channelFilter"
            :label="$tr('channelFilterLabel')"
            :items="channelFilterOptions"
          />
        </VFlex>
        <VFlex sm3>
          <VSelect
            v-model="languageFilter"
            :label="$tr('languageFilterLabel')"
            :items="languageFilterOptions"
          />
        </VFlex>
      </VLayout>
    </div>

    <!-- Breadcrumbs -->
    <div>
      <VBreadcrumbs :items="breadCrumbItems">
        <template v-slot:divider>
          <VIcon>chevron_right</VIcon>
        </template>
      </VBreadcrumbs>
    </div>

    <!-- Main Area with Cards -->
    <div>
      <p v-if="nodes.length === 0">
        {{ $tr('noResourcesOrTopics') }}
      </p>
      <template v-else>
        <template v-if="showChannelList">
          <p v-if="filteredChannels.length === 0">
            {{ $tr('noMatchingChannels') }}
          </p>
          <ChannelInfoCard
            v-for="node in filteredChannels"
            :key="node.id"
            :node="node"
            class="mb-3"
          />
        </template>
        <template v-else>
          <VCheckbox
            :inputValue="selectAllChecked"
            :disabled="ancestorIsSelected"
            :label="$tr('selectAllAction')"
            @change="handleSelectAll"
          />
          <BrowsingCard
            v-for="node in nodes"
            :ref="node.id"
            :key="node.id"
            :node="node"
            :checked="isSelected(node)"
            :disabled="ancestorIsSelected"
            :inSearch="false"
            class="mb-3"
            @change="handleCardChange($event, node)"
            @preview="$emit('preview', node)"
            @click_clipboard="handleClickClipboard(node)"
          />
        </template>
      </template>
    </div>
  </div>

</template>


<script>

  import find from 'lodash/find';
  import every from 'lodash/every';
  import get from 'lodash/get';
  import uniq from 'lodash/uniq';
  import BrowsingCard from './BrowsingCard';
  import ChannelInfoCard from './ChannelInfoCard';
  import { constantsTranslationMixin } from 'shared/mixins';

  export default {
    name: 'ContentTreeList',
    components: {
      BrowsingCard,
      ChannelInfoCard,
    },
    mixins: [constantsTranslationMixin],
    props: {
      selected: {
        type: Array,
        required: true,
      },
      nodes: {
        type: Array,
        required: true,
      },
      topicNode: {
        type: Object,
        required: false,
      },
      channelNode: {
        type: Object,
        required: false,
      },
    },
    data() {
      return {
        channelFilter: 'ALL',
        languageFilter: 'ALL',
      };
    },
    computed: {
      isSelected() {
        return function(node) {
          if (this.ancestorIsSelected) {
            return true;
          }
          return find(this.selected, { id: node.id });
        }.bind(this);
      },
      selectAllChecked() {
        if (this.ancestorIsSelected) {
          return true;
        }
        return every(this.nodes, n => {
          return find(this.selected, { id: n.id });
        });
      },
      filteredChannels() {
        return this.nodes.filter(channel => {
          return this.passesChannelTypeFilter(channel) && this.passesChannelLanguageFilter(channel);
        });
      },
      ancestorIsSelected() {
        const topicId = get(this.topicNode, 'id');
        const ancestorIds = get(this.topicNode, 'ancestors', []);
        return Boolean(
          find(this.selected, node => {
            return node.id === topicId || ancestorIds.includes(node.id);
          })
        );
      },
      showChannelList() {
        return get(this.nodes, '[0].isChannel');
      },
      breadCrumbItems() {
        let ancestors;
        if (!this.topicNode || !this.channelNode) {
          ancestors = [];
        } else {
          ancestors = [
            { id: this.channelNode.id, title: this.channelNode.title },
            ...this.topicNode.ancestorNodes.map(a => ({ id: a.id, title: a.title })),
          ];
          if (this.topicNode.id !== this.channelNode.id) {
            ancestors.push({
              id: this.topicNode.id,
              title: this.topicNode.title,
            });
          }
        }

        const ancestorsLinks = ancestors.map(ancestor => {
          return {
            text: ancestor.title,
            to: {
              name: 'IMPORT_FROM_CHANNELS_BROWSE',
              params: {
                channelId: this.$route.params.channelId,
                nodeId: ancestor.id,
              },
            },
          };
        });
        return [
          {
            text: this.$tr('allChannelsLabel'),
            to: {
              name: 'IMPORT_FROM_CHANNELS_BROWSE',
              params: {},
            },
            exact: true,
          },
          ...ancestorsLinks,
        ];
      },
      channelFilterOptions() {
        return [
          {
            text: this.$tr('channelFilterOptionAll'),
            value: 'ALL',
          },
          {
            text: this.$tr('channelFilterOptionMine'),
            value: 'MY_CHANNELS',
          },
          {
            text: this.$tr('channelFilterOptionStarred'),
            value: 'STARRED',
          },
          {
            text: this.$tr('channelFilterOptionPublic'),
            value: 'PUBLIC',
          },
        ];
      },
      languageFilterOptions() {
        const langOptions = uniq(
          this.nodes.map(node => {
            return {
              text: this.translateLanguage(node.language),
              value: node.language,
            };
          })
        );
        return [
          {
            text: this.$tr('languageFilterOptionAll'),
            value: 'ALL',
          },
          ...langOptions,
        ];
      },
    },
    methods: {
      handleSelectAll(checked) {
        this.$emit('change_select_all', checked);
      },
      handleCardChange(isSelected, node) {
        this.$emit('change_selected', { node, isSelected });
      },
      passesChannelTypeFilter(channel) {
        switch (this.channelFilter) {
          case 'MY_CHANNELS':
            return channel.filterMine;
          case 'STARRED':
            return channel.filterStarred;
          case 'PUBLIC':
            return channel.filterPublic;
          default:
            return true;
        }
      },
      passesChannelLanguageFilter(channel) {
        if (this.languageFilter === 'ALL') {
          return true;
        }
        return this.languageFilter === channel.language;
      },
      handleClickClipboard(node) {
        this.$emit('click_clipboard', node);
      },
      // @public
      scrollToNode(nodeId) {
        const ref = this.$refs[nodeId];
        if (ref) {
          ref[0].$el.scrollIntoView(false);
          // HACK scroll down a little bit more to get whole card in view
          window.scroll(0, window.scrollY + 80);
        }
      },
    },
    $trs: {
      channelFilterLabel: 'Channels',
      allChannelsLabel: 'Channels',
      channelFilterOptionAll: 'All channels',
      channelFilterOptionMine: 'My channels',
      channelFilterOptionStarred: 'Starred',
      channelFilterOptionPublic: 'Public',
      languageFilterLabel: 'Language',
      languageFilterOptionAll: 'All languages',
      noResourcesOrTopics: 'There are no resources or topics here',
      noMatchingChannels: 'There are no matching channels',
      selectAllAction: 'Select all',
    },
  };

</script>


<style lang="scss" scoped></style>
