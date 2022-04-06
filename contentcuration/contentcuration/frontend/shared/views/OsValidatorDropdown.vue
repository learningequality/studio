<template>
    <VAutocomplete
          v-model="os_validator"
          class="language-dropdown"
          label="OS Validators"
          box
          v-bind="$attrs"
          :items="[
              {text: 'Windows'},
              {text: 'Linux'},
          ]"
          color="primary"
          itemValue="id"
          autoSelectFirst
          :allowOverflow="false"
          clearable
          :rules="rules"
          :required="required"
          :search-input.sync="input"
          :menu-props="menuProps"
          :multiple="multiple"
          :chips="multiple"
          @change="input = ''"
          @focus="$emit('focus')"
        >
        </VAutocomplete>
</template>

<script>
export default{
    name:'ValidatedFor'
}
</script>