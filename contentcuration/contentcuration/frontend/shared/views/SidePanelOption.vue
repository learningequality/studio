<template>

  <div>
    <a
      ref="menuItem"
      :href="link"
      class="side-panel-option"
      role="menuitem"
      :class="$computedClass(optionStyle)"
      tabindex="0"
      @click="handleClick"
      @keydown.enter="handleClick"
    >
      <slot>
        <KIconButton
          v-if="icon"
          disabled="true"
          :icon="icon"
          :color="optionIconColor"
        />
        <span
          v-if="label"
          class="option-label"
        >
          {{ label }}
        </span>
      </slot>
    </a>
  </div>

</template>


<script>

  export default {
    name: 'SidePanelOption',
    props: {
      label: {
        type: String,
        required: false,
        default: '',
      },
      link: {
        type: String,
        default: null,
      },
      icon: {
        type: String,
        required: true,
      },
    },
    computed: {
      optionStyle() {
        return {
          color: this.$themeTokens.text,
          ':hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.048)',
          },
          ':focus': this.$coreOutline,
        };
      },
      optionIconColor() {
  
        return this.$themeTokens.text;
      }
    },
    methods: {
      handleClick(event) {
        // If no link, emit select event (for actions like logout, language modal)
        if (!this.link) {
          event.preventDefault();
          this.$emit('select');
        }
        
        // Emit click event for closing panel
        this.$emit('click', event);
      },
    },
  };

</script>


<style lang="scss" scoped>

@import '~kolibri-design-system/lib/styles/definitions';

.side-panel-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  font-size: 16px;
  text-decoration: none;
  cursor: pointer;
  border-radius: $radius;
  outline-offset: -1px;
  transition: background-color $core-time ease;

  &:hover {
    outline-offset: -1px;
  }
}

.option-label {
  flex: 1;
  padding: 12px 0;
}

</style>