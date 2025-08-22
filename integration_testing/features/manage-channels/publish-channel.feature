Feature: Publish a channel

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page for a channel created by me
			And the there are unpublished resources

	Scenario: Publish a channel
		When I click the *Publish* button
		Then I see the *Publish modal*
			And I see the title of the channel
			And I see a *Version description* field
		When I enter a description
			And I click the *Publish* button
		Then the modal disappears
			And I see the *Publishing channel 0%* progress indicator to the left of the *Publish* button
		When the channel has been published successfully
		Then the progress indicator text changes to *Published NN seconds ago*
			And the *Publish* button remains disabled
		When after a period of time I check my email
		Then I see that I have received a confirmation email that the channel has been published successfully

	Scenario: Publish a large channel
		Given there is an unpublished channel with more than 5000 nodes
		When I click the *Publish* button
		Then I see the *Publish modal*
			And I see the title of the channel
			And I see a *Version description* field
		When I enter a description
			And I click the *Publish* button
		Then the modal disappears
			And I see the *Publishing channel 0%* progress indicator to the left of the *Publish* button
		When the channel has been published successfully
		Then the progress indicator text changes to *Published NN seconds ago*
			And the *Publish* button remains disabled
		When after a period of time I check my email
		Then I see that I have received a confirmation email that the channel has been published successfully

	Scenario: Publish a channel with incomplete resources
		Given the channel contains incomplete resources
		When I look to the left of the *Publish* button
		Then I see a yellow icon with exclamation
			And I see a the number of incomplete resources
			And when I hover over the icon I see *N resources are incomplete and cannot be published*
		When I click the *Publish* button
		Then I see the *Publish modal*
			And I see text informing me of the number of incomplete resources and they won't be published
		When I click the *Continue* button
		Then I see the *Publish modal*
			And I see the title of the channel
			And I see a *Version description* field
		When I enter a description
			And I click the *Publish* button
		Then the modal disappears
			And I see the *Publishing channel 0%* progress indicator to the left of the *Publish* button
		When the channel has been published successfully
		Then the progress indicator text changes to *Published NN seconds ago*
			And the *Publish* button remains disabled
		When after a period of time I check my email
		Then I see that I have received a confirmation email that the channel has been published successfully

	Scenario: Publish a channel with resources in different languages
		Given the channel contains multiple resources in different languages
		When I click the *Publish* button
		Then I see the *Publish modal*
			And I see the title of the channel
			And I see a *Version description* field
			And I see a *Language* drop-down in red
			And I see *Please select a language for this channel*
		When I enter a description
			And I select a language
			And I click the *Publish* button
		Then the modal disappears
			And I see the *Publishing channel 0%* progress indicator to the left of the *Publish* button
		When the channel has been published successfully
		Then the progress indicator text changes to *Published NN seconds ago*
			And the *Publish* button remains disabled
		When after a period of time I check my email
		Then I see that I have received a confirmation email that the channel has been published successfully

	Scenario: Attempt to publish a *View-only* channel
		Given I've been invited to view a *View-only* channel
		When I attempt to publish the channel
		Then I see a *View-only* text at the place of the *Publish* button
			And it's not possible to publish the channel
