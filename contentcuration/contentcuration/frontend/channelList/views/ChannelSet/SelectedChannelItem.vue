<template>

  <VCard flat>
    <VContainer>
      <VLayout align-center>
        <VFlex xs12 sm3 md3 lg2>
          <VImg :src="channel.thumbnail_url" contain :aspect-ratio="16/9" />
        </VFlex>
        <VFlex xs12 sm7 md7 lg8>
          <VCardText>
            <h3 class="headline mb-0 notranslate">
              {{ channel.name }}
            </h3>
            <p class="grey--text subheading">
              {{ $tr("versionText", {'version': channel.version}) }}
            </p>
            <p class="notranslate">
              {{ channel.description }}
            </p>
          </VCardText>
        </VFlex>
        <VFlex xs12 sm2 md2 lg2>
          <VBtn flat color="primary" @click="$emit('remove', channelId)">
            {{ $tr('removeText') }}
          </VBtn>
        </VFlex>
      </VLayout>
    </VContainer>
  </VCard>

</template>


<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'SelectedChannelItem',
    props: {
      channelId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('channelList', ['getChannel']),
      channel() {
        return this.getChannel(this.channelId);
      },
    },
    $trs: {
      versionText: 'Version {version}',
      removeText: 'Remove',
    },
  };

</script>


<style lang="less" scoped>

</style>
