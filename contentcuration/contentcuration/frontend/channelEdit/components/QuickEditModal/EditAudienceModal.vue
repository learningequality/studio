<template>

  <KModal
    :title="$tr('editAudienceTitle')"
    :submitText="$tr('saveAction')"
    :cancelText="$tr('cancelAction')"
    data-test="edit-audience-modal"
    @submit="handleSave"
    @cancel="close"
  >
    <p
      v-if="resourcesSelectedText.length > 0"
      data-test="resources-selected-message"
    >
      {{ resourcesSelectedText }}
    </p>
    <template v-if="isMultipleAudience">
      <p data-test="multiple-audience-message">
        {{ $tr('multipleAudience') }}
      </p>
      <Divider />
    </template>
    <h4 class="modal-subheading">
      {{ $tr('visibleTo') }}
    </h4>
    <div data-test="roles-options-list">
      <KRadioButtonGroup>
        <KRadioButton
          v-for="rol in rolesOptions"
          :key="rol.value"
          v-model="selectedRol"
          data-test="rol-radio-button"
          :label="rol.label"
          :buttonValue="rol.value"
          :description="rol.description"
        />
      </KRadioButtonGroup>
    </div>
    <Divider />

    <KCheckbox
      :checked="forBeginners"
      data-test="for-beginners-checkbox"
      :label="$tr('forBeginnersCheckbox')"
      @change="value => (forBeginners = value)"
    />
  </KModal>

</template>


<script>

  import { mapGetters, mapActions } from 'vuex';
  import { RolesList, RolesNames } from 'shared/leUtils/Roles';
  import { ResourcesNeededTypes } from 'shared/constants';
  import { constantsTranslationMixin } from 'shared/mixins';
  import { hasMultipleFieldValues } from 'shared/utils/helpers';
  import commonStrings from 'shared/translator';

  export default {
    name: 'EditAudienceModal',
    mixins: [constantsTranslationMixin],
    props: {
      nodeIds: {
        type: Array,
        required: true,
      },
      resourcesSelectedText: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        selectedRol: '',
        forBeginners: false,
      };
    },
    computed: {
      ...mapGetters('contentNode', ['getContentNodes']),
      nodes() {
        return this.getContentNodes(this.nodeIds);
      },
      rolesOptions() {
        return RolesList.map(role => ({
          value: role,
          label: this.translateConstant(role),
          description: this.rolesDescription[role],
        }));
      },
      rolesDescription() {
        return {
          [RolesNames.COACH]: this.$tr('visibleToCoaches'),
          [RolesNames.LEARNER]: this.$tr('visibleToAnyone'),
        };
      },
      hasMultipleRoleVisibilities() {
        return hasMultipleFieldValues(this.nodes, 'role_visibility');
      },
      hasMultipleForBeginnersValues() {
        let accValue = null;
        for (const node of this.nodes) {
          const value = Boolean(
            node.learner_needs && node.learner_needs[ResourcesNeededTypes.FOR_BEGINNERS],
          );
          if (accValue === null) {
            accValue = value;
          } else if (accValue !== value) {
            return true;
          }
        }
        return false;
      },
      isMultipleAudience() {
        return this.hasMultipleRoleVisibilities || this.hasMultipleForBeginnersValues;
      },
    },
    created() {
      const roles = [...new Set(this.nodes.map(node => node.role_visibility))];
      if (roles.length === 1) {
        this.selectedRol = roles[0] || '';
      }
      this.forBeginners = this.nodes.every(node => {
        return node.learner_needs && node.learner_needs[ResourcesNeededTypes.FOR_BEGINNERS];
      });
    },
    methods: {
      ...mapActions('contentNode', ['updateContentNode']),
      close(changed = false) {
        this.$emit('close', {
          changed,
        });
      },
      async handleSave() {
        const changed = this.nodes.some(node => {
          return (
            node.role_visibility !== this.selectedRol ||
            (node.learner_needs &&
              node.learner_needs[ResourcesNeededTypes.FOR_BEGINNERS] !== this.forBeginners)
          );
        });

        await Promise.all(
          this.nodes.map(node => {
            const learnerNeeds = {
              ...node.learner_needs,
              [ResourcesNeededTypes.FOR_BEGINNERS]: this.forBeginners || null,
            };
            return this.updateContentNode({
              id: node.id,
              learner_needs: learnerNeeds,
              role_visibility: this.selectedRol || null,
            });
          }),
        );
        /* eslint-disable-next-line kolibri/vue-no-undefined-string-uses */
        this.$store.dispatch('showSnackbarSimple', commonStrings.$tr('changesSaved'));
        this.close(changed);
      },
    },
    $trs: {
      editAudienceTitle: 'Edit audience',
      saveAction: 'Save',
      cancelAction: 'Cancel',
      forBeginnersCheckbox: 'For beginners',
      visibleTo: 'Visible to:',
      visibleToAnyone: 'Resources are visible to anyone',
      visibleToCoaches:
        'Resources are visible only to coaches (teachers, facilitators, administrators)',
      multipleAudience:
        'The selected resources are visible to different audiences. Choosing an option below will change the visibility of all selected resources.',
    },
  };

</script>


<style scoped>

  .modal-subheading {
    margin-bottom: 12px;
  }

</style>
