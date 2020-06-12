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
    <VContent>
      <VContainer class="ml-0 pl-5">
        <router-view />
      </VContainer>
    </VContent>
    <GlobalSnackbar />
  </VApp>

</template>


<script>

  import { RouterNames } from '../constants';
  import GlobalSnackbar from 'shared/views/GlobalSnackbar';
  import AppBar from 'shared/views/AppBar';

  export default {
    name: 'SettingsIndex',
    components: { GlobalSnackbar, AppBar },
    computed: {
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
