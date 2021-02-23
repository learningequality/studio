Feature: Create a topic

	Background:
		Given I am signed in to Studio as a non-admin user
			And I am on the directory selection screen
			And I find a destination I want to move content into

	Scenario:	Create a topic
		When I click *New topic* button in the top right corner
		Then a modal appears prompting a new topic title
		When I name give the topic a title
			And I click *Create*
		Then the new topic appears in that node directory
			And a snackbar appears confirming the new topic creation