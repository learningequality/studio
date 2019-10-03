<template>
  <VDialog
    v-model="open"
    attach="body"
    fullscreen
  >
    <VCard>
      <VToolbar card prominent dark color="blue">
        <VBtn icon class="hidden-xs-only" @click="close">
          <VIcon>clear</VIcon>
        </VBtn>
        <VToolbarTitle>
          {{ modalTitle }}
        </VToolbarTitle>
      </VToolbar>
      <VLayout row justify-center>
        <VFlex xs12 sm6>
          <VLayout row wrap>
            <VFlex xs12 sm6 md3>
              <VCardText>
                {{ $tr('channelCountText', {'channelCount': channelCount}) }}
              </VCardText>
            </VFlex>
            <VFlex xs12 sm6 md3 offsetMd6>
              <CopyToken
                v-if="token"
                :token="token"
              />
            </VFlex>
          </VLayout>
          <VCardText>
            <VTextField
              v-model="name"
              :rules="[nameValid]"
              :label="$tr('titleLabel')"
              :placeholder="$tr('titlePlaceholder')"
              maxlength="200"
              counter
            />
          </VCardText>
          <VCardText>
            <VTextarea
              v-model="description"
              :label="$tr('descriptionLabel')"
              :maxlength="charLimit"
              rows="4"
              :placeholder="$tr('descriptionPlaceholder')"
              counter
            />
          </VCardText>
          <!-- Channel list section -->
          <VCardText v-if="loadingChannels">
            {{ $tr('loading') }}
          </VCardText>
          <VContainer v-else fluid>
            <VExpansionPanel
              :value="expansionPanel"
            >
              <VExpansionPanelContent
                v-for="(published, i) in [true, false]"
                :key="i"
                :lazy="true"
              >
                <template v-slot:header>
                  <div>{{ published ? $tr('publishedChannels') : $tr('unpublishedChannels') }}</div>
                </template>
                <VLayout>
                  <VFlex xs12>
                    <transition-group name="channels">
                      <VCard
                        v-for="channel in (published ? selectableChannels : unpublishedChannels)"
                        :key="channel.id"
                        :raised="channels.includes(channel.id)"
                      >
                        <VLayout alignCenter>
                          <VFlex xs1>
                            <VCheckbox
                              v-if="published"
                              v-model="channels"
                              :disabled="!channel.published"
                              :value="channel.id"
                            />
                          </VFlex>
                          <VFlex xs11 offsetXs1>
                            <VLayout>
                              <VFlex xs12 sm12 md3>
                                <VImg :src="channel.thumbnail_url" contain />
                              </VFlex>
                              <VFlex xs12 sm12 md9>
                                <VCardTitle>
                                  <div>
                                    <h3 class="headline mb-0">
                                      {{ channel.name }}
                                    </h3>
                                    <div>{{ channel.description }}</div>
                                  </div>
                                </VCardTitle>
                              </VFlex>
                            </VLayout>
                            <VLayout>
                              <VFlex xs12>
                                <VCardText v-if="published">
                                  {{ $tr("versionText", {'version': channel.version}) }}
                                </VCardText>
                                <VCardText v-else class="red--text">
                                  {{ $tr('unpublishedTitle', { channelName: channel.name }) }}
                                </VCardText>
                              </VFlex>
                            </VLayout>
                          </VFlex>
                        </VLayout>
                      </VCard>
                    </transition-group>
                  </VFlex>
                </VLayout>
              </VExpansionPanelContent>
            </VExpansionPanel>
          </VContainer>
          <VCardActions>
            <VBtn flat color="blue" @click="close">
              {{ $tr('closeButtonLabel') }}
            </VBtn>
            <div style="margin-left: auto;">
              <VBtn
                :disabled="!enableSave"
                @click="saveAndClose"
              >
                {{ $tr('saveCloseButtonLabel') }}
              </VBtn>
              <VBtn
                :disabled="!enableSave"
                @click="save"
              >
                {{ $tr('saveButtonLabel') }}
              </VBtn>
              <VProgressCircular
                v-show="saving"
                indeterminate
              />
              <span v-show="error" class="red-text error-text pull-right">
                {{ $tr('errorText') }}
              </span>
            </div>
          </VCardActions>
        </VFlex>
      </VLayout>
    </VCard>
  </VDialog>
</template>


