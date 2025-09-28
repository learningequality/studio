<template>

  <div id="submit-to-community-library-side-panel-root">
    <SidePanelModal
      alignment="right"
      sidePanelWidth="700px"
      @closePanel="$emit('close')"
    >
      <template #header>
        <h1 class="side-panel-title">{{ submitToCommunityLibrary$() }}</h1>
      </template>

      <template #default>
        <div class="content">
          <Box
            kind="info"
            :loading="latestSubmissionIsLoading"
            class="info-box"
          >
            <div
              key="box-message"
              class="box-message"
            >
              {{ infoBoxPrimaryText }}
              <div v-if="infoBoxSecondaryText">
                {{ infoBoxSecondaryText }}
              </div>
              <template v-if="latestSubmissionIsFinished && latestSubmissionStatus === null">
                <div
                  v-if="showingMoreDetails"
                  class="more-details-text"
                >
                  {{ moreDetails$() }}
                </div>
                <KButton
                  v-if="!showingMoreDetails"
                  appearance="basic-link"
                  :text="moreDetailsButton$()"
                  data-test="more-details-button"
                  @click="showingMoreDetails = !showingMoreDetails"
                />
                <KButton
                  v-else
                  appearance="basic-link"
                  :text="lessDetailsButton$()"
                  data-test="less-details-button"
                  @click="showingMoreDetails = !showingMoreDetails"
                />
              </template>
            </div>
            <template #chip>
              <StatusChip
                v-if="latestSubmissionStatus"
                :status="latestSubmissionStatus"
              />
            </template>
          </Box>
          <Box
            v-if="!isPublished"
            kind="warning"
            data-test="not-published-warning"
          >
            {{ notPublishedWarning$() }}
          </Box>
          <Box
            v-else-if="isPublic"
            kind="warning"
            data-test="public-warning"
          >
            {{ publicWarning$() }}
          </Box>
          <Box
            v-else-if="isCurrentVersionAlreadySubmitted"
            kind="warning"
            data-test="already-submitted-warning"
          >
            {{ alreadySubmittedWarning$() }}
          </Box>
          <div class="channel-title">{{ channel.name }}</div>
          <div>
            <div class="field-annotation">{{ languagesDetected$() }}</div>
            <LoadingText
              :loading="publishedDataIsLoading"
              :finishedLoading="publishedDataIsFinished"
              :omitted="!detectedLanguages"
            >
              {{ detectedLanguages }}
            </LoadingText>
          </div>
          <div>
            <div class="field-annotation">{{ licensesDetected$() }}</div>
            <LoadingText
              :loading="publishedDataIsLoading"
              :finishedLoading="publishedDataIsFinished"
              :omitted="!detectedLicenses"
            >
              {{ detectedLicenses }}
            </LoadingText>
          </div>
          <div>
            <div class="field-annotation">{{ categoriesDetected$() }}</div>
            <LoadingText
              :loading="publishedDataIsLoading"
              :finishedLoading="publishedDataIsFinished"
              :omitted="!detectedCategories"
            >
              {{ detectedCategories }}
            </LoadingText>
          </div>
          <div class="country-area">
            <KTransition kind="component-fade-out-in">
              <div
                v-if="latestSubmissionIsLoading"
                class="loader-wrapper"
              >
                <KCircularLoader disableDefaultTransition />
              </div>
              <CountryField
                v-else-if="latestSubmissionIsFinished"
                v-model="countries"
                class="country-field"
                :disabled="!canBeEdited"
                :label="countryLabel$()"
                fullWidth
                :hide-details="true"
              />
            </KTransition>
          </div>
          <KTextbox
            v-model="description"
            :disabled="!canBeEdited"
            :invalid="description.length < 1"
            :invalidText="descriptionRequired$()"
            textArea
            :label="descriptionLabel$()"
            :maxlength="250"
            style="width: 100%"
            class="description-textbox"
          />
        </div>
      </template>

      <template #bottomNavigation>
        <div class="footer">
          <KButton
            data-test="cancel-button"
            @click="$emit('close')"
          >
            {{ cancelAction$() }}
          </KButton>
          <KButton
            primary
            :disabled="!canBeSubmitted"
            data-test="submit-button"
            @click="onSubmit"
          >
            {{ submitButton$() }}
          </KButton>
        </div>
      </template>
    </SidePanelModal>
  </div>

