Feature: Edit *Category* field
	Across all file types.

	Background:
		Given I am signed into Studio
			And I am in an editable channel with all resource types
		When I right click a resource
			And I click *Edit details*
		Then I see the *Edit details* modal for the resource
			And I see the *Category* dropdown in the *Basic information* section

	Scenario: View category options
		When I click the *Category* dropdown
		Then I see a nested checkbox list of all categories
			And I see that children checkboxes are aligned with the text of the parent category
		When I scroll through the category list
		Then I see a gray divider between top-level categories

	Scenario: Select first-level category option
		Given that <first-level category> checkbox is empty
		When I click <first-level category>
		Then I see that <first-level category> is determinately selected
			And I see that children categories are not selected
			And I see a chip with <first-level category> in the *Category* text field

	Scenario: Select second-level category option
		Given that <first-level category> checkbox is empty
		When I select <second-level category> under <first-level category>
		Then I see that <second-level category> is determinately selected
			And I see that <first-level category> is determinately selected
			And I see that children categories are not selected
			And I see that <second-level category> is represented as a chip in the *Category* text field
			And I do not see <first-level category> represented as a chip in the *Category* text field
		When I hover my mouse over the <second-level category> chip
		Then I see *<first-level category> - <second-level category>* in a tooltip

	Scenario: Select third-level category option
		Given that <first-level category> checkbox is empty
			And <second-level category> under <first-level category> is empty
		When I select <third-level category> under <second-level category>
		Then I see that <third-level category> is determinately selected
			And I see that <second-level category> is determinately selected
			And I see that <first-level category> is determinately selected
			And I see that <third-level category> is represented as a chip in the *Category* text field
			And I do not see <second-level category> represented as a chip in the *Category* text field
			And I do not see <first-level category> represented as a chip in the *Category* text field
		When I hover my mouse over the <third-level category> chip
		Then I see *<first-level category> - <second-level category> - <third-level category>* in a tooltip

	Scenario: Select child category while a parent category is selected
		Given that <first-level category> checkbox is selected
			And <first-level category> is a chip in the *Category* text field
		When I click <second-level category> under <first-level category>
		Then I see that <second-level category> is determinately selected
			And <first-level category> is still determinately selected
			And I see the chip in the *Category* text field changed to <second-level category>
			And I do not see <first-level category> as a chip in the *Category* text field

	Scenario: Select a parent category while a child category is selected
		Given that <third-level category> is selected
			And <third-level category> is a chip in the *Category* text field
		When I click <second-level category>, the parent of <third-level category>
		Then I see <third-level category> is not selected
			And I see <second-level category> is not selected
			And I see <first-level category> is determinately selected
			And I see <first-level category> is represented as a chip in the *Category* text field

	Scenario: Select categories through text input
		When I click on the *Category* dropdown
		Then I see that the text input is active
		When I start entering text
			And the text I enter appears in the categories
		Then I see matching options appear as a flat list
			And I do not see nested categories
			And I see an *X* icon on the right side of the text input
		When I click on the <category> checkbox from the flat list
		Then I see <category> appear as a chip in the text input
			And I see that my text input has cleared
			And I see the full nested category list

	Scenario: No results when inputting text
		When I click on the *Category* dropdown
		Then I see that the text input is active
		When I start entering text
			And the text I enter does not appear in the categories
		Then I see *Category not found*
			And I do not see any selectable categories

	Scenario: Chips overflow in the text field
		When I click <X> checkboxes in the *Category* dropdown
			And the length of the chips exceeds the width of the dropdown
		Then I see the chips go to the next line
			And the height of the *Category* dropdown grows to contain it

	Scenario: Remove category selection
		Given I <option> is selected in *Category*
		When I click the selected checkbox for <option>
		Then I see that the checkbox for <option> is empty
			And I do not see the chip in the textbox

	Scenario: Clear all category selections
		Given there is more than one option selected in *Category
		When I click the *X* in the text input of *Category*
		Then I do not see any chips in the *Category* textbox

	Scenario: Clear all category selections while inputting text
		Given there is more than one option selected in *Category*
		When I click on *Category*
		Then I see I can input text
		When I start inputting text
		When I click the *X* on the *Category* dropdown
		Then I do not see any chips in the *Category* textbox
			And I do not see the text that I started inputting

	Scenario: See that *Category* is optional
		Given the *Category* field of <resource> is empty
		When I click *FINISH*
		Then I see <resource> in the topic tree
			And I do not see an error icon
		When I left-click <resource>
		Then I see the previewer for <resource>
			And I see the *Category* field is empty
