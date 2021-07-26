Feature: View new metadata in the channel details modal


# Comment here

	Background: 
		Given I am signed into Studio
			And I am in an editable channel, <channel>
		When I click on the info icon next to the <channel> label in the app bar
		Then I see the channel details modal for <channel>

	Scenario: View total resources
		Given there are resources for all learning activity types in <channel>
			And some are marked with *Multiple activities*
		Then I see the new icons and labels
			And I see the number of resources for each learning activity
			And I see they are ordered from most frequent at the top of the list to least frequent at the bottom of the list

	Scenario: View levels in the channel
		Given there are resources marked with different learning levels
		Then I see a list of levels that appear in the channel
			And I see that the list is comma-separated
			And I see it is ordered from most frequent levels first to least frequent levels last
	
	Scenario: View categories in the channel
		Given there are resources marked with different categories
		Then I see a list of categories that appear in the channel
			And I see that the list is comma-separated
			And I see it is ordered from most frequent categories first to least frequent categories last
