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
        <VBtn icon data-test="close" @click="close">
          <Icon class="notranslate">
            clear
          </Icon>
        </VBtn>
        <VToolbarTitle>
          <template v-if="!name">
            {{ $tr('untitledChannelHeader') }}
          </template>
          <template v-else>
            {{ name }}
          </template>
        </VToolbarTitle>
        <VSpacer />
        <VBtn flat @click="close">
          {{ $tr('saveChangesButton' ) }}
        </VBtn>
      </VToolbar>
      <VProgressLinear
        v-if="loading"
        indeterminate
        color="primary"
        style="margin: 0;"
        height="5"
      />
      <VCardText v-else>
        <VLayout row justify-center class="pb-5">
          <VFlex style="max-width: 800px;">
            <VForm ref="detailsform">
              <ChannelThumbnail v-model="thumbnail" />
              <fieldset class="py-1 mt-3 channel-info">
                <legend class="py-1 mb-2 legend-title font-weight-bold">
                  {{ $tr('details') }}
                </legend>

                <VTextField
                  v-model="name"
                  outline
                  :label="$tr('channelName')"
                  :rules="[() => name.length ? true : $tr('channelError')]"
                  required
                />
                <LanguageDropdown
                  v-model="language"
                  class="notranslate"
                  outline
                  required
                />
                <VTextarea
                  v-model="description"
                  outline
                  :label="$tr('channelDescription')"
                  maxlength="400"
                  rows="4"
                  auto-grow
                  counter
                />
              </fieldset>

              <ContentDefaults
                v-model="contentDefaults"
              />
            </VForm>
          </VFlex>
        </VLayout>
      </VCardText>

    </VCard>
  </VDialog>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import ChannelThumbnail from './ChannelThumbnail';
  import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown';
  import ContentDefaults from 'shared/views/form/ContentDefaults';

  export default {
    name: 'ChannelModal',
    components: {
      LanguageDropdown,
      ContentDefaults,
      ChannelThumbnail,
    },
    props: {
      channelId: {
        type: String,
      },
    },
    data() {
      return {
        loading: false,
      };
    },
    computed: {
      ...mapState(['currentLanguage']),
      ...mapGetters('channel', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId) || {};
      },
      routeParamID() {
        return this.$route.params.channelId;
      },
      thumbnail: {
        get() {
          return {
            thumbnail: this.channel.thumbnail,
            thumbnail_url: this.channel.thumbnail_url,
            thumbnail_encoding: this.channel.thumbnail_encoding,
          };
        },
        set(thumbnailData) {
          this.updateChannel({ id: this.channelId, thumbnailData });
        },
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
      contentDefaults: {
        get() {
          return this.channel.content_defaults || {};
        },
        set(contentDefaults) {
          this.updateChannel({ id: this.channelId, contentDefaults });
        },
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
            // We should probably replace this with a 404 page, as
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
      ...mapActions('channel', ['updateChannel', 'loadChannel']),
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
          name: this.$route.matched[0].name,
          query: this.$route.query,
          params: {
            ...this.$route.params,
            channelId: null,
          },
        });
      },
    },
    $trs: {
      untitledChannelHeader: 'Untitled channel',
      details: 'Channel details',
      channelName: 'Channel name',
      channelError: 'Channel name cannot be blank',
      channelDescription: 'Channel description',
      saveChangesButton: 'Save changes',
    },
  };

</script>


<style lang="less" scoped>

  .channel-info {
    border: 0;
  }

  .legend-title {
    font-size: 18px;
    line-height: 1;
    letter-spacing: 0.02em;
  }

  .v-select {
    max-width: 400px;
  }

</style>
