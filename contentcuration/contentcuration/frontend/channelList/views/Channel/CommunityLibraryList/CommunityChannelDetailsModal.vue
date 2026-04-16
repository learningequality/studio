<template>

  <StudioImmersiveModal v-model="isModalOpen">
    <template #header>
      <span class="notranslate">{{ channel ? channel.name : '' }}</span>
    </template>
    <StudioLargeLoader
      v-if="show('channelDetails', isLoading, 500)"
      :style="{ marginTop: '160px' }"
    />
    <div
      v-else-if="channel"
      :style="{
        marginTop: '16px',
      }"
    >
      <StudioDetailsPanel
        v-if="channel"
        class="channel-details-wrapper"
        :details="channel"
        :loading="isLoading"
        :tokenDefinition="needKolibriVersionToImport$()"
      />
    </div>
  </StudioImmersiveModal>

</template>


<script>

  import Vue, { computed, onMounted, watch } from 'vue';
  import useKShow from 'kolibri-design-system/lib/composables/useKShow';
  import { useRouter } from 'vue-router/composables';
  import StudioDetailsPanel from 'shared/views/details/StudioDetailsPanel.vue';
  import StudioLargeLoader from 'shared/views/StudioLargeLoader';
  import StudioImmersiveModal from 'shared/views/StudioImmersiveModal';
  import useStore from 'shared/composables/useStore';
  import { getChannel } from 'shared/data/public';
  import { useFetch } from 'shared/composables/useFetch';
  import { ChannelVersion } from 'shared/data/resources';
  import LanguagesMap from 'shared/leUtils/Languages';
  import LicensesMap from 'shared/leUtils/Licenses';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  /**
   * This function maps the channel info that comes from the public models, to a format that the
   * current studio components expect (they are used to receive channel info from the
   * contentcuration models)
   */
  function mapResponseChannel(channel) {
    const language = channel.lang_code || channel.included_languages?.[0] || null;
    return {
      ...channel,
      published: true,
      count: channel.total_resource_count || 0,
      resource_count: channel.total_resource_count || 0,
      language,
      thumbnail_url: channel.thumbnail,
      modified: channel.last_updated,
      resource_size: channel.published_size || 0,
      last_published: channel.last_published || channel.last_updated,
      primary_token: channel.token,
      languages:
        channel.included_languages?.map(
          langCode => LanguagesMap.get(langCode)?.native_name || langCode,
        ) || [],
      licenses:
        channel.included_licenses
          ?.map(licenseId => LicensesMap.get(licenseId)?.license_name)
          .filter(Boolean) || [],

      // We don't have this data available for public channels,
      // so we null it out to avoid confusion
      levels: null,
      includes: null,
      accessible_languages: null,
      sample_nodes: null,
      tags: null,
      authors: null,
      copyright_holders: null,
      aggregators: null,
      providers: null,
    };
  }
  export default {
    name: 'ChannelDetailsModal',
    components: {
      StudioDetailsPanel,
      StudioLargeLoader,
      StudioImmersiveModal,
    },
    setup(props) {
      const router = useRouter();
      const store = useStore();
      const isModalOpen = computed({
        get: () => true,
        set: value => {
          if (!value) {
            // When the modal is closed, navigate back to the previous page
            router.back();
          }
        },
      });
      const { show } = useKShow();

      const loadChannelDetails = async () => {
        try {
          const channelResponse = await getChannel(props.channelId, { public: false });
          const [channelVersion] = await ChannelVersion.fetchCollection({
            channel: channelResponse.id,
            version: channelResponse.version,
          });
          return mapResponseChannel({
            ...channelResponse,
            ...channelVersion,
          });
        } catch (error) {
          store.dispatch('errors/handleAxiosError', error);
          return null;
        }
      };

      const {
        isLoading,
        data: channel,
        fetchData: fetchChannelDetails,
      } = useFetch({
        asyncFetchFunc: loadChannelDetails,
      });

      watch(
        () => props.channelId,
        channelId => {
          if (channelId) {
            fetchChannelDetails();
          }
        },
        { immediate: true },
      );

      onMounted(() => {
        Vue.$analytics.trackAction('community_channel_details', 'View', {
          id: props.channelId,
        });
      });

      const { needKolibriVersionToImport$ } = communityChannelsStrings;

      return {
        show,
        isLoading,
        channel,
        isModalOpen,

        needKolibriVersionToImport$,
      };
    },
    props: {
      channelId: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .channel-details-wrapper {
    max-width: 900px;
    padding-bottom: 100px;
    margin: 0 auto;
  }

</style>
