<template>

  <VLayout v-if="channel" align-center wrap class="pa-2" @click="handleClick">
    <VFlex class="pa-2" xs12 sm4 md3 lg2>
      <Thumbnail :src="channel.thumbnail_url" />
    </VFlex>
    <VFlex xs12 sm8 md9 lg10>
      <VLayout align-center>
        <VCardText class="py-0">
          <h3 class="card-header font-weight-bold notranslate" dir="auto">
            {{ channel.name }}
          </h3>
          <p class="grey--text metadata-section subheading">
            {{ $tr("versionText", { 'version': channel.version }) }}
          </p>
          <p dir="auto" class="notranslate">
            {{ channel.description }}
          </p>
        </VCardText>
        <slot></slot>
      </VLayout>
    </VFlex>
  </VLayout>

</template>


<script>

  import { mapGetters } from 'vuex';
  import Thumbnail from 'shared/views/files/Thumbnail';

  export default {
    name: 'ChannelItem',
    components: {
      Thumbnail,
    },
    props: {
      channelId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('channel', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId);
      },
    },
    methods: {
      handleClick() {
        this.$emit('click', this.channelId);
      },
    },
    $trs: {
      versionText: 'Version {version}',
    },
  };

</script>


<style lang="scss" scoped>

  .card-header {
    font-size: 18px;
  }

  .metadata-section {
    // Double space metadata section
    line-height: 3;
  }

</style>
