<template>

  <div id="submit-to-community-library-side-panel-root">
    <SidePanelModal
      alignment="right"
      sidePanelWidth="700px"
      @closePanel="$emit('close')"
    >
      <template #header>
        <h1 class="side-panel-title">Submit to Community Library</h1>
      </template>

      <template #default>
        <div class="content">
          <div class="box info-box">
            <KTransition kind="component-fade-out-in">
              <div
                v-if="submissionsAreLoading"
                key="info-box-loader-wrapper"
                class="loader-wrapper"
              >
                <KCircularLoader
                  class="info-box-loader"
                  disableDefaultTransition
                />
              </div>
              <div v-else-if="submissionsAreFinished">
                <div
                  key="box-message"
                  class="box-message"
                >
                  <KLabeledIcon icon="infoOutline">
                    {{ infoBoxPrimaryText }}
                    <span
                      v-if="infoBoxSecondaryText"
                      class="info-box-secondary-text"
                    >
                      {{ infoBoxSecondaryText }}</span>
                  </KLabeledIcon>
                  <StatusChip
                    v-if="chipStatus"
                    :status="chipStatus"
                    class="status-chip"
                  />
                </div>
                <template v-if="latestSubmissionStatus === 'none'">
                  <div
                    v-if="showingMoreDetails"
                    class="more-details-text"
                  >
                    The Kolibri Community Library features channels created by the community. Share
                    your openly licensed work for review, and once it's approved, it will be
                    available to users in your selected region or language.
                  </div>
                  <KButton
                    v-if="!showingMoreDetails"
                    appearance="basic-link"
                    text="More details about the Community Library"
                    @click="showingMoreDetails = !showingMoreDetails"
                  />
                  <KButton
                    v-else
                    appearance="basic-link"
                    text="Show less"
                    @click="showingMoreDetails = !showingMoreDetails"
                  />
                </template>
              </div>
            </KTransition>
          </div>
          <WarningBox v-if="!isPublished">
            This channel isn't published to Kolibri Studio yet. Publish first, then submit to the
            Community Library.
          </WarningBox>
          <WarningBox v-else-if="isPublic">
            This channel is currently public in the Content Library. It is not possible to submit
            public channels to the Community Library.
          </WarningBox>
          <WarningBox v-else-if="isCurrentVersionAlreadySubmitted">
            This version of the channel has already been submitted to the Community Library. Please
            wait for review or make changes and publish a new version before submitting again.
          </WarningBox>
          <div class="channel-title">{{ props.channel.name }}</div>
          <div>
            <div class="field-annotation">Language(s) detected</div>
            <LoadingText
              :loading="publishedDataIsLoading"
              :finishedLoading="publishedDataIsFinished"
              :omitted="!isPublished"
            >
              {{ detectedLanguages }}
            </LoadingText>
          </div>
          <div>
            <div class="field-annotation">License(s) detected</div>
            <LoadingText
              :loading="publishedDataIsLoading"
              :finishedLoading="publishedDataIsFinished"
              :omitted="!isPublished"
            >
              {{ detectedLicenses }}
            </LoadingText>
          </div>
          <div>
            <div class="field-annotation">Categories</div>
            <LoadingText
              :loading="publishedDataIsLoading"
              :finishedLoading="publishedDataIsFinished"
              :omitted="!isPublished"
            >
              {{ detectedCategories }}
            </LoadingText>
          </div>
          <div class="country-area">
            <KTransition kind="component-fade-out-in">
              <div
                v-if="submissionsAreLoading"
                class="loader-wrapper"
              >
                <KCircularLoader disableDefaultTransition />
              </div>
              <CountryField
                v-else-if="submissionsAreFinished"
                v-model="countries"
                class="country-field"
                :disabled="!canBeEdited"
                label="Country"
                fullWidth
                :hide-details="true"
              />
            </KTransition>
          </div>
          <KTextbox
            v-model="description"
            :disabled="!canBeEdited"
            :invalid="description.length < 1"
            invalidText="Description is required"
            textArea
            label="Describe what's new in this submission"
            :maxlength="250"
            style="width: 100%"
            class="description-textbox"
          />
        </div>
      </template>

      <template #bottomNavigation>
        <div class="footer">
          <KButton @click="$emit('close')"> Cancel </KButton>
          <KButton
            primary
            :disabled="!canBeSubmitted"
            @click="onSubmit"
          >
            Submit for review
          </KButton>
        </div>
      </template>
    </SidePanelModal>
  </div>

