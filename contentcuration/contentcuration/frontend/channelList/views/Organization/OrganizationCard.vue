<template>

  <KCard
    class="organization-card"
    data-testid="organization-card"
    thumbnailDisplay="none"
    :headingLevel="2"
    :title="organization.name"
    @click="$emit('click')"
  >
    <template #belowTitle>
      <div class="card-content">
        <span :style="{ color: $themeTokens.annotation }">
          {{ organization.public ? $tr('publicOrganization') : $tr('privateOrganization') }}
        </span>
        <div
          class="thumbnail-placeholder"
          :style="{ backgroundColor: $themePalette.grey.v_100 }"
        >
          <KIcon
            icon="image"
            class="thumbnail-icon"
            :color="$themePalette.grey.v_400"
          />
        </div>
        <p
          v-if="organization.description"
          class="description notranslate"
          dir="auto"
        >
          {{ organization.description }}
        </p>
      </div>
    </template>
  </KCard>

</template>


<script>

  export default {
    name: 'OrganizationCard',
    props: {
      organization: {
        type: Object,
        required: true,
      },
    },
    $trs: {
      publicOrganization: 'Public organization',
      privateOrganization: 'Private organization',
    },
  };

</script>


<style scoped>

  .organization-card {
    width: 100%;
    max-width: 360px;
    min-height: 480px;
    aspect-ratio: 3 / 4;
  }

  .card-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: 8px;
  }

  .thumbnail-placeholder {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: center;
    min-height: 220px;
    margin-top: 24px;
    border-radius: 4px;
  }

  .thumbnail-icon {
    width: 48px;
    height: 48px;
  }

  .description {
    margin: 24px 0 0;
  }

</style>
