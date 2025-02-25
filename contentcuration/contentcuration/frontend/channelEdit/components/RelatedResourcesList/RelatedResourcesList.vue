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
            <ActionLink
              :class="getTitleClass(item)"
              data-test="resourceLink"
              @click="onItemClick(item.id)"
            >
              {{ getTitle(item) }}
            </ActionLink>
          </VListTileTitle>
          <VListTileSubTitle :class="getTitleClass({ title: item.parentTitle })">
            {{ getTitle({ title: item.parentTitle }) }}
          </VListTileSubTitle>
        </VListTileContent>

        <VListTileAction>
          <VTooltip
            bottom
            lazy
          >
            <template #activator="{ on }">
              <VBtn
                icon
                data-test="resourceRemoveBtn"
                v-on="on"
                @click="onRemoveClick(item.id)"
              >
                <Icon icon="clear" />
              </VBtn>
            </template>
            <span>{{ removeBtnLabel }}</span>
          </VTooltip>
        </VListTileAction>
      </VListTile>

      <VDivider :key="`divider-${itemIdx}`" />
    </template>
  </VList>

</template>


<script>

  import ActionLink from 'shared/views/ActionLink';
  import ContentNodeIcon from 'shared/views/ContentNodeIcon';
  import Icon from 'shared/views/Icon';
  import { titleMixin } from 'shared/mixins';

  export default {
    name: 'RelatedResourcesList',
    components: {
      ActionLink,
      ContentNodeIcon,
      Icon,
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