</template>


<script setup>

  import { computed, getCurrentInstance, ref, watch } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';

  import camelCase from 'lodash/camelCase';

  import LoadingText from './LoadingText';
  import StatusChip from './StatusChip';
  import WarningBox from './WarningBox';
  import { useCommunityLibrarySubmissions } from './composables/useCommunityLibrarySubmissions';
  import { usePublishedData } from './composables/usePublishedData';

  import { translateMetadataString } from 'shared/utils/metadataStringsTranslation';
  import countriesUtil from 'shared/utils/countries';

  import SidePanelModal from 'shared/views/SidePanelModal';
  import CountryField from 'shared/views/form/CountryField';
  import LanguagesMap from 'shared/leUtils/Languages';
  import LicensesMap from 'shared/leUtils/Licenses';
  import { CategoriesLookup } from 'shared/constants';
  import { CommunityLibrarySubmission } from 'shared/data/resources';

  const tokensTheme = themeTokens();
  const paletteTheme = themePalette();

  const { proxy } = getCurrentInstance();
  const store = proxy.$store;

  const emit = defineEmits(['close']);

  const annotationColor = computed(() => tokensTheme.annotation);
  const infoBoxBackgroundColor = computed(() => paletteTheme.grey.v_100);
  const infoSeparatorColor = computed(() => tokensTheme.fineLine);

  const props = defineProps({
    channel: {
      type: Object,
      required: true,
    },
  });

  const showingMoreDetails = ref(false);
  const countries = ref([]);
  const description = ref('');

  const {
    isLoading: submissionsAreLoading,
    isFinished: submissionsAreFinished,
    data: submissionsData,
  } = useCommunityLibrarySubmissions(props.channel.id);

  const latestSubmission = computed(() => {
    if (!submissionsData.value) return undefined;
    if (submissionsData.value.length === 0) return null;

    // Submissions are ordered by most recent first in the backend
    return submissionsData.value[0];
  });

  function countryCodeToName(code) {
    return countriesUtil.getName(code, 'en');
  }

  watch(submissionsAreFinished, newVal => {
    if (newVal && latestSubmission.value) {
      countries.value = latestSubmission.value.countries.map(code => countryCodeToName(code));
    }
  });

  const latestSubmissionStatus = computed(() => {
    if (!submissionsAreFinished.value) return null;
    if (!latestSubmission.value) return 'none';

    switch (latestSubmission.value.status) {
      case 'PENDING':
        return 'submitted';
      case 'APPROVED':
      case 'LIVE':
        return 'approved';
      case 'REJECTED':
        return 'flagged';
      default:
        throw new Error(`Unexpected submission status: ${latestSubmission.value.status}`);
    }
  });

  const infoConfigs = {
    submitted: {
      chipStatus: 'submitted',
      primaryText: 'A previous version is still pending review.',
      secondaryText: 'Reviewers will see the latest submission first.',
    },
    approved: {
      chipStatus: 'approved',
      primaryText: 'A previous version is live in the Community Library.',
      secondaryText: 'Reviewers will see the latest submission first.',
    },
    flagged: {
      chipStatus: 'flagged',
      primaryText:
        'A previous version was flagged for review. Ensure you have fixed all  highlighted issues before submitting.',
      secondaryText: null,
    },
    none: {
      chipStatus: null,
      primaryText: 'Your published channel will be added to the Community Library review queue.',
      secondaryText: null,
    },
  };

  const chipStatus = computed(() =>
    latestSubmissionStatus.value ? infoConfigs[latestSubmissionStatus.value].chipStatus : null,
  );
  const infoBoxPrimaryText = computed(() =>
    latestSubmissionStatus.value ? infoConfigs[latestSubmissionStatus.value].primaryText : null,
  );
  const infoBoxSecondaryText = computed(() =>
    latestSubmissionStatus.value ? infoConfigs[latestSubmissionStatus.value].secondaryText : null,
  );

  const isPublished = computed(() => props.channel.published);
  const isPublic = computed(() => props.channel.public);
  const isCurrentVersionAlreadySubmitted = computed(() => {
    if (!latestSubmission.value) return false;
    return latestSubmission.value.channel_version === props.channel.version;
  });

  const canBeEdited = computed(
    () => isPublished.value && !isPublic.value && !isCurrentVersionAlreadySubmitted.value,
  );

  const canBeSubmitted = computed(
    () => canBeEdited.value && publishedDataIsFinished.value && description.value.length >= 1,
  );

  const {
    isLoading: publishedDataIsLoading,
    isFinished: publishedDataIsFinished,
    data: publishedData,
  } = usePublishedData(props.channel.id);

  const latestPublishedData = computed(() => {
    if (!publishedData.value) return undefined;

    return publishedData.value[props.channel.version];
  });

  const detectedLanguages = computed(() => {
    // We need to filter out null values due to a backend bug
    // causing null values to sometimes be included in the list
    const languageCodes = latestPublishedData.value?.included_languages.filter(
      code => code !== null,
    );
    if (!languageCodes) return undefined;
    if (languageCodes.length === 0) return 'None';

    return languageCodes.map(code => LanguagesMap.get(code).readable_name).join(', ');
  });

  const detectedLicenses = computed(() => {
    if (!latestPublishedData.value?.included_licenses) return undefined;
    if (latestPublishedData.value.included_licenses.length === 0) return 'None';

    return latestPublishedData.value.included_licenses
      .map(licenseId => LicensesMap.get(licenseId).license_name)
      .join(', ');
  });

  function categoryIdToName(categoryId) {
    return translateMetadataString(camelCase(CategoriesLookup[categoryId]));
  }

  const detectedCategories = computed(() => {
    if (!latestPublishedData.value?.included_categories) return undefined;
    if (latestPublishedData.value.included_categories.length === 0) return 'None';

    return latestPublishedData.value.included_categories
      .map(categoryId => categoryIdToName(categoryId))
      .join(', ');
  });

  function showSnackbar(params) {
    return store.dispatch('showSnackbar', params);
  }

  function onSubmit() {
    const submitDelayMs = 5000;

    const timer = setTimeout(() => {
      CommunityLibrarySubmission.create({
        description: description.value,
        channel: props.channel.id,
        countries: countries.value.map(country => countriesUtil.getAlpha2Code(country, 'en')),
        categories: detectedCategories.value,
      })
        .then(() => {
          showSnackbar({ text: 'Channel submitted to Community Library' });
        })
        .catch(() => {
          showSnackbar({ text: 'There was an error submitting the channel' });
        });
    }, submitDelayMs);

    showSnackbar({
      text: 'Submitting channel to Community Library...',
      duration: null,
      actionText: 'Cancel',
      actionCallback: () => {
        clearTimeout(timer);
      },
    });

    emit('close');
  }

</script>


<style scoped lang="scss">

  .side-panel-title {
    margin: 0;
    font-size: 20px;
  }

  .channel-title {
    font-weight: 600;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    line-height: 140%;
  }

  .box {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    border-radius: 4px;
  }

  .info-box {
    min-height: 56px;
    background-color: v-bind('infoBoxBackgroundColor');
  }

  .box-message {
    display: flex;
  }

  .loader-wrapper {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
  }

  .info-box-secondary-text {
    display: block;
  }

  .status-chip {
    justify-self: flex-end;
  }

  .box ::v-deep .icon {
    top: 0;
  }

  .more-details-text {
    padding-top: 8px;
    border-top: 1px solid v-bind('infoSeparatorColor');
  }

  .field-annotation {
    margin-bottom: 8px;
    color: v-bind('annotationColor');
  }

  .country-field {
    width: 100%;
  }

  .country-area {
    display: flex;
    min-height: 64px;
  }

  .footer {
    display: flex;
    gap: 16px;
    justify-content: flex-end;
    width: 100%;
  }

  .description-textbox ::v-deep .textbox {
    max-width: 100%;
  }

</style>
