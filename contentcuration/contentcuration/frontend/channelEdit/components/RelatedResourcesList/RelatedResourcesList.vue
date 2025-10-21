<template>

  <VList
    v-if="items && items.length"
    two-line
  >
    <template v-for="(item, itemIdx) in items">
      <VListTile
        :key="`list-tile-${itemIdx}`"
        data-test="resource"
      >
        <VListTileAction>
          <ContentNodeIcon
            v-if="item.kind"
            :kind="item.kind"
            :size="20"
          />
        </VListTileAction>

        <VListTileContent>
          <VListTileTitle>
            <KButton
              :class="getTitleClass(item)"
              data-test="resourceLink"
              appearance="basic-link"
              @click="onItemClick(item.id)"
            >
              {{ getTitle(item) }}
            </KButton>
          </VListTileTitle>
          <VListTileSubTitle :class="getTitleClass({ title: item.parentTitle })">
            {{ getTitle({ title: item.parentTitle }) }}
          </VListTileSubTitle>
        </VListTileContent>

        <VListTileAction>
          <KIconButton
            data-test="resourceRemoveBtn"
            :tooltip="removeBtnLabel"
            icon="clear"
            @click="onRemoveClick(item.id)"
          />
        </VListTileAction>
      </VListTile>

      <VDivider :key="`divider-${itemIdx}`" />
    </template>
  </VList>

</template>


<script>

  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import { titleMixin } from 'shared/mixins';

  export default {
    name: 'RelatedResourcesList',
    components: {
      ContentNodeIcon,
    },
    mixins: [titleMixin],
    props: {
      /**
       * An array of node items satisfying
       * following interface:
       * {
       *   id: ...,
       *   title: ...,
       *   kind: ...,
       *   parentTitle: ...
       * }
       */
      items: {
        type: Array,
        required: true,
      },
      removeResourceBtnLabel: {
        type: String,
        required: false,
        default: null,
      },
    },
    computed: {
      removeBtnLabel() {
        return this.removeResourceBtnLabel || this.$tr('removeBtnLabel');
      },
    },
    methods: {
      onRemoveClick(id) {
        this.$emit('removeItemClick', id);
      },
      onItemClick(id) {
        this.$emit('itemClick', id);
      },
    },
    $trs: {
      removeBtnLabel: 'Remove',
    },
  };

</script>
