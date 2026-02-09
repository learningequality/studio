<template>

  <div>
    <a
      ref="menuItem"
      :href="link"
      class="studio-navigation-option"
      role="menuitem"
      :class="$computedClass(optionStyle)"
      tabindex="0"
      @click="handleClick"
      @keydown.enter="handleClick"
    >
      <slot>
        <KIcon
          v-if="icon"
          :icon="icon"
          :color="optionIconColor"
          class="menu-icon"
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
    name: 'StudioNavigationOption',
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
            backgroundColor: this.$themePalette.grey.v_200,
          },
          ':focus': this.$coreOutline,
        };
      },
      optionIconColor() {
        return this.$themeTokens.text;
      },
    },
    methods: {
      handleClick(event) {
        if (!this.link) {
          event.preventDefault();
          this.$emit('select');
        }
        this.$emit('click', event);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .studio-navigation-option {
    display: flex;
    align-items: center;
    padding: 8px;
    margin: 4px 8px;
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

  .menu-icon {
    margin-right: 16px;
  }

  .option-label {
    flex: 1;
  }

</style>
