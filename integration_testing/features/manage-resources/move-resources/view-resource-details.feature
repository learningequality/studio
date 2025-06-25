Feature: Click the information button

	Background:
		Given I choose a destination to move content into
			And I click the information button on a particular topic or content list item

	Scenario: Click the information button
		When I click the information button
		Then a sidebar opens from the right side of the screen
			And here I can preview the content in question and view the metadata associated