<script>

  import { mapGetters, mapActions, mapMutations, mapState } from 'vuex';
  import sortBy from 'lodash/sortBy';
  import CopyToken from 'shared/views/CopyToken';
  import { isTempId } from '../../utils';
  import { RouterNames } from '../../constants';

  export default {
    name: 'ChannelSetModal',
    components: {
      CopyToken,
    },
    props: {
      channelSetId: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        saving: false,
        loadingChannels: true,
        expansionPanel: 0,
      };
    },
    $trs: {
      newSetHeader: 'New Collection',
      editingSetHeader: 'Editing Collection',
      closeButtonLabel: 'Close',
      saveButtonLabel: 'Save',
      saveCloseButtonLabel: 'Save & Close',
      noChangesTitle: 'No changes detected',
      invalidCollection: 'Must enter all required fields',
      saving: 'Saving...',
      errorText: 'There was a problem saving your collection',
      loading: 'Loading...',
      titleLabel: 'Title',
      titlePlaceholder: 'Title your collection',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'Describe your collection',
      selectButtonLabel: 'Select',
      backButtonLabel: 'Back to details',
      channelCountText:
        '{channelCount, plural, =1 {# channel in your collection} other {# channels in your collection}}',
      titleRequiredText: 'Title is required',
      charCount: '{charCount, plural, =1 {# character left} other {# characters left}}',
      versionText: 'Version {version}',
      unpublishedTitle: '{channelName} must be published to import it into Kolibri',
      publishedChannels: 'Published channels that can be imported into Kolibri',
      unpublishedChannels: 'These channels must be published to import them into Kolibri',
    },
    created() {
      this.loadChannels();
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        if (!vm.getChannelSet(to.params.channelSetId)) {
          // Couldn't verify the channelset details, so go back!
          // We should probaly replace this with a 404 page, as
          // when navigating in from an external link (as this behaviour
          // would often be from) it produces a confusing back step
          vm.$router.back();
        }
      });
    },
    beforeRouteUpdate(to, from, next) {
      if (!this.getChannelSet(to.params.channelSetId)) {
        // Couldn't verify the channelset details, so cancel navigation!
        next(false);
      }
    },
    computed: {
      ...mapGetters('channelSet', [
        'getChannelSet',
        'getChannelSetIsUnsaved',
        'getChannelSetIsValid',
      ]),
      ...mapGetters('channelList', { availableChannels: 'channels' }),
      ...mapState('channelSet', ['error']),
      modalTitle() {
        if (this.isNewSet) {
          return this.$tr('newSetHeader');
        }
        return this.$tr('editingSetHeader');
      },
      open: {
        get() {
          return true;
        },
        set(open) {
          if (!open) {
            this.close();
          };
        },
      },
      name: {
        get() {
          return this.channelSet.name || '';
        },
        set(value) {
          this.updateChannelSet({ id: this.channelSetId, name: value });
        },
      },
      description: {
        get() {
          return this.channelSet.description || '';
        },
        set(value) {
          this.updateChannelSet({ id: this.channelSetId, description: value });
        },
      },
      channels: {
        get() {
          return this.channelSet.channels || [];
        },
        set(value) {
          this.updateChannelSet({ id: this.channelSetId, channels: value });
        },
      },
      enableSave() {
        if (this.isNewSet) {
          return this.nameValid && this.channelCount;
        }
        return this.getChannelSetIsUnsaved(this.channelSetId) && this.getChannelSetIsValid(this.channelSetId);
      },
      saveButtonTitle() {
        if (this.saving) {
          return this.$tr('saving');
        } else if (!this.isValid) {
          return this.$tr('invalidCollection');
        } else if (!this.changed) {
          return this.$tr('noChangesTitle');
        } else return this.$tr('saveButtonLabel');
      },
      selectableChannels() {
        return sortBy(this.availableChannels.filter(channel => channel.published), [
          channel => !this.channels.includes(channel.id),
          'name',
        ]);
      },
      unpublishedChannels() {
        return sortBy(this.availableChannels, 'name');
      },
      charsLeft() {
        return this.charLimit - this.description.length;
      },
      charLimit() {
        return 400;
      },
      token() {
        let token = this.channelSet.secret_token;
        return token && token.display_token;
      },
      channelSet() {
        return this.getChannelSet(this.channelSetId) || {};
      },
      channelCount() {
        return this.channels.length;
      },
      isNewSet() {
        return isTempId(this.channelSetId)
      }
    },
    methods: {
      ...mapActions('channelList', ['loadChannelList']),
      ...mapActions('channelSet', ['saveChannelSet']),
      ...mapMutations('channelSet', {
        updateChannelSet: 'UPDATE_CHANNELSET',
      }),
      nameValid(name) {
        return name && name.length > 0 ? true : this.$tr('titleRequiredText');
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
      save() {
        this.saving = true;
        return this.saveChannelSet(this.channelSetId).then(newId => {
          if (newId) {
            this.$router.replace({ name: RouterNames.CHANNEL_SET_DETAILS, params: { channelSetId: newId } });
          }
          this.saving = false;
        });
      },
      saveAndClose() {
        this.save().then(this.close);
      },
    },
  };

</script>


<style lang="less" scoped>

</style>