</template>


<script>

  import { computed, getCurrentInstance, ref, watch } from 'vue';
  import { themeTokens } from 'kolibri-design-system/lib/styles/theme';

  import camelCase from 'lodash/camelCase';

  import Box from './Box';
  import LoadingText from './LoadingText';
  import StatusChip from './StatusChip';
  import { useLatestCommunityLibrarySubmission } from './composables/useLatestCommunityLibrarySubmission';
  import { usePublishedData } from './composables/usePublishedData';

  import { translateMetadataString } from 'shared/utils/metadataStringsTranslation';
  import countriesUtil from 'shared/utils/countries';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';

  import SidePanelModal from 'shared/views/SidePanelModal';
  import CountryField from 'shared/views/form/CountryField';
  import LanguagesMap from 'shared/leUtils/Languages';
  import LicensesMap from 'shared/leUtils/Licenses';
  import { CategoriesLookup, CommunityLibraryStatus } from 'shared/constants';
  import { CommunityLibrarySubmission } from 'shared/data/resources';

  export default {
    name: 'SubmitToCommunityLibrarySidePanel',
    components: {
      SidePanelModal,
      Box,
      LoadingText,
      StatusChip,
      CountryField,
    },
    emits: ['close'],
    setup(props, { emit }) {
      const tokensTheme = themeTokens();

      const { proxy } = getCurrentInstance();
      const store = proxy.$store;

      // Destructure translation functions from communityChannelsStrings
      const {
        submitToCommunityLibrary$,
        moreDetails$,
        moreDetailsButton$,
        lessDetailsButton$,
        languagesDetected$,
        licensesDetected$,
        categoriesDetected$,
        countryLabel$,
        descriptionLabel$,
        descriptionRequired$,
        notPublishedWarning$,
        publicWarning$,
        alreadySubmittedWarning$,
        submitButton$,
        cancelAction$,
        submittedPrimaryInfo$,
        reviewersWillSeeLatestFirst$,
        approvedPrimaryInfo$,
        flaggedPrimaryInfo$,
        nonePrimaryInfo$,
        submittedSnackbar$,
        errorSnackbar$,
        submittingSnackbar$,
      } = communityChannelsStrings;

      const annotationColor = computed(() => tokensTheme.annotation);
      const infoSeparatorColor = computed(() => tokensTheme.fineLine);

      const showingMoreDetails = ref(false);
      const countries = ref([]);
      const description = ref('');

      const {
        isLoading: latestSubmissionIsLoading,
        isFinished: latestSubmissionIsFinished,
        data: latestSubmissionData,
      } = useLatestCommunityLibrarySubmission(props.channel.id);

      function countryCodeToName(code) {
        return countriesUtil.getName(code, 'en');
      }

      watch(latestSubmissionIsFinished, newVal => {
        if (newVal && latestSubmissionData.value) {
          countries.value = latestSubmissionData.value.countries.map(code =>
            countryCodeToName(code),
          );
        }
      });

      const latestSubmissionStatus = computed(() => {
        if (!latestSubmissionIsFinished.value) return undefined;
        if (!latestSubmissionData.value) return null;

        // We do not need to distinguish LIVE from APPROVED in the UI
        const uiSubmissionStatus =
          latestSubmissionData.value.status == CommunityLibraryStatus.LIVE
            ? CommunityLibraryStatus.APPROVED
            : latestSubmissionData.value.status;

        return uiSubmissionStatus;
      });

      const infoConfig = computed(() => {
        if (!latestSubmissionIsFinished.value) return undefined;

        switch (latestSubmissionStatus.value) {
          case CommunityLibraryStatus.PENDING:
            return {
              primaryText: submittedPrimaryInfo$(),
              secondaryText: reviewersWillSeeLatestFirst$(),
            };
          case CommunityLibraryStatus.APPROVED:
            return {
              primaryText: approvedPrimaryInfo$(),
              secondaryText: reviewersWillSeeLatestFirst$(),
            };
          case CommunityLibraryStatus.REJECTED:
            return {
              primaryText: flaggedPrimaryInfo$(),
              secondaryText: null,
            };
          case null:
            return {
              primaryText: nonePrimaryInfo$(),
              secondaryText: null,
            };
          default:
            return undefined;
        }
      });

      const infoBoxPrimaryText = computed(() => infoConfig.value?.primaryText);
      const infoBoxSecondaryText = computed(() => infoConfig.value?.secondaryText);

      const isPublished = computed(() => props.channel.published);
      const isPublic = computed(() => props.channel.public);
      const isCurrentVersionAlreadySubmitted = computed(() => {
        if (!latestSubmissionData.value) return false;
        return latestSubmissionData.value.channel_version === props.channel.version;
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
        if (languageCodes.length === 0) return null;

        return languageCodes.map(code => LanguagesMap.get(code).readable_name).join(', ');
      });

      const detectedLicenses = computed(() => {
        if (!latestPublishedData.value?.included_licenses) return undefined;
        if (latestPublishedData.value.included_licenses.length === 0) return null;

        return latestPublishedData.value.included_licenses
          .map(licenseId => LicensesMap.get(licenseId).license_name)
          .join(', ');
      });

      function categoryIdToName(categoryId) {
        return translateMetadataString(camelCase(CategoriesLookup[categoryId]));
      }

      const detectedCategories = computed(() => {
        if (!latestPublishedData.value?.included_categories) return undefined;
        if (latestPublishedData.value.included_categories.length === 0) return null;

        return latestPublishedData.value.included_categories
          .map(categoryId => categoryIdToName(categoryId))
          .join(', ');
      });

      function showSnackbar(params) {
        return store.dispatch('showSnackbar', params);
      }

      function onSubmit() {
        // It should be possible to undo a submission within a short time window
        // in case the user made a mistake and wants to change something.
        // To avoid having to deal with undoing logic, we simply show a "submitting"
        // snackbar for a few seconds with a cancel option, and only submit
        // if the user doesn't cancel within that time window.
        const submitDelayMs = 5000;

        const timer = setTimeout(() => {
          CommunityLibrarySubmission.create({
            description: description.value,
            channel: props.channel.id,
            countries: countries.value.map(country => countriesUtil.getAlpha2Code(country, 'en')),
            categories: latestPublishedData.value.included_categories,
          })
            .then(() => {
              showSnackbar({ text: submittedSnackbar$() });
            })
            .catch(() => {
              showSnackbar({ text: errorSnackbar$() });
            });
        }, submitDelayMs);

        showSnackbar({
          text: submittingSnackbar$(),
          duration: null,
          actionText: cancelAction$(),
          actionCallback: () => {
            clearTimeout(timer);
          },
        });

        emit('close');
      }

      return {
        annotationColor,
        infoSeparatorColor,
        showingMoreDetails,
        countries,
        description,
        latestSubmissionIsLoading,
        latestSubmissionIsFinished,
        latestSubmissionStatus,
        infoBoxPrimaryText,
        infoBoxSecondaryText,
        isPublished,
        isPublic,
        isCurrentVersionAlreadySubmitted,
        canBeEdited,
        canBeSubmitted,
        publishedDataIsLoading,
        publishedDataIsFinished,
        detectedLanguages,
        detectedLicenses,
        detectedCategories,
        onSubmit,
        // Translation functions
        submitToCommunityLibrary$,
        moreDetails$,
        moreDetailsButton$,
        lessDetailsButton$,
        languagesDetected$,
        licensesDetected$,
        categoriesDetected$,
        countryLabel$,
        descriptionLabel$,
        descriptionRequired$,
        notPublishedWarning$,
        publicWarning$,
        alreadySubmittedWarning$,
        submitButton$,
        cancelAction$,
      };
    },
    props: {
      channel: {
        type: Object,
        required: true,
      },
    },
  };

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

  .box-message {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .info-box {
    min-height: 4em;
  }

  .loader-wrapper {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
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
