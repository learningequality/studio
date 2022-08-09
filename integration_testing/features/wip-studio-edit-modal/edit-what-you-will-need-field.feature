Feature: Edit *What you will need* field
	Across all file types

	Background: 
		Given I am signed into Studio
			And I am in an editable channel with all resource types
		When I right click <resource>
		When I click *Edit details*
		Then I see the *Edit details* modal for the <resource>
			And I see the *What you will need* dropdown in the *Basic information* section

	Scenario: View *What you will need* options
		When I click the *What you will need* dropdown
		Then I see multi-select checkboxes
			And I see the options: *Teacher*, *Peers*, *Paper and pencil*, *Internet*, and *Other supplies*

	Scenario: Select options
		Given I see the options for *What you will need*
		When I click on the checkbox for <option>
		Then I see <option> has a determinate checkbox
			And I see the chip for <option> appear in the textbox
			And I see an *X* in the text field

	Scenario: Remove an option
		Given I see the options for *What you will need*
			And <option> is selected
		When I click the selected checkbox for <option>
		Then I see that the checkbox for <option> is empty
			And I do not see the chip in the textbox

	Scenario: Remove an option through chip
		Given I see the options for *What you will need*
			And <option> is selected
		When I click the *X* in the chip
		Then I do not see the chip for <option> in the textbox
			And I do not see <option> selected in the *What you will need* dropdown

	Scenario: Clear all options in the text field
		Given I see that several options for *What you will need* are selected
		When I click the *X* in the text field
		Then I do not see any *What you will need* options in the text field
			And I do not see the *X* in the text field

	Scenario: Chips overflow in the text field
		When I click <X> checkboxes in the *What you will need* dropdown
			And the length of the chips exceeds the width of the dropdown
		Then I see the chips go to the next line
			And the height of the *What you will need* dropdown grows to contain it

	Scenario: See that *What you will need* field is optional
		Given the *What you will need* field of a <resource> is empty
		When I click *FINISH*
		Then I see <resource> in the topic tree
			And I do not see an error icon
		When I left-click the <resource>
		Then I see the previewer for the <resource>
			And I see that the *What you will need* field is empty
