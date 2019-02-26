<template>
  <div class="toggle-text">
      <div>{{trimmedText.substring(0, splitIndex)}}</div>
      <div class="overflow" :class="{expanded: expanded}">{{overflowText}}</div>
      <p><a v-if="overflowText" class="toggler" @click.stop="toggle">{{togglerText}}</a></p>
  </div>
</template>


<script>


export default {
  name: 'ToggleText',
  $trs: {
    more: "... More",
    less: "Less"
  },
  props: {
    text: {
      type: String,
      default: ""
    },
    splitAt: {
      type: Number,
      default: 100
    }
  },
  data() {
    return {
      expanded: false
    };
  },
  computed: {
    trimmedText() {
      return this.text.trim();
    },
    splitIndex() {
      // Find where to split the index without breaking words
      // If no spaces are found after the bufferRange, split the text anyways
      let bufferRange = Math.round(this.splitAt/4);
      let index = _.findIndex(this.trimmedText.substring(this.splitAt, this.splitAt + bufferRange), (char) => {
        return char === " ";
      });
      let newSplitIndex = index + this.splitAt;

      // If there are only a few characters left, just return the whole text. Otherwise, return new index
      return (this.trimmedText.length - newSplitIndex <= bufferRange)? this.trimmedText.length : newSplitIndex;
    },
    overflowText() {
      return this.trimmedText.substring(this.splitIndex, this.trimmedText.length);
    },
    togglerText() {
      return (this.expanded)? this.$tr("less") : this.$tr("more");
    }
  },
  methods: {
    toggle() {
      this.expanded = !this.expanded;
    }
  }
};

</script>


<style lang="less" scoped>

@import '../../../less/global-variables.less';

.toggle-text {
  div {
    .wordwrap;
    margin: 0px;
    display: inline;
  }
  .overflow {
    display: block;
    max-height: 0px;
    overflow-y: hidden;
    -webkit-transition: max-height 0.4s linear;
    -moz-transition: max-height 0.4s linear;
    -o-transition: max-height 0.4s linear;
    transition: max-height 0.4s linear;
    &.expanded {
      max-height: 100vh;
    }
  }
  .toggler {
    text-decoration: none;
    color: @gray-700;
    font-weight: bold;
    &:hover {
      color: @blue-500;
    }
  }
}

</style>
