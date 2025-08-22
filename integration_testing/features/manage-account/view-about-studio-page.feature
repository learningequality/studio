Feature: About Studio

	Background:
		Given I am signed in to Studio
			And I am at *Settings > About Studio* page

	Scenario: Read the available info and follow the links
		When I look at the page
		Then I see the following sections: *Kolibri Studio resources*, *About Kolibri Studio*, *Best practices* and *Notable issues*
		When I click on any of the provided links
		Then I can go to the linked page
