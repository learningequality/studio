<template>
  <span>
    <VTooltip v-if="displayEditIcon" top>
      <template slot="activator" slot-scope="{ on }">
        <VBtn
          icon
          data-test="toolbarIconEdit"
          v-on="on"
          @click="clickItem(actions.EDIT_ITEM)"
        >
          <VIcon color="#686868">
            edit
          </VIcon>
        </VBtn>
      </template>
      <span>Edit</span>
    </VTooltip>

    <VTooltip top>
      <template slot="activator" slot-scope="{ on }">
        <VBtn
          icon
          :disabled="!canMoveUp"
          data-test="toolbarIconArrowUp"
          v-on="on"
          @click="clickItem(actions.MOVE_ITEM_UP)"
        >
          <VIcon :color="arrowUpColor">
            keyboard_arrow_up
          </VIcon>
        </VBtn>
      </template>
      <span>Move up</span>
    </VTooltip>

    <VTooltip top>
      <template slot="activator" slot-scope="{ on }">
        <VBtn
          icon
          :disabled="!canMoveDown"
          data-test="toolbarIconArrowDown"
          v-on="on"
          @click="clickItem(actions.MOVE_ITEM_DOWN)"
        >
          <VIcon :color="arrowDownColor">
            keyboard_arrow_down
          </VIcon>
        </VBtn>
      </template>
      <span>Move down</span>
    </VTooltip>

    <VTooltip v-if="displayDeleteIcon" top>
      <template slot="activator" slot-scope="{ on }">
        <VBtn
          icon
          data-test="toolbarIconDelete"
          v-on="on"
          @click="clickItem(actions.DELETE_ITEM)"
        >
          <VIcon color="#686868">
            close
          </VIcon>
        </VBtn>
      </template>
      <span>Delete</span>
    </VTooltip>

    <VMenu
      v-if="displayMenu"
      bottom
      left
      data-test="toolbarMenu"
    >
      <template slot="activator" slot-scope="{ on }">
        <VBtn icon v-on="on">
          <VIcon color="#686868">
            more_vert
          </VIcon>
        </VBtn>
      </template>

      <VList>
        <VListTile
          data-test="toolbarMenuAddItemAbove"
          @click="clickItem(actions.ADD_ITEM_ABOVE)"
        >
          <VListTileTitle>Add {{ itemLabel }} above</VListTileTitle>
        </VListTile>

        <VListTile
          data-test="toolbarMenuAddItemBelow"
          @click="clickItem(actions.ADD_ITEM_BELOW)"
        >
          <VListTileTitle>Add {{ itemLabel }} below</VListTileTitle>
        </VListTile>

        <VListTile
          data-test="toolbarMenuDeleteItem"
          @click="clickItem(actions.DELETE_ITEM)"
        >
          <VListTileTitle>Delete</VListTileTitle>
        </VListTile>
      </VList>
    </VMenu>
  </span>
</template>

<script>

  import { AssessmentItemToolbarActions } from '../../constants';

  const GRAY_DARK = '#686868';
  const GRAY_LIGHT = '#9c9c9c';

  export default {
    name: 'AssessmentItemToolbar',
    props: {
      canMoveUp: {
        type: Boolean,
        default: true,
      },
      canMoveDown: {
        type: Boolean,
        default: true,
      },
      displayEditIcon: {
        type: Boolean,
        default: true,
      },
      displayDeleteIcon: {
        type: Boolean,
        default: true,
      },
      displayMenu: {
        type: Boolean,
        default: true,
      },
      itemLabel: {
        type: String,
        default: 'item',
      },
    },
    data() {
      return {
        actions: AssessmentItemToolbarActions,
      };
    },
    computed: {
      arrowUpColor() {
        if (this.canMoveUp) {
          return GRAY_DARK;
        } else {
          return GRAY_LIGHT;
        }
      },
      arrowDownColor() {
        if (this.canMoveDown) {
          return GRAY_DARK;
        } else {
          return GRAY_LIGHT;
        }
      },
    },
    methods: {
      clickItem(action) {
        this.$emit('click', action);
      },
    },
  };

</script>
