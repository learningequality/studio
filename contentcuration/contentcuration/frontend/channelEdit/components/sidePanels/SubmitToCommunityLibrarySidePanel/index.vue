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
          <div
            v-if="isPublishing"
            class="publishing-loader"
          >
            <KCircularLoader disableDefaultTransition />
            <div class="publishing-text">{{ publishingMessage$() }}</div>
          </div>
          <template v-else>
            <KTransition kind="component-fade-out-in">
              <div
                v-if="latestSubmissionIsLoading"
                class="loader-wrapper"
              >
                <KCircularLoader disableDefaultTransition />
              </div>
              <div
                v-else-if="latestSubmissionIsFinished"
                class="info-section"
              >
                <div class="info-text">
                  <template v-if="latestSubmissionStatus === null">
                    <template v-if="showingMoreDetails">
                      <div>{{ infoText }}</div>
                      <div>{{ moreDetails$() }}</div>
                      <KButton
                        appearance="basic-link"
                        data-test="less-details-button"
                        @click="showingMoreDetails = false"
                      >
                        {{ lessDetailsButton$() }}
                      </KButton>
                    </template>
                    <template v-else>
                      <div>
                        {{ infoText }}
                      </div>
                      <KButton
                        appearance="basic-link"
                        data-test="more-details-button"
                        @click="showingMoreDetails = true"
                      >
                        {{ moreDetailsButton$() }}
                      </KButton>
                    </template>
                  </template>
                  <template v-else>
                    {{ infoText }}
                  </template>
                </div>
                <StatusChip
                  v-if="latestSubmissionStatus"
                  :status="latestSubmissionStatus"
                  class="status-chip"
                />
              </div>
            </KTransition>
            <Box
              v-if="!isPublished"
              kind="warning"
              data-test="not-published-warning"
            >
              <template #title>
                {{ notPublishedWarningTitle$() }}
              </template>
              <template #description>
                {{ notPublishedWarningDescription$() }}
              </template>
            </Box>
            <Box
              v-else-if="isPublic"
              kind="warning"
              data-test="public-warning"
            >
              <template #title>
                {{ publicWarningTitle$() }}
              </template>
              <template #description>
                {{ publicWarningDescription$() }}
              </template>
            </Box>
            <Box
              v-else-if="isCurrentVersionAlreadySubmitted"
              kind="warning"
              data-test="already-submitted-warning"
            >
              <template #title>
                {{ alreadySubmittedWarningTitle$() }}
              </template>
              <template #description>
                {{ alreadySubmittedWarningDescription$() }}
              </template>
            </Box>
            <div class="channel-title">
              {{
                channelVersion$({
                  name: channel ? channel.name : '',
                  version: displayedVersion,
                })
              }}
            </div>
            <div class="metadata-section">
              <div
                v-if="detectedLanguages"
                class="metadata-line"
              >
                <LoadingText
                  :loading="publishedDataIsLoading"
                  :finishedLoading="publishedDataIsFinished"
                  :omitted="!detectedLanguages"
                >
                  {{ detectedLanguages }}
                </LoadingText>
              </div>
              <div
                v-if="detectedCategories"
                class="metadata-line"
              >
                <LoadingText
                  :loading="publishedDataIsLoading"
                  :finishedLoading="publishedDataIsFinished"
                  :omitted="!detectedCategories"
                >
                  {{ detectedCategories }}
                </LoadingText>
              </div>
            </div>
            <div
              v-if="publishedDataIsLoading"
              class="license-audit-loader"
            >
              <KCircularLoader disableDefaultTransition />
              <div class="audit-text-wrapper">
                <div class="audit-text-primary">
                  {{ checkingChannelCompatibility$() }}
                </div>
                <div class="audit-text-secondary">
                  {{ checkingChannelCompatibilitySecondary$() }}
                </div>
              </div>
            </div>
            <InvalidLicensesNotice
              v-if="publishedDataIsFinished && invalidLicenses.length"
              :invalid-licenses="invalidLicenses"
            />
            <CompatibleLicensesNotice
              v-else-if="publishedDataIsFinished"
              :licenses="includedLicenses"
            />
            <SpecialPermissionsList
              v-if="publishedDataIsFinished && channelVersionId"
              v-model="checkedSpecialPermissions"
              :channel-version-id="channelVersionId"
              @update:allChecked="allSpecialPermissionsChecked = $event"
            />
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
            <KCheckbox
              v-if="needsReplacementConfirmation"
              :checked="replacementConfirmed"
              :label="confirmReplacementText$()"
              data-test="replacement-confirmation-checkbox"
              class="replacement-checkbox"
              @change="onReplacementChange"
            />
          </template>
        </div>
      </template>

      <template #bottomNavigation>
        <div
          v-if="!isPublishing"
          class="footer"
        >
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

  import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue';
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';

  import camelCase from 'lodash/camelCase';

  import Box from './Box';
  import LoadingText from './LoadingText';
  import StatusChip from './StatusChip';
  import { useLatestCommunityLibrarySubmission } from './composables/useLatestCommunityLibrarySubmission';
  import { usePublishedData } from './composables/usePublishedData';

  import InvalidLicensesNotice from './licenseCheck/InvalidLicensesNotice.vue';
  import CompatibleLicensesNotice from './licenseCheck/CompatibleLicensesNotice.vue';
  import SpecialPermissionsList from './licenseCheck/SpecialPermissionsList.vue';
  import { translateMetadataString } from 'shared/utils/metadataStringsTranslation';
  import countriesUtil from 'shared/utils/countries';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { CommunityLibrarySubmission } from 'shared/data/resources';

  import SidePanelModal from 'shared/views/SidePanelModal';
  import CountryField from 'shared/views/form/CountryField';
  import LanguagesMap from 'shared/leUtils/Languages';
  import { CategoriesLookup, CommunityLibraryStatus } from 'shared/constants';

  export default {
    name: 'SubmitToCommunityLibrarySidePanel',
    components: {
      SidePanelModal,
      Box,
      LoadingText,
      StatusChip,
      CountryField,
      InvalidLicensesNotice,
      CompatibleLicensesNotice,
      SpecialPermissionsList,
    },
    emits: ['close'],
    setup(props, { emit }) {
      const tokensTheme = themeTokens();
      const paletteTheme = themePalette();

      const { proxy } = getCurrentInstance();
      const store = proxy.$store;

      // Destructure translation functions from communityChannelsStrings
      const {
        submitToCommunityLibrary$,
        moreDetails$,
        moreDetailsButton$,
        lessDetailsButton$,
        countryLabel$,
        descriptionLabel$,
        descriptionRequired$,
        notPublishedWarningTitle$,
        notPublishedWarningDescription$,
        publicWarningTitle$,
        publicWarningDescription$,
        alreadySubmittedWarningTitle$,
        alreadySubmittedWarningDescription$,
        submitButton$,
        cancelAction$,
        submittedPrimaryInfo$,
        approvedPrimaryInfo$,
        flaggedPrimaryInfo$,
        nonePrimaryInfo$,
        channelVersion$,
        submittedSnackbar$,
        errorSnackbar$,
        submittingSnackbar$,
        publishingMessage$,
        confirmReplacementText$,
        checkingChannelCompatibility$,
        checkingChannelCompatibilitySecondary$,
      } = communityChannelsStrings;

      const annotationColor = computed(() => tokensTheme.annotation);
      const infoTextColor = computed(() => paletteTheme.grey.v_700);

      const showingMoreDetails = ref(false);
      const countries = ref([]);
      const description = ref('');
      const isPublishing = computed(() => props.channel?.publishing === true);
      const currentChannelVersion = computed(() => props.channel?.version);
      const replacementConfirmed = ref(false);
      const checkedSpecialPermissions = ref([]);

      const {
        isLoading: latestSubmissionIsLoading,
        isFinished: latestSubmissionIsFinished,
        data: latestSubmissionData,
        fetchData: fetchLatestSubmission,
      } = useLatestCommunityLibrarySubmission(props.channel.id);

      function countryCodeToName(code) {
        return countriesUtil.getName(code, 'en');
      }

      watch(latestSubmissionIsFinished, newVal => {
        if (newVal && latestSubmissionData.value?.countries) {
          countries.value = latestSubmissionData.value.countries.map(code =>
            countryCodeToName(code),
          );
        }
      });

      const latestSubmissionStatus = computed(() => {
        // We distinguish here between "not loaded yet" (undefined)
        // and "loaded and none present" (null). This distinction is
        // not used in the UI and is mostly intended to convey the
        // state more accurately to the developer in case of debugging.
        // UI code should rely on XXXIsLoading and XXXIsFinished instead.
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
            };
          case CommunityLibraryStatus.APPROVED:
            return {
              primaryText: approvedPrimaryInfo$(),
            };
          case CommunityLibraryStatus.REJECTED:
            return {
              primaryText: flaggedPrimaryInfo$(),
            };
          case null:
            return {
              primaryText: nonePrimaryInfo$(),
            };
          default:
            return undefined;
        }
      });

      const infoText = computed(() => infoConfig.value?.primaryText);

      const isPublished = computed(() => props.channel?.published);
      const isPublic = computed(() => props.channel?.public);
      const isCurrentVersionAlreadySubmitted = computed(() => {
        if (!latestSubmissionData.value) return false;
        return latestSubmissionData.value.channel_version === currentChannelVersion.value;
      });

      const canBeEdited = computed(() => {
        if (isPublishing.value) return false;
        if (isCurrentVersionAlreadySubmitted.value) {
          return false;
        }
        return isPublished.value && !isPublic.value;
      });

      const needsReplacementConfirmation = computed(() => {
        if (isPublic.value) {
          return false;
        }
        // Only show checkbox if there's a pending submission AND the version has changed
        return (
          latestSubmissionStatus.value === CommunityLibraryStatus.PENDING &&
          !isCurrentVersionAlreadySubmitted.value
        );
      });

      const {
        isLoading: publishedDataIsLoading,
        isFinished: publishedDataIsFinished,
        data: versionDetail,
        fetchData: fetchPublishedData,
      } = usePublishedData(props.channel.id);

      // Use the latest version available from either channel or versionDetail
      const displayedVersion = computed(() => {
        const channelVersion = currentChannelVersion.value || 0;
        if (versionDetail.value && versionDetail.value.version) {
          return Math.max(channelVersion, versionDetail.value.version);
        }
        return channelVersion;
      });

      const channelVersionId = computed(() => {
        return versionDetail.value?.id;
      });

      const invalidLicenses = computed(() => {
        return versionDetail.value?.non_distributable_licenses_included || [];
      });

      const includedLicenses = computed(() => {
        return versionDetail.value?.included_licenses || [];
      });

      const allSpecialPermissionsChecked = ref(true);

      const hasInvalidLicenses = computed(() => {
        return invalidLicenses.value && invalidLicenses.value.length > 0;
      });

      const canBeSubmitted = computed(() => {
        const conditions = [
          allSpecialPermissionsChecked.value,
          !isPublishing.value,
          !hasInvalidLicenses.value,
          publishedDataIsFinished.value,
          canBeEdited.value,
          publishedDataIsFinished.value,
          description.value.length >= 1,
        ];

        if (needsReplacementConfirmation.value) {
          conditions.push(replacementConfirmed.value);
        }

        return conditions.every(condition => condition);
      });

      // Watch for when publishing completes - fetch publishedData to get the new version's data
      watch(isPublishing, async (newIsPublishing, oldIsPublishing) => {
        if (oldIsPublishing === true && newIsPublishing === false) {
          await fetchPublishedData();
        }
      });

      onMounted(async () => {
        await fetchLatestSubmission();

        if (!isPublishing.value) {
          await fetchPublishedData();
        }
      });

      const detectedLanguages = computed(() => {
        const languageCodes = versionDetail.value?.included_languages;

        // We distinguish here between "not loaded yet" (undefined)
        // and "loaded and none present" (null). This distinction is
        // not used in the UI and is mostly intended to convey the
        // state more accurately to the developer in case of debugging.
        // UI code should rely on XXXIsLoading and XXXIsFinished instead.
        if (!languageCodes) return undefined;
        if (languageCodes.length === 0) return null;

        return languageCodes.map(code => LanguagesMap.get(code)?.readable_name || code).join(', ');
      });

      function categoryIdToName(categoryId) {
        return translateMetadataString(camelCase(CategoriesLookup[categoryId]));
      }

      const detectedCategories = computed(() => {
        // We distinguish here between "not loaded yet" (undefined)
        // and "loaded and none present" (null). This distinction is
        // not used in the UI and is mostly intended to convey the
        // state more accurately to the developer in case of debugging.
        // UI code should rely on XXXIsLoading and XXXIsFinished instead.
        if (!versionDetail.value?.included_categories) return undefined;
        if (versionDetail.value.included_categories.length === 0) return null;

        return versionDetail.value.included_categories
          .map(categoryId => categoryIdToName(categoryId))
          .join(', ');
      });

      function showSnackbar(params) {
        return store.dispatch('showSnackbar', params);
      }

      function onReplacementChange(value) {
        replacementConfirmed.value = value;
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
            categories: versionDetail.value.included_categories,
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
        infoTextColor,
        showingMoreDetails,
        countries,
        description,
        replacementConfirmed,
        onReplacementChange,
        latestSubmissionIsLoading,
        latestSubmissionIsFinished,
        latestSubmissionStatus,
        needsReplacementConfirmation,
        infoText,
        isPublished,
        isPublic,
        isCurrentVersionAlreadySubmitted,
        canBeEdited,
        displayedVersion,
        channelVersionId,
        canBeSubmitted,
        publishedDataIsLoading,
        publishedDataIsFinished,
        detectedLanguages,
        detectedCategories,
        invalidLicenses,
        includedLicenses,
        onSubmit,
        // Translation functions
        submitToCommunityLibrary$,
        moreDetails$,
        moreDetailsButton$,
        lessDetailsButton$,
        countryLabel$,
        descriptionLabel$,
        descriptionRequired$,
        channelVersion$,
        notPublishedWarningTitle$,
        notPublishedWarningDescription$,
        publicWarningTitle$,
        publicWarningDescription$,
        alreadySubmittedWarningTitle$,
        alreadySubmittedWarningDescription$,
        submitButton$,
        cancelAction$,
        isPublishing,
        publishingMessage$,
        confirmReplacementText$,
        checkingChannelCompatibility$,
        checkingChannelCompatibilitySecondary$,
        checkedSpecialPermissions,
        allSpecialPermissionsChecked,
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
    padding-left: 16px;
    margin: 0;
    font-size: 20px;
  }

  ::v-deep .side-panel-header {
    border: 0 !important;
  }

  .channel-title {
    font-size: 18px;
    font-weight: 600;
  }

  .metadata-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .metadata-line {
    font-size: 14px;
    color: v-bind('annotationColor');
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: -24px;
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

  .publishing-loader {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 48px 0;
  }

  .publishing-text {
    font-size: 14px;
    color: v-bind('infoTextColor');
  }

  .license-audit-loader {
    display: flex;
    flex-direction: row;
    gap: 12px;
    align-items: flex-start;
    width: 100%;
    padding: 16px 0;
  }

  .audit-text-wrapper {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;
  }

  .audit-text-primary {
    font-size: 14px;
    line-height: 140%;
    color: v-bind('infoTextColor');
  }

  .audit-text-secondary {
    font-size: 14px;
    line-height: 140%;
    color: v-bind('infoTextColor');
    opacity: 0.7;
  }

  .info-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-text {
    font-size: 14px;
    color: v-bind('infoTextColor');
  }

  .status-chip {
    align-self: flex-start;
    margin-top: 8px;
  }

  .replacement-checkbox {
    margin-top: 8px;
  }

</style>
