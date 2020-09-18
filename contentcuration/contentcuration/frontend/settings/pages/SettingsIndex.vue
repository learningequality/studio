<template>

  <VApp>
    <AppBar
      :title="$tr('settingsTitle')"
      :style="{ color: $themeTokens.textInverted }"
    >
      <template #tabs>
        <VTab :to="{ name: RouterNames.ACCOUNT }">
          {{ $tr('accountLabel') }}
        </VTab>
        <VTab :to="{ name: RouterNames.STORAGE }">
          {{ $tr('storageLabel') }}
        </VTab>
        <VTab :to="{ name: RouterNames.USING_STUDIO }">
          {{ $tr('usingStudioLabel') }}
        </VTab>
      </template>
    </AppBar>
    <OfflineText toolbar :offset="112" />
    <VContent>
      <VContainer class="ml-0 pl-5" :class="offline? 'pt-5': 'pt-2'">
        <router-view />
      </VContainer>
    </VContent>
    <GlobalSnackbar />
    <PolicyUpdates />
  </VApp>

</template>


<script>

  import { mapState } from 'vuex';
  import { RouterNames } from '../constants';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';
  import AppBar from 'shared/views/AppBar';
  import OfflineText from 'shared/views/OfflineText';
  import PolicyUpdates from 'shared/views/policies/PolicyUpdates';

  export default {
    name: 'SettingsIndex',
    components: { GlobalSnackbar, AppBar, OfflineText, PolicyUpdates },
    computed: {
      ...mapState({
        offline: state => !state.connection.online,
      }),
      RouterNames() {
        return RouterNames;
      },
    },
    $trs: {
      settingsTitle: 'Settings',
      accountLabel: 'Account',
      storageLabel: 'Storage',
      usingStudioLabel: 'Using studio',
    },
  };

</script>
