<template>

  <FullscreenModal
    :value="dialog"
    :header="headerText"
    @input="onDialogInput"
  >
    <template
      v-if="step === 1 && !isNew"
      #header
    >
      <span class="notranslate">{{ title }}</span>
    </template>
    <template
      v-if="step === 2"
      #close
    >
      <VBtn
        icon
        class="rtl-flip"
        @click="step--"
      >
        <Icon
          icon="back"
          :color="$themeTokens.textInverted"
        />
      </VBtn>
    </template>
    <VWindow v-model="step">
      <VWindowItem :value="1">
        <VContainer
          class="mx-0 pt-5"
          data-test="collection-channels-view"
        >
          <VLayout row>
            <VFlex
              md12
              lg10
              xl8
            >
              <VForm ref="channelsetform">
                <VTextField
                  v-model="name"
                  :rules="nameRules"
                  :label="$tr('titleLabel')"
                  maxlength="200"
                  counter
                  box
                  data-test="input-name"
                />
              </VForm>

              <div v-if="channelSet.secret_token">
                <p>{{ $tr('tokenPrompt') }}</p>
                <div class="caption grey--text text--darken-1">
                  {{ $tr('token') }}
                </div>
                <CopyToken
                  :token="channelSet.secret_token"
                  style="max-width: max-content"
                />
              </div>

              <h1 class="font-weight-bold headline mt-4 pt-4">
                {{ $tr('channels') }}
              </h1>
              <p
                v-if="!loadingChannels"
                class="subheading"
              >
                {{ $tr('channelCountText', { channelCount: channels.length }) }}
              </p>

              <!-- Channel list section -->
              <VCardText v-if="loadingChannels">
                <LoadingText />
              </VCardText>
              <div
                v-else
                fluid
              >
                <KButton
                  :text="$tr('selectChannelsHeader')"
                  :primary="true"
                  class="link-btn"
                  data-test="button-select"
                  appearance="raised-button"
                  @click="step++"
                />
                <VCard
                  v-for="channelId in channels"
                  :key="channelId"
                  flat
                >
                  <ChannelItem :channelId="channelId">
                    <VBtn
                      flat
                      class="ma-0"
                      color="primary"
                      @click="removeChannel(channelId)"
                    >
                      {{ $tr('removeText') }}
                    </VBtn>
                  </ChannelItem>
                </VCard>
              </div>
            </VFlex>
          </VLayout>
        </VContainer>
      </VWindowItem>
      <VWindowItem
        :value="2"
        lazy
      >
        <VContainer
          fill-height
          class="mx-0 pt-5"
          data-test="channels-selection-view"
        >
          <VLayout row>
            <VFlex
              md12
              lg10
              xl8
            >
              <h1 class="font-weight-bold headline mb-2">
                {{ $tr('selectChannelsHeader') }}
              </h1>
              <p>{{ $tr('publishedChannelsOnlyText') }}</p>
              <VContainer class="px-0">
                <Tabs
                  showArrows
                  slider-color="primary"
                >
                  <VTab
                    v-for="listType in lists"
                    :key="listType.id"
                  >
                    {{ translateConstant(listType) }}
                  </VTab>
                  <VTabItem
                    v-for="listType in lists"
                    :key="listType.id"
                    lazy
                  >
                    <ChannelSelectionList
                      v-model="channels"
                      :listType="listType"
                    />
                  </VTabItem>
                </Tabs>
              </VContainer>
            </VFlex>
          </VLayout>
        </VContainer>
      </VWindowItem>
    </VWindow>
    <MessageDialog
      v-model="showUnsavedDialog"
      :header="$tr('unsavedChangesHeader')"
      :text="$tr('unsavedChangesText')"
      data-test="dialog-unsaved"
      :data-test-visible="showUnsavedDialog"
    >
      <template #buttons>
        <VSpacer />
        <VBtn
          flat
          @click="confirmCancel"
        >
          {{ $tr('closeButton') }}
        </VBtn>
        <VBtn
          color="primary"
          @click="save"
        >
          {{ $tr('saveButton') }}
        </VBtn>
      </template>
    </MessageDialog>
    <template #bottom>
      <div class="mx-4 subheading">
        {{ $tr('channelSelectedCountText', { channelCount: channels.length }) }}
      </div>
      <VSpacer />
      <div class="save-btn">
        <KButton
          v-if="step === 1"
          :text="saveText"
          :primary="true"
          data-test="button-save"
          appearance="raised-button"
          @click="save"
        />
        <KButton
          v-else
          :text="$tr('finish')"
          :primary="true"
          data-test="button-finish"
          appearance="raised-button"
          @click="finish"
        />
      </div>
      
    </template>
  </FullscreenModal>

