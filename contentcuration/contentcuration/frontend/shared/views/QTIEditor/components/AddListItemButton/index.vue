<template>

  <KButton
    appearance="flat-button"
    :appearanceOverrides="buttonAppearanceOverrides"
    class="add-list-item-btn"
    @click="$emit('click')"
  >
    <div class="add-list-item-btn-content">
      <KIcon
        icon="plus"
        :color="$themePalette.blue.v_500"
      />
      <span>{{ label }}</span>
    </div>
  </KButton>

</template>


<script>

  import { computed } from 'vue';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';

  export default {
    name: 'AddListItemButton',
    setup() {
      const palette = themePalette();
      const buttonAppearanceOverrides = computed(() => ({
        backgroundColor: palette.blue.v_50,
        border: `1px dashed ${palette.blue.v_200}`,
        color: `${palette.blue.v_500} !important`,
        fontSize: '14px',
        fontWeight: '600',
        textTransform: 'none',
        ':hover': {
          backgroundColor: palette.blue.v_100,
        },
      }));

      return {
        buttonAppearanceOverrides,
      };
    },
    props: {
      label: {
        type: String,
        required: true,
      },
    },
    emits: ['click'],
  };

</script>


<style scoped>

  .add-list-item-btn {
    justify-content: center;
    width: 100%;
    padding: 11px 16px !important;
    margin-top: 10px;
    line-height: unset !important;
    border-radius: 4px !important;
  }

  .add-list-item-btn-content {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
  }

</style>
