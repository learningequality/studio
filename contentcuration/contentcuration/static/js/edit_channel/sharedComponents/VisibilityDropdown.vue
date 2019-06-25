<template>
  <VLayout grid wrap alignCenter>
    <VFlex xs10>
      <VSelect
        ref="visibility"
        :value="role"
        :items="roles"
        :label="$tr('labelText')"
        :placeholder="placeholder"
        color="primary"
        itemValue="id"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :rules="required? rules : []"
        @input="handleInput"
      >
        <template v-slot:selection="{ item, index }">
          <VIcon v-if="item.icon" color="primary">
            {{ item.icon }}
          </VIcon>
          {{ translate(item.id) }}
        </template>
        <template v-slot:item="{ item, index }">
          <VIcon v-if="item.icon">
            {{ item.icon }}
          </VIcon>
          {{ translate(item.id) }}
        </template>
      </VSelect>
    </VFlex>
    <VFlex xs2>
      <InfoModal :header="$tr('visibilityHeader')">
        <template v-slot:content>
          <p>{{ $tr('visibilityDescription') }}</p>
          <VDivider />
          <div class="role-table">
            <VLayout v-for="roleOption in roles" :key="roleOption.id" row>
              <VFlex xs3 textRight class="role-label">
                <VIcon v-if="roleOption.icon" color="primary">
                  {{ roleOption.icon }}
                </VIcon>
                {{ translate(roleOption.id) }}
              </VFlex>
              <VFlex xs9>
                {{ $tr(roleOption.id) }}
              </VFlex>
            </VLayout>
          </div>
        </template>
      </InfoModal>
    </VFlex>
  </VLayout>
</template>

<script>

  import _ from 'underscore';
  import Constants from 'edit_channel/constants/index';
  import InfoModal from 'edit_channel/sharedComponents/InfoModal.vue';
  import { translate } from 'edit_channel/utils/string_helper';

  const roleIcons = { coach: 'local_library' };

  // Vuetify item-text property must use objects to translate
  const roleMap = _.map(Constants.Roles, r => {
    return {
      id: r,
      icon: roleIcons[r],
    };
  });

  export default {
    name: 'VisibilityDropdown',
    $trs: {
      labelText: 'Visible to',
      visibilityHeader: 'What is content visibility?',
      visibilityDescription:
        'Content visibility determines what type of Kolibri users can see this content.',
      coach:
        'This is support content and is visible only to coaches (teachers, facilitators, administrators)',
      learner: 'This content is visible to anyone',
      visibilityRequired: 'Visibility is required',
    },
    components: {
      InfoModal,
    },
    props: {
      role: {
        type: String,
        default: 'learner',
        validator: function(value) {
          return !value || _.contains(Constants.Roles, value);
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
    data() {
      return {
        rules: [v => !!v || this.$tr('visibilityRequired')],
      };
    },
    computed: {
      roles() {
        return roleMap;
      },
    },
    methods: {
      handleInput(role) {
        this.$emit('changed', role);
      },
      translate(item) {
        return translate(item.id || item);
      },
    },
  };

</script>


<style lang="less" scoped>

  @import '../../../less/global-variables.less';

  .v-icon {
    margin-right: 5px;
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
