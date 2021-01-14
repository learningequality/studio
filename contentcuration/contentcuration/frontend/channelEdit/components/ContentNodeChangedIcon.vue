<template>

  <span v-if="message">
    <VTooltip bottom>
      <template #activator="{ on }">
        <Icon color="greenSuccess" small v-on="on">
          {{ showFilled ? 'lens' : 'trip_origin' }}
        </Icon>
      </template>
      <span>{{ message }}</span>
    </VTooltip>
  </span>

</template>
<script>

  import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

  export default {
    name: 'ContentNodeChangedIcon',
    props: {
      node: {
        type: Object,
      },
    },
    computed: {
      showFilled() {
        return this.isNew || (this.isTopic && this.hasNew);
      },
      message() {
        // Topic messages
        if (this.isTopic) {
          if (this.hasNew && this.hasUpdated) {
            return this.$tr('containsNewAndUpdated');
          } else if (this.hasNew) {
            return this.$tr('containsNew');
          } else if (this.isNew) {
            return this.$tr('isNewTopic');
          } else if (this.hasUpdated) {
            return this.$tr('containsUpdated');
          } else if (this.isUpdated) {
            return this.$tr('isUpdatedTopic');
          }
        } else if (this.isNew) {
          return this.$tr('isNewResource');
        } else if (this.isUpdated) {
          return this.$tr('isUpdatedResource');
        }
        return false;
      },
      isTopic() {
        return this.node.kind === ContentKindsNames.TOPIC;
      },
      isNew() {
        return !this.node.published && this.node.changed;
      },
      isUpdated() {
        return this.node.changed;
      },
      hasUpdated() {
        return this.node.has_updated_descendants;
      },
      hasNew() {
        return this.node.has_new_descendants;
      },
    },
    $trs: {
      containsNewAndUpdated: 'Contains unpublished resources and changes',
      containsNew: 'Contains unpublished resources',
      isNewTopic: 'Unpublished topic',
      containsUpdated: 'Contains unpublished changes',
      isUpdatedTopic: 'Topic has been updated since last publish',
      isNewResource: 'Unpublished',
      isUpdatedResource: 'Updated since last publish',
    },
  };

</script>

<style scoped>
  .v-icon {
    vertical-align: bottom;
    cursor: default;
  }
</style>
