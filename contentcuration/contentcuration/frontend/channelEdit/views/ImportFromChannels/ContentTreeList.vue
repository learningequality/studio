<template>

  <VContainer class="mx-0 px-0">
    <!-- Breadcrumbs -->
    <div>
      <Breadcrumbs :items="breadCrumbItems">
        <template #item="{ item, index }">
          <span :class="index === 0 ? '' : 'notranslate'">
            {{ item.text }}
          </span>
        </template>
      </Breadcrumbs>
    </div>

    <!-- Main Area with Cards -->
    <LoadingText v-if="loading" />
    <p v-else-if="nodes.length === 0">
      {{ $tr('noResourcesOrTopics') }}
    </p>
    <div
      v-else
      class="px-4"
    >
      <Checkbox
        v-model="selectAll"
        :indeterminate="someSelected"
        :disabled="ancestorIsSelected"
        :label="$tr('selectAllAction')"
      />
      <VLayout
        v-for="node in nodes"
        :key="node.id"
        row
        align-center
      >
        <VFlex shrink>
          <Checkbox
            :key="`checkbox-${node.id}`"
            :ref="setFirstCardCheckboxRef"
            :inputValue="isSelected(node)"
            :disabled="ancestorIsSelected"
            @input="toggleSelected(node)"
          />
        </VFlex>
        <VFlex class="pa-4">
          <BrowsingCard
            :ref="node.id"
            :node="node"
            :inSearch="false"
            @preview="$emit('preview', node)"
            @copy_to_clipboard="$emit('copy_to_clipboard', node)"
          />
        </VFlex>
      </VLayout>
      <div class="show-more-button-container">
        <KButton
          v-if="more"
          :disabled="moreLoading"
          @click="loadMore"
        >
          {{ showMoreLabel }}
        </KButton>
      </div>
    </div>
  </VContainer>

</template>


<script>

  import differenceBy from 'lodash/differenceBy';
  import intersectionBy from 'lodash/intersectionBy';
  import { mapActions, mapGetters } from 'vuex';
  import find from 'lodash/find';
  import NodePanel from '../NodePanel';
  import { RouteNames } from '../../constants';
  import BrowsingCard from './BrowsingCard';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import Checkbox from 'shared/views/form/Checkbox';
  import LoadingText from 'shared/views/LoadingText';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { ChannelListTypes } from 'shared/constants';
  import { crossComponentTranslator } from 'shared/i18n';

  const showMoreTranslator = crossComponentTranslator(NodePanel);

  export default {
    name: 'ContentTreeList',
    components: {
      BrowsingCard,
      Breadcrumbs,
      Checkbox,
      LoadingText,
    },
    mixins: [constantsTranslationMixin],
    props: {
      selected: {
        type: Array,
        required: true,
      },
      topicId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        loading: false,
        more: null,
        moreLoading: false,
        firstCardCheckboxRef: null,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodeChildren', 'getContentNodeAncestors']),
      nodes() {
        return this.getContentNodeChildren(this.topicId) || [];
      },
      selectAll: {
        get() {
          return this.ancestorIsSelected || !differenceBy(this.nodes, this.selected, 'id').length;
        },
        set(isSelected) {
          this.$emit('change_selected', { isSelected, nodes: this.nodes });
        },
      },
      someSelected() {
        return !this.selectAll && Boolean(intersectionBy(this.nodes, this.selected, 'id').length);
      },
      isSelected() {
        return function (node) {
          if (this.ancestorIsSelected) {
            return true;
          }
          return Boolean(find(this.selected, { id: node.id }));
        }.bind(this);
      },
      ancestors() {
        return this.getContentNodeAncestors(this.topicId, true);
      },
      ancestorIsSelected() {
        return Boolean(intersectionBy(this.selected, this.ancestors, 'id').length);
      },
      breadCrumbItems() {
        const ancestorsLinks = this.ancestors.map(ancestor => {
          return {
            text: ancestor.title,
            to: {
              name: RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
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
              name: RouteNames.IMPORT_FROM_CHANNELS_BROWSE,
              params: {},
              query: this.$route.query,
            },
          },
          ...ancestorsLinks,
        ];
      },
      showMoreLabel() {
        // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
        return showMoreTranslator.$tr('showMore');
      },
    },
    watch: {
      topicId(newTopicId, oldTopicId) {
        if (newTopicId !== oldTopicId && newTopicId) {
          this.loadData();
        }
      },
    },
    created() {
      this.loadData();
    },
    methods: {
      ...mapActions('contentNode', ['loadChildren', 'loadAncestors', 'loadContentNodes']),
      loadData() {
        this.loading = true;
        this.firstCardCheckboxRef = null;
        const params = {
          complete: true,
        };
        const channelListType = this.$route.query.channel_list || ChannelListTypes.PUBLIC;
        if (channelListType === ChannelListTypes.PUBLIC) {
          // TODO: load from public API instead
          // TODO: challenging because of node_id->id and root_id->channel_id
          params.published = true;
        }

        return Promise.all([
          this.loadChildren({ parent: this.topicId, ...params }).then(childrenResponse => {
            this.more = childrenResponse.more || null;
          }),
          this.loadAncestors({ id: this.topicId }),
        ]).then(() => {
          this.loading = false;
        });
      },
      /**
       * @public
       * @param nodeId
       */
      scrollToNode(nodeId) {
        const ref = this.$refs[nodeId];
        if (ref) {
          ref[0].$el.scrollIntoView(false);
          // HACK scroll down a little bit more to get whole card in view
          window.scroll(0, window.scrollY + 80);
        }
      },
      toggleSelected(node) {
        this.$emit('change_selected', { nodes: [node], isSelected: !this.isSelected(node) });
      },
      loadMore() {
        if (this.more && !this.moreLoading) {
          this.moreLoading = true;
          this.loadContentNodes(this.more).then(response => {
            this.more = response.more || null;
            this.moreLoading = false;
          });
        }
      },
      setFirstCardCheckboxRef(ref) {
        if (!this.firstCardCheckboxRef) {
          this.firstCardCheckboxRef = ref;
        }
      },
      /**
       * @public
       */
      focus() {
        if (this.firstCardCheckboxRef) {
          this.firstCardCheckboxRef.focus();
        }
      },
    },
    $trs: {
      allChannelsLabel: 'Channels',
      noResourcesOrTopics: 'There are no resources or folders here',
      selectAllAction: 'Select all',
    },
  };

</script>


<style scoped>

  .show-more-button-container {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-bottom: 10px;
  }

</style>
