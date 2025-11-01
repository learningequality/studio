<template>

  <KModal
    v-if="show"
    :size="600"
    title="Send Email"
    submitText="Send email"
    cancelText="Cancel"
    data-test="email-dialog"
    @submit="submit"
    @cancel="cancel"
  >
    <form
      ref="form"
      @submit.prevent="onSubmit"
    >
      <div class="form-container">
        <div class="form-row form-row-margin">
          <div class="form-label">From:</div>
          <div class="form-content">
            <StudioChip :text="senderEmail" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-label">To:</div>
          <div
            style="flex-grow: 1"
            data-test="to-line"
          >
            <ExpandableList
              v-if="initialRecipients"
              :items="users"
              :max="4"
              inline
              :delimit="false"
            >
              <template #item="{ item }">
                <div class="chip-container">
                  <KTooltip
                    :refs="getRefs()"
                    :reference="`tooltip-${item.id}`"
                    placement="bottom"
                  >
                    <span>{{ item.name }} &lt;{{ item.email }}&gt;</span>
                  </KTooltip>
                  <StudioChip
                    :ref="`tooltip-${item.id}`"
                    :text="item.name"
                    :close="recipients.length > 1"
                    data-test="remove"
                    @close="remove(item.id)"
                  >
                    <div style="max-width: 72px">
                      <div class="text-truncate">
                        {{ item.name }}
                      </div>
                    </div>
                  </StudioChip>
                </div>
              </template>
            </ExpandableList>
            <StudioChip v-else-if="usersFilterFetchQueryParams">
              {{ searchString }}
            </StudioChip>
          </div>
        </div>
        <KTextbox
          v-model="subject"
          class="mt-4"
          label="Subject line"
          :required="true"
          :invalid="errors.subject"
          :showInvalidText="showInvalidText && errors.subject"
          invalidText="Field is required"
          :showLabel="true"
          :appearanceOverrides="getAppearanceOverrides(errors.subject)"
        />
        <div :style="{ color: $themeTokens.annotation, fontSize: '12px' }">
          Add placeholder to message
        </div>
        <div class="placeholder-buttons-container">
          <button
            v-for="placeholder in placeholders"
            :key="`placeholder-${placeholder.label}`"
            class="placeholder-button"
            :style="placeholderButtonStyles"
            type="button"
            @click="addPlaceholder(placeholder.placeholder)"
          >
            {{ placeholder.label }}
          </button>
        </div>
        <div class="email-textarea">
          <KTextbox
            ref="message"
            v-model="message"
            label="Email body"
            :required="true"
            :invalid="errors.message"
            :showInvalidText="showInvalidText && errors.message"
            invalidText="Field is required"
            :showLabel="true"
            :appearanceOverrides="getAppearanceOverrides(errors.message)"
            :textArea="true"
          />
        </div>
      </div>
    </form>

    <!-- Warning modal for draft -->
    <KModal
      v-if="showWarning"
      title="Draft in progress"
      submitText="Discard draft"
      cancelText="Keep open"
      data-test="confirm"
      @submit="close"
      @cancel="showWarning = false"
    >
      <p>Draft will be lost upon exiting this editor. Are you sure you want to continue?</p>
    </KModal>
  </KModal>

</template>


