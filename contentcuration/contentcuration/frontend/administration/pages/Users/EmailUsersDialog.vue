<template>

  <KModal
    v-if="show"
    :size="600"
    :title="$tr('sendEmailTitle')"
    :submitText="$tr('sendButton')"
    :cancelText="$tr('cancelButton')"
    data-test="email-dialog"
    @submit="submit"
    @cancel="cancel"
  >
    <form
      ref="form"
      @submit.prevent="onSubmit"
    >
      <div class="pb-4 pt-3">
        <div class="align-top layout-row mb-2">
          <div class="flex-shrink pa-2">{{ $tr('fromLabel') }}:</div>
          <div class="flex-grow">
            <StudioChip
              :text="senderEmail"
              :small="true"
            />
          </div>
        </div>
        <div class="align-top layout-row">
          <div class="flex-shrink pa-2">{{ $tr('toLabel') }}:</div>
          <div
            class="flex-grow"
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
                <div class="chip-tooltip-container">
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
                    :small="true"
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
            <StudioChip
              v-else-if="usersFilterFetchQueryParams"
              :small="true"
            >
              {{ searchString }}
            </StudioChip>
          </div>
        </div>
        <KTextbox
          v-model="subject"
          class="mt-4"
          :label="$tr('subjectLabel')"
          :required="true"
          :invalid="errors.subject"
          :showInvalidText="showInvalidText && errors.subject"
          :invalidText="$tr('fieldRequiredText')"
          :showLabel="true"
          :appearanceOverrides="getAppearanceOverrides(errors.subject)"
        />
        <div class="caption grey--text">{{ $tr('addPlaceholderText') }}</div>
        <div class="placeholder-buttons-container">
          <KButton
            v-for="placeholder in placeholders"
            :key="`placeholder-${placeholder.label}`"
            class="placeholder-button"
            :class="placeholderButtonClasses"
            :style="placeholderButtonStyles"
            appearance="basic-button"
            :text="$tr(placeholder.translationKey)"
            @click="addPlaceholder(placeholder.placeholder)"
          />
        </div>
        <div class="email-textarea">
          <KTextbox
            ref="message"
            v-model="message"
            :label="$tr('emailBodyLabel')"
            :required="true"
            :invalid="errors.message"
            :showInvalidText="showInvalidText && errors.message"
            :invalidText="$tr('fieldRequiredText')"
            :showLabel="true"
            :appearanceOverrides="getAppearanceOverrides(errors.message)"
            :floatingLabel="false"
            :textArea="true"
          />
        </div>
      </div>
    </form>

    <!-- Warning modal for draft -->
    <KModal
      v-if="showWarning"
      :title="$tr('draftWarningTitle')"
      :submitText="$tr('discardDraftButton')"
      :cancelText="$tr('keepOpenButton')"
      data-test="confirm"
      @submit="close"
      @cancel="showWarning = false"
    >
      <p>{{ $tr('draftWarningText') }}</p>
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
        recipients: [],
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
      placeholderButtonClasses() {
        return {
          'kbutton-small': true,
          'kbutton-round': true,
          'kbutton-depressed': true,
        };
      },
      placeholderButtonStyles() {
        return {
          backgroundColor: this.$themePalette.grey.v_200,
          padding: '0 12px', // Ensure consistent padding
          color: this.$themePalette.grey.v_900, // Text color for better contrast
        };
      },
      placeholders() {
        return [
          {
            label: 'First name',
            placeholder: '{first_name}',
            translationKey: 'firstNamePlaceholder',
          },
          {
            label: 'Last name',
            placeholder: '{last_name}',
            translationKey: 'lastNamePlaceholder',
          },
          {
            label: 'Email',
            placeholder: '{email}',
            translationKey: 'emailPlaceholder',
          },
          {
            label: 'Date',
            placeholder: '{current_date}',
            translationKey: 'datePlaceholder',
          },
          {
            label: 'Time',
            placeholder: '{current_time}',
            translationKey: 'timePlaceholder',
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
      getAppearanceOverrides(isInvalid) {
        const baseStyles = { maxWidth: '100%', width: '100%' };
        if (isInvalid) {
          return {
            ...baseStyles,
            focusBorderColor: this.$themeTokens.error,
            focusBoxShadow: `0 0 0 2px ${this.$themeTokens.error}33`,
          };
        }
        return baseStyles;
      },

      // Form mixin methods
      // eslint-disable-next-line kolibri/vue-no-unused-methods, vue/no-unused-properties
      onValidationFailed() {
        this.showInvalidText = true; // Ensure errors are shown when validation fails
        // Scroll to error banner
        if (this.$refs.form && this.$refs.form.scrollIntoView) {
          this.$refs.form.scrollIntoView({ behavior: 'smooth' });
        }
      },

      // eslint-disable-next-line kolibri/vue-no-unused-methods, vue/no-unused-properties
      onSubmit() {
        this.showInvalidText = true; // Show errors after first submit attempt

        if (this.errorCount() > 0) {
          return; // Don't proceed if there are errors
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
    $trs: {
      sendEmailTitle: 'Send Email',
      fromLabel: 'From',
      toLabel: 'To',
      subjectLabel: 'Subject line',
      emailBodyLabel: 'Email body',
      addPlaceholderText: 'Add placeholder to message',
      firstNamePlaceholder: 'First name',
      lastNamePlaceholder: 'Last name',
      emailPlaceholder: 'Email',
      datePlaceholder: 'Date',
      timePlaceholder: 'Time',
      draftWarningTitle: 'Draft in progress',
      draftWarningText:
        'Draft will be lost upon exiting this editor. Are you sure you want to continue?',
      discardDraftButton: 'Discard draft',
      keepOpenButton: 'Keep open',
      cancelButton: 'Cancel',
      sendButton: 'Send email',
      fieldRequiredText: 'Field is required',
    },
  };

</script>


<style lang="scss" scoped>

  ::v-deep textarea {
    height: 120px;
    min-height: 120px;
  }

  /* Or if you want them completely inline without any breaks: */
  .chip-tooltip-container {
    display: inline;
    margin: 2px;
  }

  /* Custom layout styles to replace Vuetify flex system */
  .layout-row {
    display: flex;
    flex-direction: row;
  }

  .align-top {
    align-items: flex-start;
  }

  .flex-shrink {
    flex: 0 0 auto;
  }

  .flex-grow {
    flex: 1 1 auto;
  }

  .mb-2 {
    margin-bottom: 8px;
  }

  .mt-4 {
    margin-top: 16px;
  }

  .mb-1 {
    margin-bottom: 4px;
  }

  .pa-2 {
    padding: 8px;
  }

  .placeholder-buttons-container {
    display: flex;
    flex-wrap: wrap; /* Allow buttons to wrap to multiple lines */
    gap: 8px;
    width: 100%;
    padding: 8px;
  }

  .placeholder-button {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 88px; /* Fixed width 88px */
    height: 28px; /* Fixed height 28px */
    text-transform: none;
  }

  .kbutton-small {
    height: 28px; /* Fixed height 28px */
    min-height: 28px;
    padding: 0 8px; /* Adjusted padding for smaller button */
    font-size: 11px; /* Slightly smaller font for better fit */
  }

  .kbutton-round {
    border-radius: 14px; /* Half of height for perfect rounded corners */
  }

  .kbutton-depressed {
    box-shadow: none;
  }

</style>
