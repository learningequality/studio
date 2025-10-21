<template>

  <KModal
    v-if="show"
    :size="600"
    :title="'Send Email'"
    :submitText="$tr('sendButton')"
    :cancelText="$tr('cancelButton')"
    data-test="email-dialog"
    @submit="submit"
    @cancel="cancel"
  >
    <form
      ref="form"
      @submit.prevent="submit"
    >
      <VCardText class="pb-4 pt-3">
        <StudioBanner
          v-if="showInvalidText && Boolean(errorCount())"
          error
          class="studio-banner"
        >
          {{ errorText() }}
        </StudioBanner>

        <div class="align-top layout-row mb-2">
          <div class="flex-shrink pa-2">From:</div>
          <div class="flex-grow">
            <StudioChip
              :text="senderEmail"
              :small="true"
            />
          </div>
        </div>
        <div class="align-top layout-row">
          <div class="flex-shrink pa-2">To:</div>
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
                    @input="remove(item.id)"
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
          :label="'Subject line'"
          :required="true"
          :invalid="errors.subject"
          :showInvalidText="showInvalidText && errors.subject"
          :invalidText="$tr('fieldRequiredText')"
          :showLabel="true"
          :appearanceOverrides="getAppearanceOverrides(errors.subject)"
        />
        <div class="caption grey--text">Add placeholder to message</div>
        <div class="mb-1">
          <VBtn
            v-for="placeholder in placeholders"
            :key="`placeholder-${placeholder.label}`"
            small
            round
            depressed
            color="grey lighten-4"
            style="text-transform: none"
            @click="addPlaceholder(placeholder.placeholder)"
          >
            {{ placeholder.label }}
          </VBtn>
        </div>
        <div class="email-textarea">
          <KTextbox
            ref="message"
            v-model="message"
            :label="'Email body'"
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
      </VCardText>
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
  import StudioBanner from 'shared/views/StudioBanner';
  import StudioChip from 'shared/views/StudioChip';

  const formMixin = generateFormMixin({
    subject: { required: true },
    message: { required: true },
  });

  export default {
    name: 'EmailUsersDialog',
    components: {
      ExpandableList,
      StudioBanner,
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
        this.$refs.message.focus();
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

  ::v-deep .v-chip__close {
    padding-top: 4px;
  }

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

  .studio-banner {
    margin-top: 8px;
    margin-bottom: 8px;
  }

</style>
