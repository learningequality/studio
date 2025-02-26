<script>

  import isArray from 'lodash/isArray';
  import isObject from 'lodash/isObject';
  import { VIcon } from 'vuetify/lib/components/VIcon';

  const NO_TRANSLATE = 'notranslate';

  // Follows example of https://github.com/vuetifyjs/vuetify/blob/v1.5.22/packages/vuetify/src/components/VIcon/VIcon.ts#L142
  export default {
    name: 'VIconWrapper',
    functional: true,

    render(createElement, { data, children }) {
      let classNames = data['class'];

      // Add `notranslate` class
      if (isArray(classNames)) {
        classNames.push(NO_TRANSLATE);
      } else if (isObject(classNames)) {
        classNames[NO_TRANSLATE] = true;
      } else {
        classNames = `${classNames || ''} ${NO_TRANSLATE}`;
      }

      data['class'] = classNames;
      return createElement(
        VIcon,
        data,
        data.props && data.props.iconName ? [data.props.iconName] : children
      );
    },
  };

</script>

<style lang="scss" scoped>

  // A workaround for this issue:
  // https://github.com/vuetifyjs/vuetify/issues/3462
  .v-icon {
    display: inline-flex !important;
  }

</style>
