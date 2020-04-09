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
    >
      <template v-slot:append-outer>
        <InfoModal :header="$tr('visibilityHeader')">
          <template v-slot:content>
            <p>{{ $tr('visibilityDescription') }}</p>
            <VDivider />
            <div class="role-table">
              <VLayout v-for="roleOption in roles" :key="roleOption" row>
                <VFlex xs3 text-right class="role-label">
                  {{ roleOption.text }}
                  <VIcon v-if="roleIcon(roleOption.value)" color="primary">
                    {{ roleIcon(roleOption.value) }}
                  </VIcon>
                </VFlex>
                <VFlex xs9>
                  {{ $tr(roleOption.value) }}
                </VFlex>
              </VLayout>
            </div>
          </template>
        </InfoModal>
      </template>
      <template v-slot:selection="{ item, index }">
        <VIcon v-if="roleIcon(item.value)" color="primary">
          {{ roleIcon(item.value) }}
        </VIcon>
        {{ item.text }}
      </template>
      <template v-slot:item="{ item, index }">
        <VIcon v-if="roleIcon(item.value)">
          {{ roleIcon(item.value) }}
        </VIcon>
        {{ item.text }}
      </template>
    </VSelect>
  </VLayout>

</template>

<script>

  import Roles, { RolesList } from 'shared/leUtils/Roles';
  import InfoModal from 'edit_channel/sharedComponents/InfoModal.vue';
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
        type: String,
        default: 'learner',
        validator: function(value) {
          return !value || Roles.has(value);
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
      visibilityHeader: 'What is content visibility?',
      visibilityDescription:
        'Content visibility determines what type of Kolibri users can see this content.',
      /* eslint-disable kolibri/vue-no-unused-translations */
      coach:
        'This is support content and is visible only to coaches (teachers, facilitators, administrators)',
      /* eslint-enable */
      learner: 'This content is visible to anyone',
      visibilityRequired: 'Visibility is required',
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../less/global-variables.less';

  .v-icon {
    margin-left: 5px;
    font-size: 12pt;
    vertical-align: text-top;
  }

  .role-table {
    padding: 15px;
    .row {
      padding: 5px;
      .role-label {
        padding-right: 15px;
        font-weight: bold;
      }
    }
  }

  /deep/ a {
    .linked-list-item;
  }

</style>
