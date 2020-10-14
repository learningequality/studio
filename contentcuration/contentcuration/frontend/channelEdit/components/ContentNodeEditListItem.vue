<template>

  <ContextMenu>
    <ContentNodeListItem
      :node="contentNode"
      :compact="compact"
      :comfortable="comfortable"
      :active="active"
      :canEdit="canEdit"
      :aria-selected="selected"
      @infoClick="$emit('infoClick', $event)"
      @topicChevronClick="$emit('topicChevronClick', $event)"
    >
      <template #actions-start="{ hover }">
        <VListTileAction class="handle-col" :aria-hidden="!hover" @click.stop>
          <transition name="fade">
            <VBtn v-if="canEdit" flat icon>
              <Icon color="#686868">
                drag_indicator
              </Icon>
            </VBtn>
          </transition>
        </VListTileAction>
        <VListTileAction class="select-col mx-2" @click.stop>
          <Checkbox v-model="selected" class="mt-0 pt-0" @dblclick.stop />
        </VListTileAction>
      </template>

      <template #actions-end>
        <VListTileAction :aria-hidden="!active" class="px-1 action-icon">
          <VMenu v-model="activated" offset-y left>
            <template #activator="{ on }">
              <IconButton
                icon="optionsVertical"
                :text="$tr('optionsTooltip')"
                size="small"
                v-on="on"
                @click.stop
              />
            </template>
            <ContentNodeOptions :nodeId="nodeId" />
          </VMenu>
        </VListTileAction>
      </template>
    </ContentNodeListItem>
    <template #menu>
      <ContentNodeOptions :nodeId="nodeId" />
    </template>
  </ContextMenu>

</template>


<script>

  import { mapGetters } from 'vuex';

  import ContentNodeListItem from './ContentNodeListItem';
  import ContentNodeOptions from './ContentNodeOptions';
  import Checkbox from 'shared/views/form/Checkbox';
  import ContextMenu from 'shared/views/ContextMenu';
  import IconButton from 'shared/views/IconButton';

  export default {
    name: 'ContentNodeEditListItem',
    components: {
      ContentNodeListItem,
      ContentNodeOptions,
      Checkbox,
      ContextMenu,
      IconButton,
    },
    props: {
      nodeId: {
        type: String,
        required: true,
      },
      select: {
        type: Boolean,
        default: false,
      },
      previewing: {
        type: Boolean,
        default: false,
      },
      compact: {
        type: Boolean,
        default: false,
      },
      comfortable: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        activated: false,
      };
    },
    computed: {
      ...mapGetters('currentChannel', ['canEdit']),
      ...mapGetters('contentNode', ['getContentNode']),
      selected: {
        get() {
          return this.select;
        },
        set(value) {
          this.$emit(value ? 'select' : 'deselect');
        },
      },
      active() {
        return this.selected || this.activated || this.previewing;
      },
      contentNode() {
        return this.getContentNode(this.nodeId);
      },
    },
    $trs: {
      optionsTooltip: 'Options',
    },
  };

</script>


<style lang="less" scoped>

  .select-col {
    width: 24px;
    opacity: 1;
  }

  .handle-col {
    width: 32px;
  }

  .handle-col .v-btn {
    margin-left: 2px !important;
    cursor: grab;
  }

  /deep/ .v-input--selection-controls__input {
    margin-right: 0;
  }

  .action-icon {
    display: flex;
    flex: 1 1 auto;
    align-items: flex-start;
    justify-content: center;
  }

</style>
