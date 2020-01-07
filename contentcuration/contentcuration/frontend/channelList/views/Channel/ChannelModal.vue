<template>

  <VDialog
    ref="dialog"
    :value="channelId && routeParamID === channelId"
    attach="body"
    fullscreen
    scrollable
    transition="dialog-bottom-transition"
  >
    <VCard>
      <VToolbar card prominent dark color="primary">
        <VBtn icon @click="close">
          <VIcon class="notranslate">
            clear
          </VIcon>
        </VBtn>
        <VToolbarTitle v-if="isNewChannel">
          {{ $tr('newChannelHeader') }}
        </VToolbarTitle>
        <VSpacer />
        <VBtn flat @click="save">
          {{ $tr('save') }}
        </VBtn>
      </VToolbar>
      <VProgressLinear
        v-if="loading"
        indeterminate
        color="primary"
        style="margin: 0px;"
        height="5"
      />
      <VCardText v-else>
        <VLayout row justify-center>
          <VFlex md12 lg10 xl8>
            <VForm ref="detailsform">
              <ThumbnailUpload
                v-model="thumbnail"
                :aspect-ratio="16/9"
                max-width="350px"
              />
              <h1 class="title">
                {{ $tr('details') }}
              </h1>

              <VTextField
                v-model="name"
                outline
                :label="$tr('channelName')"
                :placeholder="$tr('channelNamePlaceholder')"
                :rules="[() => name.length ? true : $tr('channelError')]"
                required
              />
              <LanguageDropdown
                v-model="language"
                class="notranslate"
                outline
                :placeholder="$tr('channelLanguagePlaceholder')"
                required
              />
              <VTextarea
                v-model="description"
                outline
                :label="$tr('channelDescription')"
                :placeholder="$tr('channelDescriptionPlaceholder')"
                maxlength="400"
                rows="4"
                auto-grow
                counter
              />
            </VForm>
          </VFlex>
        </VLayout>
      </VCardText>

    </VCard>
  </VDialog>

</template>


<script>

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import pick from 'lodash/pick';
  import { isTempId } from '../../utils';
  import { RouterNames } from '../../constants';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown';
  import ThumbnailUpload from 'shared/views/ThumbnailUpload';

  // Components

  export default {
    name: 'ChannelModal',
    components: {
      LanguageDropdown,
      ThumbnailUpload,
    },
    props: {
      channelId: {
        type: String,
      },
    },
    data() {
      return {
        saving: false,
        loading: false,
      };
    },
    computed: {
      ...mapState(['currentLanguage']),
      ...mapGetters('channelList', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      routeParamID() {
        return this.$route.params.channelId;
      },
      name: {
        get() {
          return this.channel.name || '';
        },
        set(name) {
          this.updateChannel({ id: this.channelId, name });
        },
      },
      description: {
        get() {
          return this.channel.description || '';
        },
        set(description) {
          this.updateChannel({ id: this.channelId, description });
        },
      },
      language: {
        get() {
          return this.channel.language || this.currentLanguage;
        },
        set(language) {
          this.updateChannel({ id: this.channelId, language });
        },
      },
      thumbnail: {
        get() {
          return pick(this.channel, ['thumbnail', 'thumbnail_url', 'thumbnail_encoding']);
        },
        set(thumbnailData) {
          this.updateChannel({ id: this.channelId, thumbnailData });
        },
      },
      isNewChannel() {
        return isTempId(this.channelId);
      },
    },
    watch: {
      routeParamID(val) {
        this.hideHTMLScroll(!!val);
      },
    },
    beforeRouteEnter(to, from, next) {
      next(vm => {
        const channelId = to.params.channelId;
        vm.verifyChannel(channelId)
          .then(() => {
            vm.hideHTMLScroll(true);
          })
          .catch(() => {
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
      ...mapActions('channelList', ['saveChannel', 'loadChannel']),
      ...mapMutations('channelList', {
        updateChannel: 'UPDATE_CHANNEL',
      }),
      hideHTMLScroll(hidden) {
        document.querySelector('html').style = hidden
          ? 'overflow-y: hidden !important;'
          : 'overflow-y: auto !important';
      },
      verifyChannel(channelId) {
        return new Promise((resolve, reject) => {
          // Check if we already have the channel locally
          if (this.getChannel(channelId)) {
            resolve();
            return;
          }
          this.loading = true;
          // If not, try to load the channel
          this.loadChannel(channelId).then(channel => {
            // Did our fetch return any channels, then we have a channel!
            if (channel && channel.edit && !channel.ricecooker_version) {
              this.loading = false;
              resolve();
              return;
            }
            // If not, reject!
            reject();
          });
        });
      },
      close() {
        this.$router.push({
          name: RouterNames.CHANNELS,
          params: { listType: this.$route.params.listType },
        });
      },
      save() {
        if (this.$refs.detailsform.validate()) {
          this.saving = true;
          return this.saveChannel(this.channelId).then(() => {
            this.close();
            this.saving = false;
          });
        }
      },
    },
    $trs: {
      newChannelHeader: 'New channel',
      details: 'Channel details',
      channelName: 'Name',
      channelError: 'Channel name cannot be blank',
      channelNamePlaceholder: 'Enter channel name...',
      channelDescription: 'Description',
      channelDescriptionPlaceholder: 'Enter channel description...',
      channelLanguagePlaceholder: 'Select a language...',
      save: 'Save changes',
    },
  };

</script>


<style lang="less" scoped>

  .title {
    margin: 25px 0 10px;
    font-weight: bold;
  }

</style>
