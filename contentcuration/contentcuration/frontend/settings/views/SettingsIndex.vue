<template>

  <VApp>
    <AppBar>
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
    <KPageContainer :topMargin="150" style="margin-left: auto; margin-right: auto; width: 80%;">
      <router-view />
    </KPageContainer>
  </VApp>

</template>


<script>

import AppBar from '../../shared/views/AppBar';
import { RouterNames } from '../constants';

export default {
  name: 'SettingsIndex',
  components: { AppBar },
  computed: {
    RouterNames() {
      return RouterNames;
    }
  },
  $trs: {
    accountLabel: "Account",
    storageLabel: "Storage",
    usingStudioLabel: "Using studio",
  },
}

</script>


<style>

</style>
