Feature: Edit *Requirements* field
	Across all file types

	Background:
		Given I am signed into Studio
			And I am in an editable channel with all resource types
		When I right click a resource
			And I select *Edit details*
		Then I see the *Edit details* modal for the resource
			And I see the *Requirements* dropdown in the *Basic information* section

	Scenario: View *Requirements* options
		When I click the *Requirements* dropdown
		Then I see multi-select checkboxes
			And I see the options: *Working with peers*, *Working with a teacher*, *Internet connection*, *Other software tools*, *Paper and pencil*, and *Other supplies*

	Scenario: Select options
		Given I see the options for *Requirements*
		When I click on the checkbox for an option
		Then I see the option has a determinate checkbox
			And I see the chip for the option appear in the textbox
			And I see an *X* in the text field

	Scenario: Remove an option
		Given I see the options for *Requirements*
			And an option is selected
		When I click the selected checkbox for the option
		Then I see that the checkbox for the option is empty
			And I do not see the chip in the textbox

	Scenario: Remove an option through chip
		Given I see the options for *Requirements*
			And an option is selected
		When I click the *X* in the chip
		Then I do not see the chip for the option in the textbox
			And I do not see the option selected in the *Requirements* dropdown

	Scenario: Clear all options in the text field
		Given I see that several options for *Requirements* are selected
		When I click the *X* in the text field
		Then I don't see any *Requirements* options in the text field
			And I do not see the *X* in the text field

	Scenario: Chips overflow in the text field
		When I click <X> checkboxes in the *Requirements* dropdown
			And the length of the chips exceeds the width of the dropdown
		Then I see the chips go to the next line
			And the height of the *Requirements* dropdown grows to contain it

	Scenario: See that *Requirements* field is optional
		Given the *Requirements* field of a resource is empty
		When I click *FINISH*
		Then I see resource in the topic tree
			And I do not see an error icon
		When I left-click the resource
		Then I see the previewer for the resource
			And I see that the *Requirements* field is empty
