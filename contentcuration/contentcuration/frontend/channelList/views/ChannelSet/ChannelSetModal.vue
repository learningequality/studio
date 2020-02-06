<template>

  <VDialog
    ref="dialog"
    :value="$route.params.channelSetId == channelSetId"
    attach="body"
    fullscreen
    scrollable
    transition="dialog-bottom-transition"
  >
    <VCard>
      <VWindow v-model="step">
        <VWindowItem :value="1">
          <VToolbar card prominent dark color="primary">
            <VBtn icon data-test="close" @click="close">
              <VIcon class="notranslate">
                clear
              </VIcon>
            </VBtn>
            <VToolbarTitle>
              {{ headerText }}
            </VToolbarTitle>
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

                <h1 class="headline collections-header">
                  {{ $tr('channels') }}
                </h1>
                <p class="subheading">
                  {{ $tr('channelCountText', {'channelCount': channelCount}) }}
                </p>

                <!-- Channel list section -->
                <VCardText v-if="loadingChannels">
                  {{ $tr('loading') }}
                </VCardText>
                <div v-else fluid>
                  <VBtn color="primary" data-test="select" @click="step ++">
                    {{ $tr('selectChannelsHeader') }}
                  </VBtn>
                  <SelectedChannelItem
                    v-for="channelId in selectedChannels"
                    :key="channelId"
                    :channelId="channelId"
                    @remove="removeChannel"
                  />
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
            <VSpacer />

          </VToolbar>
          <VContainer fill-height>
            <VLayout row justify-center>
              <VFlex md12 lg10 xl8>
                <h1 class="headline">
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
                      <ChannelSelectionList
                        v-if="channelSet"
                        :channelSetId="channelSetId"
                        :listType="listType"
                      />
                    </VTabItem>
                  </VTabs>
                </VContainer>
              </VFlex>
            </VLayout>
          </VContainer>
          <BottomToolBar color="white" flat>
            <div style="margin-right: 16px;" class="subheading">
              {{ $tr('channelSelectedCountText', {'channelCount': channelCount}) }}
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

  import { mapGetters, mapActions } from 'vuex';
  import reject from 'lodash/reject';
  import { RouterNames, ListTypes } from '../../constants';
  import SelectedChannelItem from './SelectedChannelItem';
  import ChannelSelectionList from './ChannelSelectionList';
  import CopyToken from 'shared/views/CopyToken';
  import BottomToolBar from 'shared/views/BottomToolBar';

  export default {
    name: 'ChannelSetModal',
    components: {
      CopyToken,
      ChannelSelectionList,
      SelectedChannelItem,
      BottomToolBar,
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
      };
    },
    computed: {
      ...mapGetters('channelSet', ['getChannelSet']),
      name: {
        get() {
          return this.channelSet.name || '';
        },
        set(value) {
          this.updateChannelSet({ id: this.channelSetId, name: value });
        },
      },
      lists() {
        return Object.values(ListTypes).filter(l => l !== 'bookmark');
      },
      channelSet() {
        return this.getChannelSet(this.channelSetId) || {};
      },
      selectedChannels() {
        return (this.channelSet.channels || []).filter(c => c);
      },
      channelCount() {
        return this.selectedChannels.length;
      },
      headerText() {
        return this.name ? this.name : this.$tr('unnamedChannelSet');
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        const channelSetId = to.params.channelSetId;
        vm.verifyChannelSet(channelSetId).catch(() => {
          // Couldn't verify the channel details, so go back!
          // We should probaly replace this with a 404 page, as
          // when navigating in from an external link (as this behaviour
          // would often be from - it produces a confusing back step)
          vm.$router.back();
        });
      });
    },
    created() {
      this.loadChannels();
    },
    mounted() {
      // For some reason the 'hideScroll' method of the VDialog is not
      // being called the first time the dialog is opened, so do that explicitly
      this.$refs.dialog.hideScroll();
    },
    methods: {
      ...mapActions('channel', ['loadChannelList']),
      ...mapActions('channelSet', ['updateChannelSet', 'loadChannelSet']),
      nameValid(name) {
        return name && name.length > 0 ? true : this.$tr('titleRequiredText');
      },
      removeChannel(channelId) {
        let channelIds = reject(this.channelSet.channels, c => c === channelId);
        this.updateChannelSet({ id: this.channelSetId, channels: channelIds });
      },
      loadChannels() {
        this.loadingChannels = true;
        this.loadChannelList().then(() => {
          this.loadingChannels = false;
        });
      },
      close() {
        this.$router.push({ name: RouterNames.CHANNEL_SETS });
      },
      verifyChannelSet(channelSetId) {
        return new Promise((resolve, reject) => {
          // Check if we already have the channel locally
          if (this.getChannelSet(channelSetId)) {
            resolve();
            return;
          }
          this.loading = true;
          // If not, try to load the channel
          this.loadChannelSet(channelSetId).then(channelset => {
            // Did our fetch return any channels, then we have a channel!
            if (channelset) {
              this.loading = false;
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
      unnamedChannelSet: 'Unnamed collection',
      loading: 'Loading...',
      titleLabel: 'Collection name',
      channelCountText:
        '{channelCount, plural, =0 {No published channels in your collection} =1 {# channel} other {# channels}}',
      channelSelectedCountText:
        '{channelCount, plural, =1 {# channel selected} other {# channels selected}}',
      titleRequiredText: 'Title is required',
      publishedChannelsOnlyText: 'Only published channels are available for selection',
      tokenPrompt:
        'Copy this code into Kolibri to allow your collection channels to be available for import onto your device',
      token: 'Collection token',
      channels: 'Collection channels',
      selectChannelsHeader: 'Select channels',
      finish: 'Finish',
      [ListTypes.EDITABLE]: 'My Channels',
      [ListTypes.VIEW_ONLY]: 'View-Only',
      [ListTypes.PUBLIC]: 'Public',
      [ListTypes.STARRED]: 'Starred',
    },
  };

</script>


<style lang="less" scoped>

  .token-prompt {
    margin-top: 16px;
  }

  h1 {
    margin-top: 24px;
    margin-bottom: 8px;
    font-weight: bold;
    &.collections-header {
      margin-top: 48px;
    }
  }

  .v-card {
    overflow: auto;
  }

  .bottom-navigation {
    top: unset;
    bottom: 0;
    border-top: 1px solid gray;
  }

</style>
