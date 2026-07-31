<script>

  export default {
    name: 'Teleport',
    props: {
      to: {
        type: String,
        required: true,
      },
    },
    mounted() {
      // In Vue 2, Teleport is not built-in, so we move the DOM node manually
      // to achieve the exact same behavior as Vue 3's <Teleport>.
      this.moveElement();
    },
    updated() {
      this.moveElement();
    },
    beforeDestroy() {
      if (this.$el && this.$el.parentNode) {
        this.$el.parentNode.removeChild(this.$el);
      }
    },
    methods: {
      moveElement() {
        this.targetNode = document.querySelector(this.to);
        if (this.targetNode && this.$el.parentNode !== this.targetNode) {
          this.targetNode.appendChild(this.$el);
        }
      },
    },
    render(h) {
      return h(
        'div',
        { class: 'teleport-wrapper', style: { display: 'contents' } },
        this.$slots.default,
      );
    },
  };

</script>
