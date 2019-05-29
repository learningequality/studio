<template>
  <a
    :title="starText"
    class="option star-option material-icons"
    :class="{starred: starred}"
    @click.stop="toggleStar"
  ></a>
</template>

<script>

  export default {
    name: 'Star',
    $trs: {
      unstar: 'Remove Star',
      star: 'Add Star',
    },
    props: {
      starred: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      starText() {
        return this.starred ? this.$tr('unstar') : this.$tr('star');
      },
    },
    methods: {
      toggleStar() {
        this.starred ? this.$emit('unstarred') : this.$emit('starred');
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../less/global-variables.less';

  .star-option {
    cursor: pointer;
    &::before {
      .material-icons;

      content: 'star_border';
    }
    &.starred {
      &::before {
        content: 'star';
      }
    }
  }

</style>
