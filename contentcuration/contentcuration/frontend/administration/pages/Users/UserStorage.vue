<template>

  <VForm
    ref="form"
    lazy-validation
    @submit.prevent="submit"
  >
    <VLayout
      row
      wrap
    >
      <VFlex style="max-width: 148px">
        <VTextField
          v-model="space"
          label="Size"
          single-line
          type="number"
          reverse
          box
          class="mr-2"
          min="0"
          required
          :rules="spaceRules"
        />
      </VFlex>
      <DropdownWrapper
        component="VFlex"
        style="max-width: 75px"
      >
        <template #default="{ attach, menuProps }">
          <VSelect
            v-model="unit"
            :items="unitOptions"
            :attach="attach"
            :menuProps="menuProps"
            box
            single-line
            required
            :rules="unitRules"
          />
        </template>
      </DropdownWrapper>
    </VLayout>
    <KButtonGroup>
      <KButton
        v-if="showCancel"
        appearance="flat-button"
        text="Cancel"
        data-test="cancel"
        @click="cancel"
      />
      <KButton
        :primary="true"
        text="Save changes"
        type="submit"
        data-test="submit"
      />
    </KButtonGroup>
  </VForm>

</template>


<script>

  import { mapActions } from 'vuex';
  import findLastKey from 'lodash/findLastKey';
  import { ONE_B, ONE_KB, ONE_MB, ONE_GB, ONE_TB } from 'shared/constants';
  import DropdownWrapper from 'shared/views/form/DropdownWrapper';

  const units = {
    ONE_B,
    ONE_KB,
    ONE_MB,
    ONE_GB,
    ONE_TB,
  };

  export default {
    name: 'UserStorage',
    components: { DropdownWrapper },
    props: {
      value: {
        type: Number,
        required: true,
      },
      userId: {
        type: String,
        required: true,
      },
      showCancel: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        space: 0,
        unit: 'ONE_MB',
      };
    },
    computed: {
      unitOptions() {
        return [
          { value: 'ONE_B', text: 'B' },
          { value: 'ONE_KB', text: 'KB' },
          { value: 'ONE_MB', text: 'MB' },
          { value: 'ONE_GB', text: 'GB' },
          { value: 'ONE_TB', text: 'TB' },
        ];
      },
      spaceRules() {
        return [
          v => v !== '' || 'This field is required',
          v => v >= 0 || 'Must be greater than or equal to 0',
        ];
      },
      unitRules() {
        return [v => Boolean(v) || 'This field is required'];
      },
    },
    mounted() {
      this.setUnits();
    },
    methods: {
      ...mapActions('userAdmin', ['updateUser']),
      setUnits() {
        this.unit = findLastKey(units, u => this.value >= u);
        this.space = this.value / units[this.unit];
      },
      submit() {
        if (this.$refs.form.validate()) {
          return this.updateUser({
            id: this.userId,
            disk_space: Number(this.space) * units[this.unit],
          }).then(() => {
            this.setUnits();
            this.$emit('close');
            this.$store.dispatch('showSnackbarSimple', 'Changes saved');
          });
        } else {
          return Promise.resolve();
        }
      },
      cancel() {
        this.unit = findLastKey(units, u => this.value >= u);
        this.space = this.value / units[this.unit];
        this.$emit('close');
      },
    },
  };

</script>