<script>

  import { mapActions, mapGetters } from 'vuex';
  import ExpandableList from 'shared/views/ExpandableList';
  import { generateFormMixin } from 'shared/mixins';
  import StudioChip from 'shared/views/StudioChip';

  const formMixin = generateFormMixin({
    subject: { required: true },
    message: { required: true },
  });

  export default {
    name: 'EmailUsersDialog',
    components: {
      ExpandableList,
      StudioChip,
    },
    mixins: [formMixin],
    props: {
      value: {
        type: Boolean,
        default: false,
      },
      userTypeFilter: {
        type: String,
        default: 'all',
      },
      locationFilter: {
        type: String,
        default: null,
      },
      keywordFilter: {
        type: String,
        default: null,
      },
      usersFilterFetchQueryParams: {
        type: Object,
        default: null,
      },
      initialRecipients: {
        type: Array,
        required: false,
        default: null,
      },
    },
    data() {
      return {
        showWarning: false,
        recipients: this.initialRecipients || [],
        showInvalidText: false,
      };
    },
    computed: {
      ...mapGetters('userAdmin', ['getUsers']),
      show: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      users() {
        return this.getUsers(this.recipients);
      },
      senderEmail() {
        return window.senderEmail;
      },
      placeholderButtonStyles() {
        return {
          backgroundColor: this.$themePalette.grey.v_300,
          color: this.$themeTokens.text,
        };
      },
      placeholders() {
        return [
          {
            label: 'First name',
            placeholder: '{first_name}',
          },
          {
            label: 'Last name',
            placeholder: '{last_name}',
          },
          {
            label: 'Email',
            placeholder: '{email}',
          },
          {
            label: 'Date',
            placeholder: '{current_date}',
          },
          {
            label: 'Time',
            placeholder: '{current_time}',
          },
        ];
      },
      searchString() {
        const users = this.userTypeFilter === 'all' ? '' : `${this.userTypeFilter} `;
        const location = this.locationFilter ? ` from ${this.locationFilter}` : '';
        const keywords = this.keywordFilter ? ` matching "${this.keywordFilter}"` : '';
        return `All ${users}users${location}${keywords}`;
      },
    },
    watch: {
      value(value) {
        if (value && this.initialRecipients) {
          this.recipients = this.initialRecipients;
        }
      },
    },
    methods: {
      ...mapActions('userAdmin', ['sendEmail']),
      cancel() {
        if (this.subject.trim() || this.message.trim()) {
          this.showWarning = true;
        } else {
          this.close();
        }
      },
      close() {
        this.show = false;
        this.subject = '';
        this.message = '';
        this.showWarning = false;
        this.showInvalidText = false;
        this.reset(); // Reset form validation state
      },
      addPlaceholder(placeholder) {
        this.message += ` ${placeholder}`;
        this.$refs.message.$el.focus();
      },
      remove(id) {
        this.recipients = this.recipients.filter(u => u !== id);
      },
      getRefs() {
        return this.$refs;
      },
      getAppearanceOverrides() {
        const baseStyles = { maxWidth: '100%', width: '100%' };

        return baseStyles;
      },

      // Form mixin methods
      // eslint-disable-next-line kolibri/vue-no-unused-methods, vue/no-unused-properties
      onValidationFailed() {
        this.showInvalidText = true;
        if (this.$refs.form && this.$refs.form.scrollIntoView) {
          this.$refs.form.scrollIntoView({ behavior: 'smooth' });
        }
      },

      onSubmit() {
        this.showInvalidText = true;

        if (this.errorCount() > 0) {
          return;
        }

        const query = this.initialRecipients
          ? { ids: this.recipients.join(',') }
          : this.usersFilterFetchQueryParams;

        this.sendEmail({
          query,
          subject: this.subject,
          message: this.message,
        })
          .then(() => {
            this.close();
            this.$store.dispatch('showSnackbarSimple', 'Email sent');
          })
          .catch(() => {
            this.$store.dispatch('showSnackbarSimple', 'Email failed to send');
          });
      },
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep textarea {
    height: 120px;
    min-height: 120px;
  }

  .chip-container {
    display: inline;
    margin: 2px;
  }

  .form-container {
    padding-top: 12px;
    padding-bottom: 16px;
  }

  .form-row {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
  }

  .form-row-margin {
    margin-bottom: 8px;
  }

  .form-label {
    flex: 0 0 auto;
    padding: 8px;
  }

  .form-content {
    flex: 1 1 auto;
  }

  .placeholder-buttons-container {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    width: 100%;
    padding: 8px;
  }

  .placeholder-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 88px;
    height: 28px;
    font-size: 11px;
    text-transform: none;
    cursor: pointer;
    border-radius: 14px;
    transition: all 0.2s ease;

    &:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(2px);
    }
  }

</style>
