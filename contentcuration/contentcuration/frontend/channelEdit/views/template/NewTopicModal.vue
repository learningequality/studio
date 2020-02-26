<template>
  <v-layout row justify-center>
    <VDialog v-model="showDialog" width="400">
      <v-card>
        <v-card-title primary-title class="headline">
          <strong>{{ $tr('createTopic') }}</strong>
        </v-card-title>
        <v-container grid-list-md>
          <v-layout wrap>
            <VTextField v-model="title" :label="$tr('topicTitle')" outline />
          </v-layout>
        </v-container>
        <v-card-actions>
          <v-spacer />
          <VBtn flat @click="$emit('cancelTopic')">{{ $tr("cancel") }}</VBtn>
          <VBtn
            color="purple"
            class="white--text"
            @click="$emit('createTopic', title)"
          >{{ $tr("create") }}</VBtn>
        </v-card-actions>
      </v-card>
    </VDialog>
  </v-layout>
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
