<template>

  <VApp>
    <AppBar
      :title="$tr('settingsTitle')"
      :style="{ color: $themeTokens.textInverted }"
    >
      <template #tabs>
        <VTab :to="{ name: RouteNames.ACCOUNT }">
          {{ $tr('accountLabel') }}
        </VTab>
        <VTab :to="{ name: RouteNames.STORAGE }">
          {{ $tr('storageLabel') }}
        </VTab>
        <VTab :to="{ name: RouteNames.USING_STUDIO }">
          {{ $tr('usingStudioLabel') }}
        </VTab>
      </template>
    </AppBar>
    <StudioOfflineAlert :offset="104" />
    <VContent>
      <VContainer
        fluid
        class="pa-0"
        style="height: calc(100vh - 112px); overflow: auto; overflow-x: hidden"
      >
        <VContainer
          class="ml-0 pl-5"
          :class="offline ? 'pt-5' : 'pt-2'"
        >
          <router-view />
        </VContainer>
      </VContainer>
    </VContent>
    <GlobalSnackbar />
    <PolicyModals />
  </VApp>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import { RouteNames } from '../constants';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';
  import AppBar from 'shared/views/AppBar';
  import { routerMixin } from 'shared/mixins';
  import StudioOfflineAlert from 'shared/views/StudioOfflineAlert';
  import PolicyModals from 'shared/views/policies/PolicyModals';

  export default {
    name: 'SettingsIndex',
    components: { GlobalSnackbar, AppBar, StudioOfflineAlert, PolicyModals },
    mixins: [routerMixin],
    computed: {
      ...mapState({
        offline: state => !state.connection.online,
      }),
      RouteNames() {
        return RouteNames;
      },
    },
    watch: {
      '$route.name': {
        handler: 'updateTitleForPage',
        immediate: true,
      },
    },
    created() {
      this.fetchDeferredUserApiToken();
      this.fetchDeferredUserStorageByKind();
    },
    methods: {
      ...mapActions('settings', ['fetchDeferredUserStorageByKind', 'fetchDeferredUserApiToken']),
      updateTitleForPage() {
        // Updates the tab title every time the top-level route changes
        let title;
        const routeName = this.$route.name;
        if (routeName === RouteNames.ACCOUNT) {
          title = this.$tr('accountLabel');
        } else if (routeName === RouteNames.STORAGE) {
          title = this.$tr('storageLabel');
        } else if (routeName === RouteNames.USING_STUDIO) {
          title = this.$tr('usingStudioLabel');
        }
        // TODO combine this `{firstItem} - {secondItem}` into a single message to support
        // RTL languages
        this.updateTabTitle(`${title} - ${this.$tr('settingsTitle')}`);
      },
    },
    $trs: {
      settingsTitle: 'Settings',
      accountLabel: 'Account',
      storageLabel: 'Storage',
      usingStudioLabel: 'About Studio',
    },
  };

</script>