</template>


<script>

  import { set } from 'vue';
  import { mapGetters, mapActions } from 'vuex';
  import difference from 'lodash/difference';
  import { RouteNames } from '../../constants';
  import ChannelItem from './ChannelItem';
  import ChannelSelectionList from './ChannelSelectionList';
  import { ChannelListTypes, ErrorTypes } from 'shared/constants';
  import { constantsTranslationMixin, routerMixin } from 'shared/mixins';
  import CopyToken from 'shared/views/CopyToken';
  import MessageDialog from 'shared/views/MessageDialog';
  import FullscreenModal from 'shared/views/FullscreenModal';
  import Tabs from 'shared/views/Tabs';
  import LoadingText from 'shared/views/LoadingText';

  export default {
    name: 'ChannelSetModal',
    components: {
      CopyToken,
      ChannelSelectionList,
      MessageDialog,
      ChannelItem,
      FullscreenModal,
      Tabs,
      LoadingText,
    },
    mixins: [constantsTranslationMixin, routerMixin],
    props: {
      channelSetId: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        dialog: true,
        loadingChannels: true,
        step: 1,
        title: '',
        changed: false,
        showUnsavedDialog: false,
        diffTracker: {},
        saving: false,
      };
    },
    computed: {
      ...mapGetters('channelSet', ['getChannelSet']),
      isNew() {
        return this.$route.path === '/collections/new';
      },
      nameRules() {
        return [name => (name && name.trim().length ? true : this.$tr('titleRequiredText'))];
      },
      name: {
        get() {
          return Object.prototype.hasOwnProperty.call(this.diffTracker, 'name')
            ? this.diffTracker.name
            : this.channelSet.name || '';
        },
        set(name) {
          this.setChannelSet({ name });
          this.changed = true;
        },
      },
      channels: {
        get() {
          return Object.prototype.hasOwnProperty.call(this.diffTracker, 'channels')
            ? this.diffTracker.channels
            : (this.channelSet.channels || []).filter(Boolean);
        },
        set(channels) {
          this.changed = true;
          const snackbar =
            channels.length > this.channels.length
              ? this.$tr('channelAdded')
              : this.$tr('channelRemoved');
          this.$store.dispatch('showSnackbarSimple', snackbar);
          this.setChannelSet({ channels });
        },
      },
      lists() {
        return Object.values(ChannelListTypes).filter(l => l !== 'bookmark');
      },
      channelSet() {
        console.log('channelSet', this.getChannelSet(this.channelSetId));
        return this.getChannelSet(this.channelSetId) || {};
      },
      headerText() {
        return this.step > 1 ? this.$tr('selectChannelsHeader') : this.$tr('creatingChannelSet');
      },
      saveText() {
        return this.isNew ? this.$tr('createButton') : this.$tr('saveButton');
      },
    },
    beforeMount() {
      if (this.channelSetId) {
        return this.verifyChannelSet(this.channelSetId);
      } else {
        this.setup();
      }
    },
    mounted() {
      this.updateTitleForPage();
    },
    methods: {
      ...mapActions('channel', ['loadChannelList']),
      ...mapActions('channelSet', [
        'updateChannelSet',
        'loadChannelSet',
        'commitChannelSet',
        'deleteChannelSet',
        'addChannels',
        'removeChannels',
      ]),
      onDialogInput(value) {
        if (!value) {
          this.cancelChanges();
          return;
        }
        this.dialog = value;
      },
      updateTitleForPage() {
        if (this.isNew) {
          this.updateTabTitle(this.$tr('creatingChannelSet'));
        } else {
          // TODO improve the title, since it omits "collection"
          this.updateTabTitle(this.name);
        }
      },
      saveChannels() {
        const oldChannels = this.channelSet.channels;
        const newChannels = this.diffTracker.channels;
        if (newChannels) {
          const remove = difference(oldChannels, newChannels);
          const add = difference(newChannels, oldChannels);
          const promises = [];
          if (remove.length) {
            promises.push(
              this.removeChannels({ channelSetId: this.channelSetId, channelIds: remove }),
            );
          }
          if (add.length) {
            promises.push(this.addChannels({ channelSetId: this.channelSetId, channelIds: add }));
          }
          return Promise.all(promises);
        }
        return Promise.resolve();
      },
      removeChannel(channelId) {
        this.channels = this.channels.filter(c => c !== channelId);
      },

      loadChannels() {
        if (this.channelSet.channels && this.channelSet.channels.length) {
          this.loadingChannels = true;
          this.loadChannelList({ id__in: this.channelSet.channels }).then(() => {
            this.loadingChannels = false;
          });
        } else {
          this.loadingChannels = false;
        }
      },

      setChannelSet(data) {
        for (const key in data) {
          set(this.diffTracker, key, data[key]);
        }
        this.changed = true;
      },
      setup() {
        this.loadChannels();
        this.title = this.isNew ? this.$tr('creatingChannelSet') : this.channelSet.name;
      },
      save() {
        if (this.saving) {
          return;
        }
        this.saving = true;
        this.showUnsavedDialog = false;

        if (this.$refs.channelsetform.validate()) {
          let promise;

          if (this.isNew) {
            const channelSetData = { ...this.diffTracker };
            promise = this.commitChannelSet(channelSetData)
              .then(newCollection => {
                if (!newCollection || !newCollection.id) {
                  this.saving = false;
                  return;
                }

                const newCollectionId = newCollection.id;

                this.$router.replace({
                  name: 'CHANNEL_SET_DETAILS',
                  params: { channelSetId: newCollectionId },
                });

                return newCollection;
              })
              .catch(() => {
                this.saving = false;
              });
          } else {
            promise = this.saveChannels().then(() => {
              return this.updateChannelSet({ id: this.channelSetId, ...this.diffTracker });
            });
          }

          promise
            .then(() => {
              this.close();
            })
            .finally(() => {
              this.saving = false;
            });
        }
      },

      cancelChanges() {
        if (this.changed) {
          this.showUnsavedDialog = true;
        } else {
          this.confirmCancel();
        }
      },
      confirmCancel() {
        if (this.isNew) {
          if (this.channelSet && this.channelSet.id) {
            return this.deleteChannelSet(this.channelSet).then(this.close);
          } else {
            this.close();
          }
        } else {
          this.close();
        }
      },
      finish() {
        this.step = Math.max(this.step - 1, 1);
      },

      close() {
        this.changed = false;
        this.showUnsavedDialog = false;
        this.diffTracker = {};
        this.$router.push({ name: RouteNames.CHANNEL_SETS });
      },

      verifyChannelSet(channelSetId) {
        return new Promise((resolve, reject) => {
          // Check if we already have the channel locally
          if (this.getChannelSet(channelSetId)) {
            this.setup();
            resolve();
            return;
          }
          // If not, try to load the channel
          this.loadChannelSet(channelSetId).then(channelset => {
            // Did our fetch return any channels, then we have a channel!
            if (channelset) {
              this.setup();
              resolve();
              return;
            }
            // If not, reject!
            this.$store.dispatch('errors/handleGenericError', {
              errorType: ErrorTypes.PAGE_NOT_FOUND,
              errorText: this.$tr('collectionErrorText'),
            });
            reject();
          });
        });
      },
    },

    $trs: {
      creatingChannelSet: 'New collection',
      collectionErrorText: 'This collection does not exist',
      titleLabel: 'Collection name',
      channelCountText:
        '{channelCount, plural, =0 {No published channels in your collection} =1 {# channel} other {# channels}}',
      channelSelectedCountText:
        '{channelCount, plural, =1 {# channel selected} other {# channels selected}}',
      titleRequiredText: 'Field is required',
      publishedChannelsOnlyText: 'Only published channels are available for selection',
      tokenPrompt: 'Copy this token into Kolibri to import this collection onto your device.',
      token: 'Collection token',
      channels: 'Collection channels',
      selectChannelsHeader: 'Select channels',
      saveButton: 'Save and close',
      createButton: 'Create',
      finish: 'Finish',
      [ChannelListTypes.EDITABLE]: 'My Channels',
      [ChannelListTypes.VIEW_ONLY]: 'View-Only',
      [ChannelListTypes.PUBLIC]: 'Public',
      [ChannelListTypes.STARRED]: 'Starred',
      unsavedChangesHeader: 'Unsaved changes',
      unsavedChangesText: 'You will lose any unsaved changes. Are you sure you want to exit?',
      closeButton: 'Exit without saving',
      removeText: 'Remove',
      channelAdded: 'Channel added',
      channelRemoved: 'Channel removed',
    },
  };

</script>


<style lang="scss" scoped>

  .link-btn {
    margin-bottom: 25px;
  }

</style>
