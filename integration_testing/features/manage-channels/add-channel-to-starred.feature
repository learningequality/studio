Feature: Add a channel to the *Starred* tab
	A user needs to be able to mark channels with a star to label them as favorite for easy access

	Background:
		Given I am signed in to Studio
			And I am on any of the tabs (*My Channels*, *Starred*, *View-only*, or *Content Library*)
			And I see a channel that is not starred (white star)

	Scenario: Add channel to the *Starred* tab
		When I click the *Add to starred channels* button for the desired channel
		Then I see that the channel's *Add to starred channels* button is now black
			And I see a message that the channel was added to the starred channels
		When I click and open the *Starred* tab
		Then I see that the channel is displayed among the starred channels

	Scenario: Remove a channel from the starred channels
		Given I am on *My Channels*, *View only*, or *Public* tabs
			And I see a channel that is starred (black star)
		When I click the *Remove from starred channels* button for the channel
		Then I see that the channel's *Remove from starred channels* button is now white
			And I see a message that the channel was removed from the starred channels
		When I click and open the *Starred* tab
		Then I see the list of starred channels

	Scenario: Remove channel directly from the *Starred* tab
		Given I am on the *Starred* tab
			And I see a starred channel
		When I click the *Remove from starred channels* button for the channel
		Then I don't see the removed channel any more

	Scenario: Remove a starred channel form the *Content Library* tab with *Starred* filter on
		Given I am on the *Content Library* tab
			And I've selected the *Starred* checkbox
		When I click on the star button of a starred channel.
		Then I see a message that the channel was removed from the starred channels
			And the channel is no longer displayed in the list with the filtered channels
