<template>
  
  <form @submit.prevent="submit">
    <div style="padding-bottom: 16px;">
      <KTextbox
        v-model='operating_system'
        label="Operating system (e.g. Windows, MacOS, Linux)"
        :invalid="errors.includes('operating_system')"
        invalidText="This field is required"
      />
      <KTextbox
        v-model='browser'
        label="Browser (e.g. Chrome, Firefox, Safari)"
        :invalid="errors.includes('browser')"
        invalidText="This field is required"
      />
      <KTextbox
        v-model='channel'
        label="Channel you discovered the issue in"
        :invalid="errors.includes('channel')"
        invalidText="This field is required"
      />
      <KTextbox
        v-model='description'
        label="Describe your issue with as much detail as possible"
        :textArea="true"
        :invalid="errors.includes('description')"
        invalidText="This field is required"
      />
    </div>
    <KButtonGroup style="text-align: right; display: block;">
      <KButton appearance="flat-button" text="Cancel" @click="$emit('close')" />
      <KButton :primary="true" text="Submit" @click="submit" />
    </KButtonGroup>
  </form>

</template>


<script>

  import client from "../../../shared/client";

  export default {
    name: 'ReportIssueForm',
    data() {
      return {
        operating_system: '',
        browser: '',
        channel: '',
        description: '',
        errors: [],
      };
    },        
    methods: {
      submit() {
        const formData = {
          operating_system: this.operating_system,
          browser: this.browser,
          channel: this.channel,
          description: this.description,
          errors: [],
        };

        if(!this.validate(formData)) {
          return;
        }

        const path = window.Urls.issues_settings();

        client.post(path, formData)
          .then(response => {
            this.$store.dispatch('showSnackbar', { text: response.data });
          })
          .catch(e => {
            this.$store.dispatch('showSnackbar', { text: "Failed to submit the form" });
          })
          .finally(() => this.$emit('close'));
      },
      validate(formData) {
        let errorKeys = []
        Object.keys(formData).forEach(k => {
          if(Boolean(formData[k])) {
            return;
          } else {
            if(this.errors.includes(k)) {
              return;
            } else {
              this.errors.push(k);
            }
          }
        });
      },
    },
    watch: {
      operating_system(val) {
        let errors = this.errors;
        const idx = errors.indexOf('operating_system');

        if(idx !== -1) {
          this.errors = errors.filter(e => e !== 'operating_system');
        }
      },
      browser(val) {
        let errors = this.errors;
        const idx = errors.indexOf('browser');

        if(idx !== -1) {
          this.errors = errors.filter(e => e !== 'browser');
        }
      },
      channel(val) {
        let errors = this.errors;
        const idx = errors.indexOf('channel');

        if(idx !== -1) {
          this.errors = errors.filter(e => e !== 'channel');
        }
      },
      description(val) {
        let errors = this.errors;
        const idx = errors.indexOf('description');

        if(idx !== -1) {
          this.errors = errors.filter(e => e !== 'description');
        }
      },
    }
  }

</script>


<style lang="scss" scoped>

</style>
