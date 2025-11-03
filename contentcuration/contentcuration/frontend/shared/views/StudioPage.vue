<template>

  <main 
    class="studio-page-outer"
    :style="outerStyle"
  >
    <div
      class="studio-page-inner"
      :style="innerStyle"
    >
      <slot></slot>
    </div>
  </main>

</template>


<script>

  import { computed } from 'vue';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';

  export default {
    setup(props) {
      const { windowIsMedium, windowIsLarge } = useKResponsiveWindow();

      const paddingX = computed(() => (windowIsLarge.value ? 48 : windowIsMedium.value ? 24 : 16));
      const paddingTop = computed(() => (props.offline ? 32 : 8));

      const innerStyle = computed(() => ({
        paddingLeft: `${paddingX.value}px`,
        paddingRight: `${paddingX.value}px`,
        paddingTop: `${paddingTop.value}px`,
        maxWidth: windowIsLarge.value ? '1000px' : '100%',
      }));

      const outerStyle = computed(() => {
        const marginTop = props.marginTop !== null ? props.marginTop : 104;
        return {
          marginTop: `${marginTop}px`,
          height: `calc(100vh - ${marginTop}px)`,
        };
      });

      return { innerStyle, outerStyle };
    },
    props: {
      offline: { type: Boolean, default: false },
      marginTop: { type: Number, default: null },  
    },
  };

</script>


<style scoped>

  .studio-page-outer {
    width: 100%;
    margin-bottom: 16px;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .studio-page-inner {
    width: 100%;
    margin-left: 0;
  }

</style>
