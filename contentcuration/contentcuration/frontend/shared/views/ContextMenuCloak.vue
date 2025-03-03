<script>

  import { mapGetters, mapMutations } from 'vuex';
  import { extendSlot } from 'shared/utils/helpers';

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
        return !this.disabled && this.currentContextMenu === this._uid;
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
      extendSlot,
    },
    render() {
      if (this.disabled) {
        return this.extendSlot('default');
      }

      return this.extendSlot(
        'default',
        {
          on: {
            contextmenu: this.showMenu,
          },
        },
        {
          showContextMenu: this.showContextMenu,
          positionX: this.x,
          positionY: this.y,
        },
      );
    },
  };

</script>


<style scoped></style>
