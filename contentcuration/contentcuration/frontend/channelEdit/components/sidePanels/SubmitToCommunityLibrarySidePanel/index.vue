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
                name: currentChannel ? currentChannel.name : '',
                version: currentChannel ? currentChannel.version : 0,
              })
            }}
          </div>
          <div class="metadata-line">
            <LoadingText
              :loading="publishedDataIsLoading"
              :finishedLoading="publishedDataIsFinished"
              :omitted="!detectedLanguages"
            >
              {{ detectedLanguages }}
            </LoadingText>
          </div>
          <div class="metadata-line">
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
          <KCheckbox
            v-if="needsReplacementConfirmation"
            :checked="replacementConfirmed"
            :label="confirmReplacementText$()"
            data-test="replacement-confirmation-checkbox"
            class="replacement-checkbox"
            @change="onReplacementChange"
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
  import { themeTokens, themePalette } from 'kolibri-design-system/lib/styles/theme';

  import camelCase from 'lodash/camelCase';

  import Box from './Box';
  import LoadingText from './LoadingText';
  import StatusChip from './StatusChip';
  import { useLatestCommunityLibrarySubmission } from './composables/useLatestCommunityLibrarySubmission';
  import { usePublishedData } from './composables/usePublishedData';

  import { translateMetadataString } from 'shared/utils/metadataStringsTranslation';
  import countriesUtil from 'shared/utils/countries';
  import { communityChannelsStrings } from 'shared/strings/communityChannelsStrings';
  import { Channel, CommunityLibrarySubmission } from 'shared/data/resources';

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
    },
    emits: ['close'],
    setup(props, { emit }) {
      const tokensTheme = themeTokens();
      const paletteTheme = themePalette();

      const { proxy } = getCurrentInstance();
      const store = proxy.$store;

      // Get currentChannel from store reactively - this will update when store changes
      const currentChannel = computed(() => store.getters['currentChannel/currentChannel']);

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
        confirmReplacementText$,
      } = communityChannelsStrings;

      const annotationColor = computed(() => tokensTheme.annotation);
      const infoTextColor = computed(() => paletteTheme.grey.v_700);

      const showingMoreDetails = ref(false);
      const countries = ref([]);
      const description = ref('');
      const replacementConfirmed = ref(false);

      const {
        isLoading: latestSubmissionIsLoading,
        isFinished: latestSubmissionIsFinished,
        data: latestSubmissionData,
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

      const isPublished = computed(() => currentChannel.value?.published);
      const isPublic = computed(() => currentChannel.value?.public);
      const isCurrentVersionAlreadySubmitted = computed(() => {
        if (!latestSubmissionData.value) return false;
        return latestSubmissionData.value.channel_version === currentChannel.value?.version;
      });

      const canBeEdited = computed(() => {
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

      const canBeSubmitted = computed(() => {
        const baseCondition =
          canBeEdited.value && publishedDataIsFinished.value && description.value.length >= 1;

        if (needsReplacementConfirmation.value) {
          return baseCondition && replacementConfirmed.value;
        }

        return baseCondition;
      });

      const {
        isLoading: publishedDataIsLoading,
        isFinished: publishedDataIsFinished,
        data: publishedData,
      } = usePublishedData(props.channel.id);

      // Watch for when publishing completes and reload channel from backend
      watch(
        () => currentChannel.value?.publishing,
        async (isPublishing, wasPublishing) => {
          if (wasPublishing === true && isPublishing === false && props.channel.id) {
            await Channel.fetchModel(props.channel.id);
            await store.dispatch('channel/loadChannel', props.channel.id);
          }
        },
      );

      const latestPublishedData = computed(() => {
        if (!publishedData.value) return undefined;

        return publishedData.value[currentChannel.value?.version];
      });

      const detectedLanguages = computed(() => {
        // We need to filter out null values due to a backend bug
        // causing null values to sometimes be included in the list
        const languageCodes = latestPublishedData.value?.included_languages.filter(
          code => code !== null,
        );

        // We distinguish here between "not loaded yet" (undefined)
        // and "loaded and none present" (null). This distinction is
        // not used in the UI and is mostly intended to convey the
        // state more accurately to the developer in case of debugging.
        // UI code should rely on XXXIsLoading and XXXIsFinished instead.
        if (!languageCodes) return undefined;
        if (languageCodes.length === 0) return null;

        return languageCodes.map(code => LanguagesMap.get(code).readable_name).join(', ');
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
        if (!latestPublishedData.value?.included_categories) return undefined;
        if (latestPublishedData.value.included_categories.length === 0) return null;

        return latestPublishedData.value.included_categories
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
        currentChannel,
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
        canBeSubmitted,
        publishedDataIsLoading,
        publishedDataIsFinished,
        detectedLanguages,
        detectedCategories,
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
        confirmReplacementText$,
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
