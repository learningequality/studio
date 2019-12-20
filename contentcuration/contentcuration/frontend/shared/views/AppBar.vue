<template>

  <VToolbar app dark clipped-left color="purple" :tabs="Boolean($slots.tabs)">
    <VToolbarSideIcon href="/channels">
      <VImg maxHeight="35" contain :src="require('../images/kolibri-logo.svg')" />
    </VToolbarSideIcon>

    <VToolbarTitle class="white--text">
      {{ $tr('title') }}
    </VToolbarTitle>
    <VSpacer />

    <template v-if="isLoggedIn">
      <VToolbarTitle class="white--text">
        {{ $tr('helloUser', { username: user.first_name }) }}
      </VToolbarTitle>
      <VMenu offsetY>
        <template v-slot:activator="{ on }">
          <VBtn icon v-on="on">
            <VIcon>account_circle</VIcon>
          </VBtn>
        </template>

        <VList>
          <VListTile
            v-for="item in menuItems"
            :key="item.url"
            :href="item.url"
            :target="item.target"
          >
            <VListTileTitle v-text="item.label" />
          </VListTile>
        </VList>
      </VMenu>
    </template>
    <VBtn v-else href="/accounts/login" flat>
      {{ $tr('logIn') }}
    </VBtn>

    <template v-if="$slots.tabs" #extension>
      <VTabs
        fixedTabs
        showArrows
        color="transparent"
        sliderColor="white"
      >
        <slot name="tabs"></slot>
      </VTabs>
    </template>
  </VToolbar>

</template>


<script>

  import { mapState } from 'vuex';

  export default {
    name: 'AppBar',
    computed: {
      ...mapState({ user: state => state.session.currentUser }),
      menuItems() {
        const items = [
          {
            url: window.Urls.profile_settings(),
            label: this.$tr('settings'),
          },
          {
            url: 'http://kolibri-studio.readthedocs.io/en/latest/index.html',
            target: '_blank',
            label: this.$tr('help'),
          },
          {
            url: window.Urls.logout(),
            label: this.$tr('logOut'),
          },
        ];
        if (this.user.is_admin) {
          items.unshift({
            url: window.Urls.administration(),
            label: this.$tr('administration'),
          });
        }
        return items;
      },
      isLoggedIn() {
        return Boolean(this.user.email);
      },
    },
    $trs: {
      title: 'Kolibri Studio Beta',
      administration: 'Administration',
      settings: 'Settings',
      help: 'Help',
      logIn: 'Log In',
      logOut: 'Log Out',
      helloUser: 'Hello, { username }',
    },
  };

</script>

<style lang="less" scoped>

  /deep/ .v-tabs__icon--next,
  /deep/ .v-tabs__icon--prev {
    margin-top: 10px;
  }

</style>
