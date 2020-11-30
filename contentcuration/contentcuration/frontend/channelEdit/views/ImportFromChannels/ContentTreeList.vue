<template>

  <VContainer class="mx-0 px-0">
    <!-- Breadcrumbs -->
    <div>
      <Breadcrumbs :items="breadCrumbItems">
        <template #item="{ item }">
          {{ item.text }}
        </template>
      </Breadcrumbs>
    </div>

    <!-- Main Area with Cards -->
    <LoadingText v-if="loading" />
    <p v-else-if="nodes.length === 0">
      {{ $tr('noResourcesOrTopics') }}
    </p>
    <div v-else class="px-4">
      <Checkbox
        v-model="selectAll"
        :indeterminate="someSelected"
        :disabled="ancestorIsSelected"
        :label="$tr('selectAllAction')"
      />
      <VLayout v-for="node in nodes" :key="node.id" row align-center>
        <VFlex shrink>
          <Checkbox
            :key="`checkbox-${node.id}`"
            :input-value="isSelected(node)"
            :disabled="ancestorIsSelected"
            @change="toggleSelected(node)"
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
    </div>
  </VContainer>

</template>


<script>

  import differenceBy from 'lodash/differenceBy';
  import intersectionBy from 'lodash/intersectionBy';
  import { mapActions, mapGetters } from 'vuex';
  import find from 'lodash/find';
  import { RouterNames } from '../../constants';
  import BrowsingCard from './BrowsingCard';
  import Breadcrumbs from 'shared/views/Breadcrumbs';
  import Checkbox from 'shared/views/form/Checkbox';
  import LoadingText from 'shared/views/LoadingText';
  import { constantsTranslationMixin } from 'shared/mixins';

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
        return function(node) {
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
              name: RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
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
              name: RouterNames.IMPORT_FROM_CHANNELS_BROWSE,
              params: {},
              query: this.$route.query,
            },
          },
          ...ancestorsLinks,
        ];
      },
    },
    watch: {
      topicId(parent) {
        this.loading = true;
        return this.loadChildren({
          parent,
        }).then(() => {
          this.loading = false;
        });
      },
    },
    mounted() {
      this.loading = true;
      return Promise.all([
        this.loadChildren({ parent: this.topicId }),
        this.loadAncestors({ id: this.topicId }),
      ]).then(() => {
        this.loading = false;
      });
    },
    methods: {
      ...mapActions('contentNode', ['loadChildren', 'loadAncestors']),
      // @public
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
    },
    $trs: {
      allChannelsLabel: 'Channels',
      noResourcesOrTopics: 'There are no resources or topics here',
      selectAllAction: 'Select all',
    },
  };

</script>


<style scoped></style>
