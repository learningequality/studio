<template>

  <VLayout grid wrap align-center>
    <VSelect
      ref="visibility"
      v-model="role"
      :items="roles"
      :label="$tr('labelText')"
      :placeholder="placeholder"
      color="primary"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :rules="rules"
      menu-props="offsetY"
      box
      @focus="$emit('focus')"
    >
      <template v-slot:append-outer>
        <InfoModal :header="$tr('visibilityHeader')" :items="roles">
          <p>{{ $tr('visibilityDescription') }}</p>
          <template #header="{ item }">
            <span>
              {{ item.text }}
              <Icon v-if="roleIcon(item.value)" color="primary">
                {{ roleIcon(item.value) }}
              </Icon>
            </span>
          </template>
          <template #description="{ item }">
            {{ $tr(item.value) }}
          </template>
        </InfoModal>
      </template>
      <template #selection="{ item }">
        <Icon v-if="roleIcon(item.value)" color="primary" class="pr-2">
          {{ roleIcon(item.value) }}
        </Icon>
        {{ item.text }}
      </template>
      <template #item="{ item }">
        <Icon v-if="roleIcon(item.value)" color="primary" class="pr-2">
          {{ roleIcon(item.value) }}
        </Icon>
        {{ item.text }}
      </template>
    </VSelect>
  </VLayout>

</template>

<script>

  import Roles, { RolesList } from 'shared/leUtils/Roles';
  import InfoModal from 'shared/views/InfoModal.vue';
  import { constantsTranslationMixin } from 'shared/mixins';

  const roleIcons = { coach: 'local_library' };

  export default {
    name: 'VisibilityDropdown',
    components: {
      InfoModal,
    },
    mixins: [constantsTranslationMixin],
    props: {
      value: {
        type: [String, Object],
        default: 'learner',
        validator: function(value) {
          return !value || !value.toString() || Roles.has(value);
        },
      },
      placeholder: {
        type: String,
        required: false,
      },
      required: {
        type: Boolean,
        default: false,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      role: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      roles() {
        return RolesList.map(role => ({ text: this.translateConstant(role), value: role }));
      },
      rules() {
        return this.required ? [v => !!v || this.$tr('visibilityRequired')] : [];
      },
    },
    methods: {
      roleIcon(role) {
        return roleIcons[role];
      },
    },
    $trs: {
      labelText: 'Visible to',
      visibilityHeader: 'About resource visibility',
      visibilityDescription: 'Visibility determines what type of Kolibri users can see resources.',
      /* eslint-disable kolibri/vue-no-unused-translations */
      coach: 'Resources are visible only to coaches (teachers, facilitators, administrators)',
      /* eslint-enable */
      learner: 'Resources are visible to anyone',
      visibilityRequired: 'Field is required',
    },
  };

</script>


<style lang="less" scoped>

  .v-icon {
    margin-left: 5px;
    font-size: 12pt;
    vertical-align: text-top;
  }

</style>
