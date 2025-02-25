<template>

  <div>
    <div v-if="disabled">
      <slot></slot>
    </div>
    <div
      v-else
      style="width: 100%"
      data-test="contextMenu"
      @contextmenu.prevent="showMenu"
    >
      <slot></slot>
      <BaseMenu
        v-model="show"
        :position-x="x"
        :position-y="y"
        absolute
      >
        <VCard>
          <slot name="menu"></slot>
        </VCard>
      </BaseMenu>
    </div>
  </div>

</template>


<script>

  import { mapGetters, mapMutations } from 'vuex';

  export default {
    name: 'ContextMenu',
    props: {
      disabled: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data: () => {
      return {
        x: 0,
        y: 0,
        show: false,
      };
    },
    computed: {
      ...mapGetters('contextMenu', ['currentContextMenu']),
    },
    watch: {
      currentContextMenu(menuID) {
        if (menuID !== this._uid) {
          this.show = false;
        }
      },
    },
    methods: {
      ...mapMutations('contextMenu', { setMenu: 'SET_CONTEXT_MENU' }),
      showMenu(e) {
        this.show = false;
        this.x = e.clientX;
        this.y = e.clientY;
        this.setMenu(this._uid);
        this.$nextTick(() => {
          this.show = true;
        });
      },
    },
  };

</script>


<style scoped></style>
