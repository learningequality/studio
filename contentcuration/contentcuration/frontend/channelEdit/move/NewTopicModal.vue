<template>

  <VLayout row justify-center>
    <VDialog v-model="showDialog" width="400">
      <VCard>
        <VCardTitle primary-title class="headline">
          <strong>{{ $tr('createTopic') }}</strong>
        </VCardTitle>
        <VContainer grid-list-md>
          <VLayout wrap>
            <VTextField v-model="title" :label="$tr('topicTitle')" outline />
          </VLayout>
        </VContainer>
        <VCardActions>
          <VSpacer />
          <VBtn flat @click="$emit('cancelTopic')">
            {{ $tr("cancel") }}
          </VBtn>
          <VBtn
            color="purple"
            class="white--text"
            @click="$emit('createTopic', title)"
          >
            {{ $tr("create") }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VLayout>

</template>

<script>

  export default {
    name: 'NewTopicModal',
    props: {
      showDialog: {
        type: Boolean,
      },
    },
    data() {
      return {
        title: '',
      };
    },
    $trs: {
      topicTitle: 'Topic title',
      createTopic: 'Create new topic',
      cancel: 'Cancel',
      create: 'Create',
    },
  };

</script>

<style lang="less" scoped>
</style>
