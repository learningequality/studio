<template>

  <li class="ListItem">
    {{channel.name}}
  </li>

</template>


<script>

import _ from 'underscore';
import stringHelper from '../../utils/string_helper';
import { mapActions } from 'vuex';

const RequiredBoolean = { type: Boolean, required: true };

export default {
  name: 'ChannelItem',
  $trs: {
  },
  props: {
    channel: {
      type: Object,
      required: true,
    }
  },
  computed: {
    togglerClass() {
      // return (this.isExpanded)? 'arrow_drop_down': 'arrow_drop_up';
    },
  },
  methods: Object.assign(
    mapActions('import', [
      'addItemToImportList',
      'removeItemFromImportList',
    ]),
    {
      handleCheckboxChange() {
        this.isChecked = !this.isChecked;
        if (this.isChecked) {
          this.addItemToImportList(_.clone(this.node));
        } else {
          this.removeItemFromImportList(this.node.id);
        }
      },
    }
  )
};

</script>


<style lang="less" scoped>

  @import '../../../../less/global-variables.less';

  .ListItem {
    width: -moz-max-content;
    width: max-content;
  }

  .ListItem__Label {
    padding: 0px 10px;
    font-size: 16px;
    .nodeIcon {
      color: @gray-500;
    }
    & > * {
      vertical-align: middle;
    }
  }

  .disabled {
    color: @gray-700;
    opacity: 1 !important;
    input[type=checkbox] {
      cursor: not-allowed !important;
    }
    .ListItem__Counter {
      background-color: @gray-400 !important;
    }
  }

</style>
