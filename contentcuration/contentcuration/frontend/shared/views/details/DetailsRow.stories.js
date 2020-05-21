import DetailsRow from './DetailsRow.vue';

export default { title: 'DetailsRow' };

export const WithDefinition = () => ({
  components: { DetailsRow },
  data() {
    return {
      label: 'Label',
      definition: 'Definition',
      text: 'Text',
    };
  },
  template: `
    <DetailsRow
      :label="label"
      :definition="definition"
      :text="text"
    />
  `,
});

export const WithoutDefinition = () => ({
  components: { DetailsRow },
  data() {
    return {
      label: 'Label',
      text: 'Text',
    };
  },
  template: `
    <DetailsRow
      :label="label"
      :text="text"
    />
  `,
});
