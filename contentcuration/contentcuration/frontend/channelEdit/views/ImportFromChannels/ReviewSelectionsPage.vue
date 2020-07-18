<template>

  <VContainer fluid>
    <h1>{{ $tr('reviewSelectionHeader') }}</h1>
    <p v-if="selected.length === 0">
      {{ $tr('noResourcesSelected') }}
    </p>
    <VList>
      <template v-for="(node, index) in selected">
        <VListTile :key="index" class="py-2 height-auto">
          <VLayout row align-center wrap>
            <VFlex shrink class="px-2 mr-2">
              <ContentNodeIcon :kind="node.kind" />
            </VFlex>
            <VFlex md5 sm12>
              <VListTileContent>
                <VListTileTitle>
                  <ActionLink
                    class="notranslate subheading"
                    :text="node.title"
                    @click="$emit('preview', node)"
                  />
                </VListTileTitle>
                <VListTileSubTitle v-if="node.kind === 'topic'">
                  {{ $tr('resourcesInTopic', { count: numberOfResources(node) }) }}
                </VListTileSubTitle>
              </VListTileContent>
            </VFlex>
            <VFlex md4 sm12 class="notranslate">
              {{ node.original_channel_name }}
            </VFlex>
            <VFlex grow class="text-sm-right">
              <VBtn flat @click="handleClickRemove(node)">
                {{ $tr('removeAction') }}
              </VBtn>
            </VFlex>
          </VLayout>
        </VListTile>
        <VDivider :key="'div' + index" />
      </template>
    </VList>
  </VContainer>

</template>


<script>

  import ContentNodeIcon from 'shared/views/ContentNodeIcon';

  export default {
    name: 'ReviewSelectionsPage',
    inject: ['RouterNames'],
    components: {
      ContentNodeIcon,
    },
    props: {
      selected: {
        type: Array,
        required: true,
        default() {
          return [];
        },
      },
    },
    methods: {
      handleClickRemove(node) {
        const newSelected = this.selected.filter(x => x.id !== node.id);
        this.$emit('update:selected', newSelected);
      },
      numberOfResources(node) {
        if (node.kind !== 'topic') {
          return undefined;
        }
        return node.resource_count;
      },
    },
    $trs: {
      reviewSelectionHeader: 'Review selections',
      resourcesInTopic: `{count, number} {count, plural, one {resource} other {resources}}`,
      removeAction: 'Remove',
      noResourcesSelected: 'No resources selected',
    },
  };

</script>


<style lang="less" scoped>

  .over-app-bar {
    z-index: 3;
  }

  // Because the tiles don't re-adjust in responsive mode
  /deep/ .v-list__tile {
    height: auto;
  }

</style>
