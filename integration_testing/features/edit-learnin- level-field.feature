Feature: Edit *Learning level* field
Across all file types

# Comment here

	Background: 
		Given I am signed into Studio
			And I am in an editable channel
		When I right click <resource>
		When I click *Edit details*
		Then I see the edit modal for <resource>
			And I see the *Level* dropdown in the *Basic information* section

	Scenario: View learning level options
		When I click the *Level* dropdown
		Then I see multi-select checkboxes
			And I see the options: *Preschool/Nursery*, *Lower primary*, *Upper primary*, *Lower secondary*, *Upper secondary*, *Tertiary*, *Specialized professional training*, *All levels -- basic skills*, *All levels -- work skills*

	Scenario: Select options
		Given I see the options for *Level*
		When I click on the checkbox for <option>
		Then I see <option> has a determinate checkbox
			And I see the chip for <option> appear in the textbox
			And I see an *X* in the text field

	Scenario: Remove an option
		Given I see the options for *Level*
			And <option> is selected
		When I click the selected checkbox for <option>
		Then I see that the checkbox for <option> is empty
			And I do not see the chip in the textbox

	Scenario: Remove an option through chip
		Given I see the options for *Level*
			And <option> is selected
		When I click the *X* in the chip
		Then I do not see the chip for <option> in the textbox
			And I do not see <option> selected in the *Level* dropdown

	Scenario: Clear all options in the text field
		Given I see that several options for *Level* are selected
		When I click the *X* in the text field
		Then I do not see any *Level* options in the text field
			And I do not see the *X* in the text field

	Scenario: Chips overflow in the text field
		When I click <X> checkboxes in the *Level* dropdown
			And the length of the chips exceeds the width of the dropdown
		Then I see the chips go to the next line
			And the height of the *Level* dropdown grows to contain it

	Scenario: See that learning level field is optional
		Given the *Level* field of <resource> is empty
		When I click *FINISH*
		Then I see <resource> in the topic tree
			And I do not see an error icon
		When I left-click <resource>
		Then I see the previewer for <resource>
			And I see the level field is empty


Examples:
| ???      | ??? | 
| ?????!?! |
