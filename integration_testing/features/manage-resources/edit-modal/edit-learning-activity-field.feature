Feature: Edit *Learning activity* field
	Across all file types

	Background:
		Given I am signed into Studio
			And I am in an editable channel with all resource types
		When I right click a resource
			And I click *Edit details*
		Then I see the *Edit details* modal for the resource
			And I see the *Learning activity* dropdown in the *Basic information* section

	Scenario: View learning activity options
		When I click the *Learning activity* dropdown
		Then I see multi-select checkboxes
			And I see the options: *Create*, *Explore*, *Listen*, *Practice*, *Read*, *Reflect*, *Watch*

	Scenario: Select options
		Given I see the options for *Learning activity*
		When I select the checkbox for an option
		Then I see that the option has a determinate checkbox
			And I see the chip for the selected option in the textbox
			And I see an *X* in the text field

	Scenario: Remove an option
		Given I see the options for *Learning activity*
			And an option is selected
		When I uncheck the selected checkbox for an option
		Then the checkbox is no longer selected
			And I do not see the chip in the *Learning activity* textbox

	Scenario: Remove an option through the chip
		Given I see the options for *Learning activity*
			And an option is selected
		When I click the *X* icon of the chip
		Then the chip is removed from the *Learning activity* textbox
			And the previously selected option in the *Learning activity* dropdown is no longer selected

	Scenario: Clear all options in the text field
		Given I see that several options for *Learning activity* are selected
		When I click the *X* in the text field
		Then I do not see any *Learning activity* options in the text field
			And I do not see the *X* in the text field

	Scenario: Chips overflow in the text field
		When I click <X> checkboxes in the *Learning activity* dropdown
			And the length of the chips exceeds the width of the dropdown
		Then I see the chips go to the next line
			And the height of the *Learning activity* dropdown expands accordingly

	Scenario: See that learning activity field is required
		Given the *Learning activity* field of resource is empty
		When I click the *Learning activity* text field
			And I lose focus on the *Learning activity* text field
		Then I see that the *Learning activity* is in an error state
			And I see *Learning activity is required*
		When I click *FINISH*
		Then I see the resource in the topic tree
			And I see a red error icon on the resource
		When I left-click the resource
		Then I see the previewer for the resource
			And I see there is no learning activity label at the top left
			And I see the *Learning activity* field has a red error icon
			And I see a *Missing learning activity* message in red text
