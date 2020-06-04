<template>

  <VDialog
    ref="dialog"
    :value="$route.params.channelSetId == channelSetId"
    attach="body"
    fullscreen
    scrollable
    transition="dialog-bottom-transition"
  >
    <VCard style="overflow-y: auto;">
      <VWindow v-model="step">
        <VWindowItem :value="1">
          <VToolbar card prominent dark color="primary">
            <VBtn icon data-test="close" @click="cancelChanges">
              <Icon>clear</Icon>
            </VBtn>
            <MessageDialog
              v-model="showUnsavedDialog"
              :header="$tr('unsavedChangesHeader')"
              :text="$tr('unsavedChangesText')"
            >
              <template #buttons="{close}">
                <VSpacer />
                <VBtn flat data-test="confirm-cancel" @click="confirmCancel">
                  {{ $tr('closeButton') }}
                </VBtn>
                <VBtn color="primary" @click="save">
                  {{ $tr('saveButton') }}
                </VBtn>
              </template>
            </MessageDialog>
            <VToolbarTitle>
              {{ headerText }}
            </VToolbarTitle>
            <VSpacer />
            <VBtn flat data-test="save" @click="save">
              {{ saveText }}
            </VBtn>
          </VToolbar>
          <VContainer>
            <VLayout row justify-center>
              <VFlex md12 lg10 xl8>
                <VForm ref="channelsetform">
                  <VTextField
                    v-model="name"
                    :rules="[nameValid]"
                    :label="$tr('titleLabel')"
                    maxlength="200"
                    counter
                    outline
                  />
                </VForm>

                <div v-if="channelSet.secret_token">
                  <p>{{ $tr('tokenPrompt') }}</p>
                  <div class="caption grey--text text--darken-1">
                    {{ $tr('token') }}
                  </div>
                  <CopyToken
                    :token="channelSet.secret_token"
                    style="max-width: max-content;"
                  />
                </div>

                <h1 class="headline mt-4 font-weight-bold">
                  {{ $tr('channels') }}
                </h1>
                <p class="subheading">
                  {{ $tr('channelCountText', {'channelCount': channels.length}) }}
                </p>

                <!-- Channel list section -->
                <VCardText v-if="loadingChannels">
                  {{ $tr('loading') }}
                </VCardText>
                <div v-else fluid>
                  <VBtn color="primary" data-test="select" @click="step ++">
                    {{ $tr('selectChannelsHeader') }}
                  </VBtn>
                  <VCard v-for="channelId in channels" :key="channelId" flat>
                    <ChannelItem :channelId="channelId">
                      <VBtn
                        flat
                        class="ma-0"
                        color="primary"
                        data-test="remove"
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
        <VWindowItem :value="2" lazy>
          <VToolbar card prominent dark color="primary" class="notranslate">
            <VBtn icon @click="step --">
              <VIcon class="notranslate">
                arrow_back
              </VIcon>
            </VBtn>
            <VToolbarTitle>
              {{ $tr('selectChannelsHeader') }}
            </VToolbarTitle>
          </VToolbar>
          <VContainer fill-height>
            <VLayout row justify-center>
              <VFlex md12 lg10 xl8>
                <h1 class="headline font-weight-bold mb-2">
                  {{ $tr('selectChannelsHeader') }}
                </h1>
                <p>{{ $tr('publishedChannelsOnlyText') }}</p>
                <VContainer>
                  <VTabs showArrows slider-color="primary">
                    <VTab
                      v-for="listType in lists"
                      :key="listType.id"
                    >
                      {{ $tr(listType) }}
                    </VTab>
                    <VTabItem
                      v-for="listType in lists"
                      :key="listType.id"
                      lazy
                    >
                      <ChannelSelectionList v-model="channels" :listType="listType" />
                    </VTabItem>
                  </VTabs>
                </VContainer>
              </VFlex>
            </VLayout>
          </VContainer>
          <BottomToolBar color="white" flat>
            <VSpacer />
            <div class="subheading mx-4">
              {{ $tr('channelSelectedCountText', {'channelCount': channels.length}) }}
            </div>
            <VBtn
              color="primary"
              data-test="finish"
              @click="step --"
            >
              {{ $tr('finish') }}
            </VBtn>
          </BottomToolBar>
        </VWindowItem>
      </VWindow>
    </VCard>
  </VDialog>

</template>


