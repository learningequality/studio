<template>

  <ExpandableContainer
    :title="channelDetailsLabel$()"
    :expanded="true"
    @open="onOpen"
  >
    <template #default="{ isOpen, expandableContentId }">
      <div class="submission-channel-details">
        <div class="grid-layout submission-summary">
          <div>
            <strong>
              {{ submissionMessage }}
            </strong>
            <div class="mb-22">
              {{ $formatRelative(props.submission.date_created) }}
            </div>
            <StudioDetailsRow
              :label="countryLabel$()"
              :text="countriesString"
            />
            <StudioDetailsRow
              :label="languageLabel$()"
              :text="languagesString"
            />
            <StudioDetailsRow
              :label="categoriesLabel$()"
              :text="categoriesString"
            />
            <StudioDetailsRow
              :label="licensesLabel$()"
              :text="licensesString"
            />
          </div>
          <div>
            <SpecialPermissionsList
              readOnly
              class="mb-22"
              :channelVersionId="channelVersion.id"
            />
          </div>
        </div>
        <div
          v-if="isOpen"
          :id="expandableContentId"
          class="more-channels-detail"
        >
          <StudioDetailsPanel
            class="grid-layout"
            hideChannelHeader
            :loading="channelDetailsLoading"
            :details="details"
          />
        </div>
        <div class="notes-wrapper">
          <div :style="notesCardStyles">
            <div>
              <strong>
                {{ submissionNotesLabel$() }}
              </strong>
            </div>
            <div>{{ submission.description }}</div>
          </div>
          <div
            v-if="submission.feedback_notes"
            :style="notesCardStyles"
          >
            <div>
              <strong>
                {{ feedbackNotesLabel$() }}
              </strong>
            </div>
            <div>{{ submission.feedback_notes }}</div>
          </div>
          <div
            v-if="submission.internal_notes"
            :style="notesCardStyles"
          >
            <div>
              <strong>
                {{ internalNotesLabel$() }}
              </strong>
            </div>
            <div>{{ submission.internal_notes }}</div>
          </div>
        </div>
      </div>
    </template>
  </ExpandableContainer>

</template>


<script setup>

  import camelCase from 'lodash/camelCase';
  import { computed } from 'vue';
  import { themePalette } from 'kolibri-design-system/lib/styles/theme';
  import SpecialPermissionsList from '../SpecialPermissionsList.vue';
  import ExpandableContainer from './ExpandableContainer.vue';
  import countriesUtil from 'shared/utils/countries';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { commonStrings } from 'shared/strings/commonStrings';
  import { currentLanguage } from 'shared/i18n';
  import StudioDetailsRow from 'shared/views/details/StudioDetailsRow.vue';
  import LanguagesMap from 'shared/leUtils/Languages';
  import LicensesMap from 'shared/leUtils/Licenses';

  import { translateMetadataString } from 'shared/utils/metadataStringsTranslation';
  import { CategoriesLookup } from 'shared/constants';
  import StudioDetailsPanel from 'shared/views/details/StudioDetailsPanel.vue';
  import { useFetch } from 'shared/composables/useFetch';
  import useStore from 'shared/composables/useStore';

  const DEFAULT_TEXT = '---';

  const props = defineProps({
    channel: {
      type: Object,
      required: true,
    },
    submission: {
      type: Object,
      required: true,
    },
    channelVersion: {
      type: Object,
      default: null,
    },
  });

  const $themePalette = themePalette();
  const store = useStore();

  const {
    submissionNotification$,
    editorLabel$,
    channelVersion$,
    countryLabel$,
    languageLabel$,
    licensesLabel$,
    categoriesLabel$,
    internalNotesLabel$,
    feedbackNotesLabel$,
    submissionNotesLabel$,
  } = communityChannelsStrings;
  const { channelDetailsLabel$ } = commonStrings;

  const {
    data: channelDetails,
    isLoading: channelDetailsLoading,
    fetchData: fetchChannelDetails,
  } = useFetch({
    asyncFetchFunc: async () => {
      const channelId = props.channel.id;
      const channelDetails = await store.dispatch('channel/loadChannelDetails', channelId);
      return {
        ...channelDetails,
        channel_id: channelId,
      };
    },
  });

  const submissionMessage = computed(() => {
    return submissionNotification$({
      author: props.submission.author_name || '',
      userType: editorLabel$(),
      channelVersion: channelVersion$({
        name: props.submission.channel_name,
        version: props.submission.channel_version.toString(),
      }),
    });
  });

  const details = computed(() => {
    const data = {
      ...props.channel,
      ...(channelDetails.value || {}),
      // Null out these details, as they are already presented separately
      categories: null,
      languages: null,
      licenses: null,
    };
    if (props.channel.version === props.submission.channel_version) {
      // all channel details are up to date, since we are checking the
      // most recent channel version
      return data;
    }
    return {
      ...data,
      // override fields with proper version details
      last_published: props.channelVersion.date_published,
      version: props.channelVersion.version,
      resource_size: props.channelVersion.size,
      resource_count: props.channelVersion.resource_count,
      kind_count: props.channelVersion.kind_count,

      // We don't have this data available for previous versions,
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
  });
  const countriesString = computed(() => {
    return (
      props.submission.countries
        ?.map(code => countriesUtil.getName(code, currentLanguage))
        .join(', ') || DEFAULT_TEXT
    );
  });

  const languagesString = computed(() => {
    const languages = props.channelVersion.included_languages || [];
    return languages.map(code => LanguagesMap.get(code).readable_name).join(', ') || DEFAULT_TEXT;
  });

  function categoryIdToName(categoryId) {
    return translateMetadataString(camelCase(CategoriesLookup[categoryId]));
  }

  const categoriesString = computed(() => {
    return (
      props.channelVersion.included_categories?.map(categoryIdToName).join(', ') || DEFAULT_TEXT
    );
  });

  const licensesString = computed(() => {
    return (
      props.channelVersion.included_licenses
        ?.map(licenseId => LicensesMap.get(licenseId).license_name)
        .join(', ') || DEFAULT_TEXT
    );
  });

  const notesCardStyles = computed(() => ({
    backgroundColor: $themePalette.grey.v_100,
    borderRadius: '8px',
    padding: '16px',
  }));

  const onOpen = () => {
    if (props.channel.version !== props.submission.channel_version) {
      // Don't fetch details if fetching details for a previous version, since channel details
      // are only available for the most recent version.
      return;
    }
    if (!channelDetails.value || channelDetails.value.channel_id !== props.channel.id) {
      fetchChannelDetails();
    }
  };

</script>


<style scoped lang="scss">

  .grid-layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    column-gap: 20px;
  }

  .notes-wrapper {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .mb-22 {
    margin-bottom: 22px;
  }

</style>
