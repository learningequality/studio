<template>

  <KModal
    :title="$tr('changeLanguageModalHeader')"
    :submitText="$tr('confirmAction')"
    :cancelText="$tr('cancelAction')"
    @cancel="cancel"
    @submit="setLang"
  >
    <KGrid>
      <KGridItem
        v-for="(languageCol, index) in splitLanguageOptions"
        :key="index"
        :class="{ 'offset-col': $vuetify.smAndDown && index === 1 }"
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <KRadioButtonGroup>
          <KRadioButton
            v-for="language in languageCol"
            :key="language.id"
            v-model="selectedLanguage"
            :buttonValue="language.id"
            :label="language.lang_name"
            :title="language.english_name"
            class="language-name"
          />
        </KRadioButtonGroup>
      </KGridItem>
    </KGrid>

  </KModal>

</template>


<script>

  import { currentLanguage } from '../i18n';
  import languageSwitcherMixin from './mixin';

  export default {
    name: 'LanguageSwitcherModal',
    mixins: [languageSwitcherMixin],
    data() {
      return {
        selectedLanguage: currentLanguage,
      };
    },
    computed: {
      splitLanguageOptions() {
        const secondCol = this.languageOptions;
        const firstCol = secondCol.splice(0, Math.ceil(secondCol.length / 2));

        return [firstCol, secondCol];
      },
    },
    methods: {
      setLang() {
        if (currentLanguage === this.selectedLanguage) {
          this.cancel();
          return;
        }

        this.switchLanguage(this.selectedLanguage);
      },
      cancel() {
        this.$emit('cancel');
      },
    },
    $trs: {
      changeLanguageModalHeader: 'Change language',
      confirmAction: 'Confirm',
      cancelAction: 'Cancel',
    },
  };

</script>


<style lang="scss" scoped>

  @import './language-names';

  .language-name {
    @include font-family-language-names;
  }

  .offset-col {
    margin-top: -8px;
  }

</style>
