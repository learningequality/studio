Feature: Bulk edit multiple resources

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page
			And there are available resources of different types

	Scenario: Bulk edit folders
		When I select at least 2 folders
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected folders
			And I see that all the folders are selected in the left section
			And I see the following text at the top: Editing details for N folders, 0 resources
		And I see the *Basic information* section containing the *Tags* field
		And I see the *Audience* section with the *Language* drop-down
		When I enter a new tag
			And I select a new language
			And I click the *Finish* button
		Then I am back at the channel editor
		When I select again the same folders
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected folders
			And I can see that my previously applied changes are saved

	Scenario: Bulk edit exercises
		When I select at least 2 exercises
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected exercises
			And I see that all the exercises are selected in the left section
			And I see the following text at the top: Editing details for 0 folders, N resources
			And I see the *Basic information* section containing the *Tags* field
			And I see the *Assessment options* section with the *Randomize question order for learners* checkbox
			And I see the *Completion* section with the *Allow learners to mark as complete* checkbox, the *Completion* and *Goal* drop-downs
			And I see the *Audience* section with the *Language* and *Visible to* drop-downs
			And I see the *Source* section with *Author*, *Provider*, *Aggregator*, *License* and *Copyright* holder fields
		When I make any modifications
			And I click the *Finish* button
		Then I am back at the channel editor
		When I select again the same exercises
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected exercises
			And I can see that my previously applied changes are saved

	Scenario: Bulk edit resources of the same type
		When I select at least 2 resources of the same type
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected folders
			And I see that all the folders are selected in the left section
			And I see the following text at the top: Editing details for N folders, 0 resources
		And I see the *Basic information* section containing the *Tags* field
		And I see the *Audience* section with the *Language* drop-down
		When I enter a new tag
			And I select a new language
			And I click the *Finish* button
		Then I am back at the channel editor
		When I select again the same folders
			And I click the *Edit details* icon
		Then I see the *Edit details* modal for the selected folders
			And I can see that my previously applied changes are saved

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
