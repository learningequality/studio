<template>

  <div class="organization-channels-tab">
    <div
      v-if="show('loader', loading, 500)"
      class="loader"
    >
      <KCircularLoader />
    </div>

    <p
      v-else-if="error"
      :style="{ color: $themeTokens.error }"
    >
      {{ organizationStrings.loadChannelsError$() }}
    </p>

    <p v-else-if="!channels.length">
      {{ organizationStrings.noChannels$() }}
    </p>

    <template v-else>
      <KTable
        :caption="organizationStrings.channelsTab$()"
        :headers="headers"
        :rows="rows"
      >
        <template #cell="{ content, colIndex }">
          <KExternalLink
            v-if="colIndex === 0"
            class="notranslate"
            dir="auto"
            :text="content.name"
            :href="channelUrl(content.id)"
            openInNewTab
          />
          <KTextTruncator
            v-else-if="colIndex === 1"
            class="notranslate"
            dir="auto"
            :text="content"
            :maxLines="2"
          />
          <span
            v-else
            class="size"
          >
            {{ content }}
          </span>
        </template>
      </KTable>

      <p
        class="total-size"
        data-testid="total-size"
        :style="{ color: $themeTokens.annotation }"
      >
        {{ organizationStrings.totalSize$({ size: formatSize(size) }) }}
      </p>
    </template>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import { useOrganizationChannels } from '../../composables/useOrganizationChannels';
  import { organizationStrings } from 'shared/strings/organizationStrings';
  import bytesForHumans from 'shared/mixins';

  export default {
    name: 'OrganizationChannelsTab',
    setup(props) {
      const { show } = useKShow();
      const { loading, channels, size, error } = useOrganizationChannels(props.organizationId);

      const headers = [
        {
          label: organizationStrings.channelNameHeader$(),
          dataType: 'undefined',
          columnId: 'name',
          minWidth: '200px',
        },
        {
          label: organizationStrings.channelDescriptionHeader$(),
          dataType: 'string',
          columnId: 'description',
        },
        {
          label: organizationStrings.channelSizeHeader$(),
          dataType: 'number',
          columnId: 'size',
          minWidth: '100px',
        },
      ];

      const rows = computed(() =>
        channels.value.map(channel => [channel, channel.description, bytesForHumans(channel.size)]),
      );

      function channelUrl(channelId) {
        return window.Urls.channel(channelId);
      }

      return {
        show,
        loading,
        channels,
        size,
        error,
        headers,
        rows,
        channelUrl,
        formatSize: bytesForHumans,
        organizationStrings,
      };
    },
    props: {
      organizationId: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .loader {
    margin: 48px auto;
    text-align: center;
  }

  .size {
    white-space: nowrap;
  }

  .total-size {
    margin-top: 8px;
    text-align: right;
  }

</style>
