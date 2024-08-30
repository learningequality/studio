<template>

  <span>
    <KIcon
      ref="tooltip"
      :color="$themeTokens.primary"
      style="font-size:20px;"
      :icon="icon"
    />

    <KTooltip
      reference="tooltip"
      placement="bottom"
      maxWidth="80%"
      :refs="$refs"
    >
      {{ text }}
    </KTooltip>
  </span>

</template>

<script>

  export default {
    name: 'HelpTooltip',

    props: {
      text: {
        type: String,
        required: true,
      },
      icon: {
        type: String,
        default: 'info',
      },
    },
  };

</script>
