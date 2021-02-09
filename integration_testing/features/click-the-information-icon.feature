Feature: Click the information icon

	Background:
		Given I choose a destination to move content into
			And I click the information icon on a particular topic or content list item

	Scenario: Click the information icon
		When I click the information icon
		Then a side sheet on a scrim should slide out from the right side of the screen
			And here I can preview the content in question and view the metadata associated