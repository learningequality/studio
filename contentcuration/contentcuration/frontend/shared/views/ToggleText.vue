<template>

  <div>
    <p class="text" :class="{ notranslate }" :dir="dir">
      {{ initialText }}
      <VSlideYTransition>
        <span v-show="expanded" data-test="overflow">
          {{ overflowText }}
        </span>
      </VSlideYTransition>
      <a v-if="overflowText" class="caption toggler" @click.stop.prevent="toggle">
        <span>{{ togglerText }}</span>
        <Icon
          :icon="expanded ? 'chevronUp' : 'chevronDown' "
        />
      </a>
    </p>
  </div>

</template>


<script>

  export default {
    name: 'ToggleText',
    props: {
      text: {
        type: String,
        default: '',
      },

      /*
        Arbitrarily split at this index

        jayoshih: unfortunately, using css ends up throwing off the styling
          of the parent elements too easily. Instead, we'll split it arbitrarily
          and handle the truncating more manually
      */
      splitAt: {
        type: Number,
        default: 120,
      },
      notranslate: {
        type: Boolean,
        default: false,
      },
      dir: {
        type: String,
        default: 'unset',
      },
    },
    data() {
      return {
        expanded: false,
      };
    },
    computed: {
      splitIndex() {
        // Find where to split the index without breaking words
        // If no spaces are found after the bufferRange, split the text anyways
        const bufferRange = Math.min(Math.ceil(this.splitAt / 4), 50);
        const start = this.splitAt - bufferRange;
        const end = this.splitAt + bufferRange;
        const index = this.text.substring(start, end).search(' ');
        const newSplitIndex = index + start;
        // If there are only a few characters left, just return the whole text...
        // Otherwise, return new index.
        return this.text.length - newSplitIndex <= bufferRange ? this.text.length : newSplitIndex;
      },
      initialText() {
        const text = this.text.substring(0, this.splitIndex);
        return !this.expanded && this.overflowText ? `${text}...` : text;
      },
      togglerText() {
        return this.expanded ? this.$tr('less') : this.$tr('more');
      },
      overflowText() {
        return this.text.substring(this.splitIndex, this.text.length);
      },
    },
    methods: {
      toggle() {
        this.expanded = !this.expanded;
      },
    },
    $trs: {
      more: 'Show more',
      less: 'Show less',
    },
  };

</script>


<style lang="scss" scoped>

  .text {
    margin: 0;
    font-size: 12px;
    word-wrap: break-word;
    white-space: normal;
  }

  .toggler {
    color: var(--v-grey-darken1);

    span {
      text-decoration: underline;
    }

    .v-icon {
      vertical-align: bottom;
    }
  }

</style>
