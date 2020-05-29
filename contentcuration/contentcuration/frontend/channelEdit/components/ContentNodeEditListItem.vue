<template>

  <ContentNodeListItem
    :node="contentNode"
    :compact="compact"
    :active="active"
    :aria-selected="selected"
    @infoClick="$emit('infoClick', $event)"
    @topicChevronClick="$emit('topicChevronClick', $event)"
  >
    <template #actions-start="{ hover }">
      <VListTileAction class="handle-col" :aria-hidden="!hover">
        <transition name="fade">
          <VBtn flat icon class="ma-0">
            <Icon color="#686868">
              drag_indicator
            </Icon>
          </VBtn>
        </transition>
      </VListTileAction>
      <VListTileAction class="select-col mr-2">
        <Checkbox v-model="selected" class="mt-0 pt-0" />
      </VListTileAction>
    </template>

    <template #actions-end>
      <VListTileAction :aria-hidden="!active">
        <VMenu v-model="activated" offset-y left>
          <template #activator="{ on }">
            <VBtn
              small
              icon
              flat
              class="ma-0"
              v-on="on"
            >
              <Icon>more_horiz</Icon>
            </VBtn>
          </template>
          <ContentNodeOptions :nodeId="nodeId" />
        </VMenu>
      </VListTileAction>
    </template>
  </ContentNodeListItem>

</template>


<script>

  import { mapGetters } from 'vuex';

  import ContentNodeListItem from './ContentNodeListItem';
  import ContentNodeOptions from './ContentNodeOptions';
  import Checkbox from 'shared/views/form/Checkbox';

  export default {
    name: 'ContentNodeEditListItem',
    components: {
      ContentNodeListItem,
      ContentNodeOptions,
      Checkbox,
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
      compact: {
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
        return this.selected || this.activated;
      },
      contentNode() {
        return this.getContentNode(this.nodeId);
      },
    },
  };

</script>


<style lang="less" scoped>

  .select-col {
    opacity: 1;
  }

  .handle-col,
  .select-col {
    width: 24px;
  }

  .handle-col .v-btn {
    margin-left: -3px !important;
    cursor: grab;
  }

  /deep/ .v-input--selection-controls__input {
    margin-right: 0;
  }

</style>
