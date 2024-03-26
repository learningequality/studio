Feature: Edit multiple resources at the same time in the edit modal
	Users can apply dropdown options to multiple resources at one time

	Background:
		Given I am signed into Studio
			And I am in an editable channel with all resource types
		When I select <X> resource checkboxes
			And I click *Edit* in the toolbar
		Then I see all <X> resources in the *Edit details* modal

	Scenario: See which fields are hidden and shown
		When I select more than one checkbox in the resource panel on the left
		Then I see *Editing details for <X> folders, <X> resources*
			And I see text fields and dropdown options that are common to all <X> selected resources
			And I do not see text fields and dropdown options that are not common to all <X> selected resources
			And I do not see the resource renderer, *Title*, *Description*, *Preview files*, or *Thumbnail*

	Scenario: View mixed settings on a multi-select dropdown #not implemented, don't test
		When I select <X> checkboxes in the resource panel on the left
			And those <X> resources have mixed settings across different dropdown fields
		Then I see a chip with the *Mixed* label for those dropdowns
			And I see checkboxes are indeterminately selected
		When I click a dropdown that has the *Mixed* label
			Then I see an indeterminate checkbox for each option that partially applies to all <X> selected resources

	Scenario: Select an indeterminate checkbox in a multi-select dropdown #not implemented, don't test
		Given <multi-select dropdown> has a *Mixed* chip
		When I click <multi-select dropdown>
		Then I see <option> is indeterminately selected
		When I click <option>
		Then I see <option> is determinately selected
			And I see <option> is a chip in <multi-select dropdown>

	Scenario: View mixed settings on a single-select dropdown #not implemented, don't test
		Given <single-select dropdown> says *Mixed*
		When I click <single-select dropdown>
		Then I see all options
			And I see that none of them are selected
		When I click <option>
		Then I see <option> in the dropdown
			And I see <option> is selected in the dropdown options

	Scenario: View mixed settings on a checkbox #not implemented, don't test
		When I select <X> checkboxes in the resource panel on the left
			And those <X> resources have mixed settings across checkbox settings
			And I see that some checkboxes are indeterminate
		When I click an indeterminate checkbox for <option>
		Then I see the checkbox is determinate
			And I do not see the chip with a *Mixed* label
			And I see a chip for <option> in the dropdown
			And I see that all <X> selected resources are applied with <option>

	Scenario: Apply a setting to all selected resources
			When I select <X> checkboxes in the resource panel on the left
			When I open a dropdown
			When I select <option>
			Then I see a chip in the dropdown with <option>
				And I see the checkbox is determinate

	Scenario: Remove a setting from all resources
		Given <option> applies to all selected resources
			And I see a chip for <option> in <multi-select dropdown>
		When I click *X* on the chip of <option>
		Then I do not see the chip for <option>
			And I see that none of the resources have <option> applied for <multi-select dropdown>
