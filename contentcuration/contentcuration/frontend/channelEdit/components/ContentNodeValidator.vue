<template>

  <KLabeledIcon
    v-if="noTitle && !hideTitleValidation"
    icon="error"
    :color="$themeTokens.error"
    :style="{ fontSize: '20px' }"
  >
    <span :style="{ color: $themeTokens.error }">
      {{ $tr('missingTitle') }}
    </span>
  </KLabeledIcon>
  <span v-else-if="error">
    <KIcon
      ref="error"
      icon="error"
      :aria-label="error"
      :style="{ fontSize: '20px', marginLeft: '16px' }"
    />
    <!--
      teleported since when rendered in Vuetify's
      .v-list__ components, the tooltip gets cut off
      (previously used VTooltip used this approach
      as well under the hood)
    -->
    <Teleport
      to="#tooltips"
    >
      <KTooltip
        reference="error"
        :refs="$refs"
        placement="bottom"
      >
        {{ error }}
      </KTooltip>
    </Teleport>
  </span>
  <span v-else-if="warning">
    <KIcon
      ref="warning"
      icon="warningIncomplete"
      :aria-label="warning"
      :style="{ fontSize: '20px', marginLeft: '16px' }"
    />
    <!--
      teleported since when rendered in Vuetify's
      .v-list__ components, the tooltip gets cut off
      (previously used VTooltip used this approach
      as well under the hood)
    -->
    <Teleport
      to="#tooltips"
    >
      <KTooltip
        reference="warning"
        :refs="$refs"
        placement="bottom"
      >
        {{ warning }}
      </KTooltip>
    </Teleport>
  </span>

</template>
<script>

  import Teleport from 'vue2-teleport';

  export default {
    name: 'ContentNodeValidator',
    components: {
      Teleport,
    },
    props: {
      node: {
        type: Object,
        default: null,
      },
      hideTitleValidation: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      noTitle() {
        return !this.node.title;
      },
      warning() {
        return this.node.error_count
          ? this.$tr('incompleteDescendantsText', { count: this.node.error_count })
          : '';
      },
      error() {
        if (!this.node.complete) {
          return this.$tr('incompleteText');
        } else if (this.node.total_count && this.node.error_count >= this.node.total_count) {
          return this.$tr('allIncompleteDescendantsText', { count: this.node.error_count });
        }
        return '';
      },
    },
    $trs: {
      incompleteText: 'Incomplete',
      missingTitle: 'Missing title',
      incompleteDescendantsText:
        '{count, number, integer} {count, plural, one {resource is incomplete} other {resources are incomplete}}',
      allIncompleteDescendantsText:
        '{count, plural, one {{count, number, integer} resource is incomplete and cannot be published} other {All {count, number, integer} resources are incomplete and cannot be published}}',
    },
  };

</script>

<style scoped>
  .v-icon {
    vertical-align: bottom;
    cursor: default;
  }
</style>
