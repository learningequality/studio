<script>

  import { mapGetters, mapMutations } from 'vuex';

  /**
   * Invisibly wraps the element with context menu handling, providing the information
   * through scoped slot data
   */
  export default {
    name: 'ContextMenuCloak',
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
      };
    },
    computed: {
      ...mapGetters('contextMenu', ['currentContextMenu']),
      showContextMenu() {
        return this.currentContextMenu === this._uid;
      },
    },
    methods: {
      ...mapMutations('contextMenu', { setMenu: 'SET_CONTEXT_MENU' }),
      showMenu(e) {
        e.preventDefault();

        this.x = e.clientX;
        this.y = e.clientY;
        this.setMenu(this._uid);
      },
    },
    render() {
      let element = null;

      if (this.$scopedSlots.default) {
        element = this.$scopedSlots.default({
          showContextMenu: this.showContextMenu,
          positionX: this.x,
          positionY: this.y,
        });
      } else {
        // Should have scoped slot
        return null;
      }

      if (Array.isArray(element)) {
        if (element.length === 1) {
          element = element[0];
        } else {
          // Must only have one element returned from the slot
          element = null;
        }
      }

      if (element && !this.disabled) {
        const { componentOptions = {} } = element;
        componentOptions.listeners = componentOptions.listeners || {};
        Object.assign(componentOptions.listeners, {
          contextmenu: e => this.showMenu(e),
        });

        element.componentOptions = componentOptions;
      }

      return element;
    },
  };

</script>

<style scoped>

</style>