<script>

  import { mapGetters, mapActions, mapMutations } from 'vuex';
  import { RouterNames, ListTypes } from '../../constants';
  import ChannelSelectionList from './ChannelSelectionList';
  import ChannelItem from './ChannelItem';
  import { ChangeTracker } from 'shared/data/changes';
  import CopyToken from 'shared/views/CopyToken';
  import BottomToolBar from 'shared/views/BottomToolBar';
  import MessageDialog from 'shared/views/MessageDialog';

  export default {
    name: 'ChannelSetModal',
    components: {
      CopyToken,
      ChannelSelectionList,
      BottomToolBar,
      MessageDialog,
      ChannelItem,
    },
    props: {
      channelSetId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        loadingChannels: true,
        step: 1,
        title: '',
        changed: false,
        tracker: null,
        showUnsavedDialog: false,
      };
    },
    computed: {
      ...mapGetters('channelSet', ['getChannelSet']),
      name: {
        get() {
          return this.channelSet.name || '';
        },
        set(name) {
          this.updateChannelSet({ id: this.channelSetId, name });
          this.changed = true;
        },
      },
      channels: {
        get() {
          return (this.channelSet.channels || []).filter(Boolean);
        },
        set(channels) {
          this.changed = true;
          this.updateChannelSet({ id: this.channelSetId, channels });
        },
      },
      lists() {
        return Object.values(ListTypes).filter(l => l !== 'bookmark');
      },
      channelSet() {
        return this.getChannelSet(this.channelSetId) || {};
      },
      headerText() {
        return this.channelSet.isNew ? this.$tr('creatingChannelSet') : this.title;
      },
      saveText() {
        return this.channelSet.isNew ? this.$tr('createButton') : this.$tr('saveButton');
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        const channelSetId = to.params.channelSetId;
        return vm.verifyChannelSet(channelSetId).catch(() => {
          // Couldn't verify the channel details, so go back!
          // We should probaly replace this with a 404 page, as
          // when navigating in from an external link (as this behaviour
          // would often be from - it produces a confusing back step)
          vm.$router.back();
        });
      });
    },
    mounted() {
      // For some reason the 'hideScroll' method of the VDialog is not
      // being called the first time the dialog is opened, so do that explicitly
      this.$refs.dialog.hideScroll();
    },
    methods: {
      ...mapActions('channel', ['loadChannelList']),
      ...mapActions('channelSet', ['updateChannelSet', 'loadChannelSet', 'deleteChannelSet']),
      ...mapMutations('channelSet', { setChannelSet: 'UPDATE_CHANNELSET' }),
      nameValid(name) {
        return name && name.length > 0 ? true : this.$tr('titleRequiredText');
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
        }
      },
      setup() {
        this.loadChannels();

        // Lock saving until user leaves modal
        this.tracker = new ChangeTracker(1);
        this.tracker.start();
        this.title = this.channelSet.name;
      },
      save() {
        this.showUnsavedDialog = false;
        if (this.$refs.channelsetform.validate()) {
          this.tracker.dismiss().then(() => {
            if (this.channelSet.isNew) {
              this.setChannelSet({ id: this.channelSetId, isNew: false });
            }
            this.close();
          });
        }
      },
      cancelChanges() {
        if (this.channelSet.isNew) {
          this.deleteChannelSet(this.channelSetId);
          this.confirmCancel();
        } else if (this.changed) {
          this.showUnsavedDialog = true;
        } else {
          this.confirmCancel();
        }
      },
      confirmCancel() {
        this.tracker.revert().then(this.close);
      },
      close() {
        this.changed = false;
        this.showUnsavedDialog = false;
        this.$router.push({ name: RouterNames.CHANNEL_SETS });
      },
      verifyChannelSet(channelSetId) {
        return new Promise((resolve, reject) => {
          // Check if we already have the channel locally
          if (this.getChannelSet(channelSetId)) {
            this.setup();
            resolve();
            return;
          }
          this.loading = true;
          // If not, try to load the channel
          this.loadChannelSet(channelSetId).then(channelset => {
            // Did our fetch return any channels, then we have a channel!
            if (channelset) {
              this.loading = false;
              this.setup();
              resolve();
              return;
            }
            // If not, reject!
            reject();
          });
        });
      },
    },
    $trs: {
      creatingChannelSet: 'Creating collection',
      loading: 'Loading...',
      titleLabel: 'Collection name',
      channelCountText:
        '{channelCount, plural, =0 {No published channels in your collection} =1 {# channel} other {# channels}}',
      channelSelectedCountText:
        '{channelCount, plural, =1 {# channel selected} other {# channels selected}}',
      titleRequiredText: 'Field is required',
      publishedChannelsOnlyText: 'Only published channels are available for selection',
      tokenPrompt:
        'Copy this code into Kolibri to allow your collection channels to be available for import onto your device',
      token: 'Collection token',
      channels: 'Collection channels',
      selectChannelsHeader: 'Select channels',
      saveButton: 'Save and close',
      createButton: 'Create',
      finish: 'Finish',
      [ListTypes.EDITABLE]: 'My Channels',
      [ListTypes.VIEW_ONLY]: 'View-Only',
      [ListTypes.PUBLIC]: 'Public',
      [ListTypes.STARRED]: 'Starred',
      unsavedChangesHeader: 'Unsaved changes',
      unsavedChangesText: 'Closing now will undo any new changes. Are you sure you want to close?',
      closeButton: 'Close without saving',
      removeText: 'Remove',
    },
  };

</script>


<style lang="less" scoped>

</style>
