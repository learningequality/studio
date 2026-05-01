Feature: Submit a channel to the Community Library

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page for a channel created by me
			And I have already published the channel

	Scenario: Submit a channel to the Community Library
		When I click the *Share* drop-down button
			And I click the *Submit to Community Library* option
		Then I see the *Submit to Community Library* side panel
			And I see the title and version of the channel
			And I see the licensing section and info for the criteria for submitting to the Community Library
			And I see a *Countries* drop-down list
			And I see a description textbox
		When I select one or several countries
			And I enter the description
			And I click the *Submit for review* button
		Then the side panel closes
			And I see a *Submitting channel to Community Library...* snack-bar message
			And then after a moment I see a *Channel submitted for review* snackbar message

	Scenario: Attempt to submit a channel which is already submitted
		Given I've already submitted a channel to the Community Library
		When I click the *Share* drop-down button
			And I click the *Submit to Community Library* option
		Then I see the *Submit to Community Library* side panel
			And I I see a yellow *Submitted* status chip
			And I see an info section informing me that the channel has already been submitted to the Community Library
			And I see the title and version of the channel
			And I see the licensing section and info for the criteria for submitting to the Community Library
			And I see a disabled *Countries* drop-down list
			And I see a disabled description textbox
			And I see a disabled *Submit for review* button
		When I click the *Cancel* button
		Then the side panel closes
			And I am back at the channel editor page

	Scenario: Review a Community Library submission as an Administrator and flag it for review
		Given I'm signed in as an Administrator
			And I am at the Community Library submission for the channel
		When I click the *Review* button
		Then I see the *Review submission* side panel
			And I can see all the relevant info for the submitted channel
			And I can see the *Submission notes*
			And I can see that *Submitted* is selected by default in the *Change status* section
		When I change the status to *Flag for review*
			And I select a reason from the *Reason* drop-down
			And I clarify my reasoning in the *Editor's notes* field
			And I fill in the *Personal notes* (optional) field
			And I click the *Confirm button
		Then I see a *Channel status is changing* snackbar message
			And after a moment I see a *Submission flagged for review* snackbar message
			And I see that the status has changed to *Needs changes*

	Scenario: Resubmit a channel to the Community Library
		Given I've submitted a channel to the Community Library and it has been flagged as *Needs changes*
		When I open the Notifications
		Then I see a new message informing me that I need to make changes to my submission
		When I go to the channel editor page
			And I click the *Share* drop-down button
			And I click the *Submit to Community Library* option
		Then I see the *Submit to Community Library* side panel
			And I see the status changed to *Needs changes*
			And I see the following text: *Your previously submitted version needs changes. Make sure you have addressed all comments before resubmitting.*
			And I see the title and version of the channel
			And I see the licensing section and info for the criteria for submitting to the Community Library
			And I see a disabled *Countries* drop-down list
			And I see a disabled description textbox
			And I see a disabled *Submit for review* button
		When I close the side panel
			And I make the necessary corrections to my channel
			And I publish it again
		Then I see a *Resubmit channel for Community library review? modal
		When I click the *Resubmit* modal
		Then I see the *Submit to Community Library* side panel
			And I see that all the previously disabled options are now enabled
		When I fill in the required info
			And I click the *Submit for review* button
		Then the side panel closes
			And I see a *Submitting channel to Community Library...* snack-bar message
			And then after a moment I see a *Channel submitted for review* snackbar message

	Scenario: Review a Community Library submission as an Administrator and approve it
		Given I'm signed in as an Administrator
			And I am at the Community Library submission for the channel
		When I click the *Review* button
		Then I see the *Review submission* side panel
			And I can see all the relevant info for the submitted channel
			And I can see the *Submission notes*
			And I can see that *Submitted* is selected by default in the *Change status* section
		When I change the status to *Approved*
			And I enter my reasoning in the *Editor's notes* field
			And I fill in the *Personal notes* (optional) field
			And I click the *Confirm button
		Then I see a *Channel status is changing* snackbar message
			And after a moment I see a *Submission approved* snackbar message
		When I navigate to the *Community Library* page
		Then I can see that the channel is shown among the other Community Library channels

	Scenario: Incompatible licenses detected.
		Given TODO
