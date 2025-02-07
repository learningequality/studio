Feature: Studio critical workflows
  This is a test suite of the main Studio workflows.

  Background:
    Given Studio is accessible at https://studio.learningequality.org/ or any of the test environments
    	And I am at Studio's sign-in page

  Scenario: Create an account and sign in with the created account
			When I click the *Create an account* button
			Then I see the *Create an account* form
				And I see the *Basic information* section containing the following fields: First name, Last name, Email, Password and Confirm password
				And I see the *How do you plan on using Kolibri Studio (check all that apply)*, *Where do you plan to use Kolibri Studio? (check all that apply)*, *How did you hear about us?* and *I have read and agree to terms of service and the privacy policy* sections
				And I see the *View Privacy Policy* and *View Terms of Service* links
			When I input all the required fields
				And I click the *Finish* button
			Then I see the *Activation link sent* page
				And I see *Thank you for creating an account! To complete the process, please check your email for the activation link we sent you.*
			When I open the received email and click the activation link
			Then I see the *Account successfully created* page
			When I click the *Continue to sign-in page* button
			Then I am at the sign-in page
			When I fill in my email and password
				And I click the *Sign in* button
			Then I am able to sign in successfully
				And I am at *My channels* page

	Scenario: Reset my password
		Given I've requested and received an email with a link to reset my password
		When I click the link in the email
		Then I see a page with a *Reset your password* form
			And I fill in the *New password* field
			And I fill in the *Confirm password* field with the same password
			And I press the *Submit* button
		Then I see the following message: Password reset successfully

	Scenario: Explore without an account
		Given I am not signed in to Studio
			And I am on Studio sign-in page
		When I click the *Explore without an account* link
		Then I see the *Content Library* page with available public channels
			And I can filter the search results
			And I can view or download the channel summary

	Scenario: Change the language when you are not signed-in
		Given I am not signed-in to Studio
			And I am on the Studio home page
		When I click on one of the available languages
		Then the language interface changes to the selected language
			And the selected language is no longer clickable

	Scenario: Change the language as a signed-in user
		Given I am signed-in to Studio
			And I click the user profile icon
		When I click *Change language*
		Then I see a *Change language* modal window displayed with several languages to choose from
		When I click on a language which is not currently selected
			And I click the *Confirm* button
		Then the interface language changes to the selected language

	Scenario: Create a new channel
		Given I am signed in to Studio
			And I am at *My Channels* tab
		When I click the *New channel* button
		Then I see the *New channel* page
		When I enter a channel name
			And I enter channel description
			And I select a language
			And I upload an image file as a channel thumbnail
			And I click the *Create* button
		Then I see the newly created channel at *My Channels* page

	Scenario: Edit channel details
		Given I am signed in to Studio
			And I am on the channel editor view
		When I click the pencil icon next to the channel name
		Then I see a modal window with the channel details
			And I see the details for the channel - channel name, language, channel description etc.
		When I modify any of the details
			And I click the *Save changes* button
		Then I see a message: *Changes saved*
			And I can close the modal window

	Scenario: Create a new folder
		Given I am signed in to Studio
			And I am on the channel editor page
		When I click the *Add* button in the top right corner
			And I click the *New folder* option
		Then I see the *New folder* modal
		When I fill in the required field *Title*
			And I fill in any of the other fields such as *Description*, *Tags* and *Language*
			And I add a thumbnail image
			And I click the *Finish* button
		Then I am on the channel editor page
			And I can see the newly created folder

	Scenario: Upload files
		When I click the *Add* button
			And I select the *Upload files* option
		Then I see the *Upload files* modal
			And I see the *Total storage used* indicator at the top
			And I can see which are the supported file types: mp3, bloompub, bloomd, pdf, epub, h5p, mp4, webm, zip
		When I click the *Select files* button
		Then I see a file explorer window
			And I can select one or several supported files for upload
		When I click the *Open* button
		Then I see the *Edit files* modal
		When I fill in all the required fields
			And I click the *Finish* button
		Then I am back at the main topic tree view
			And I can see the uploaded files

	Scenario: Create an exercise
		When I click the *Add* button
			And I select the *New exercise* option
		Then I see the *Details* tab of the *New exercise* modal
		When I fill in all of the required fields
			And I click the *Questions* tab
		Then I see the text: *Exercise has no questions*
			And I see a *New question* button
		When I click the *New question* button
		Then I see the question editor
		When I add one or several questions of the desired type
		And I click the *Finish* button
		Then I am back at the main topic tree view
			And I can see the newly added exercise

	Scenario: Import content from another channel
		When I click the *Add* button
			And I select the *Import from channels* option
		Then I see the *Import from other channels* modal
			And I see a list of channels that I have access to
		When I click on a channel card
		Then I see the available folders and resources
		When I select some content
			And I click the *Review* button
		Then I see the *Review selections* table
			And I see the number of selected resources at the bottom left
		When I finish reviewing my selections
			And I click the *Import* button
		Then I am back at the main topic tree view
			And I see the *Copying* indicator for each folder or resource which is being copied

	Scenario: Publish a channel
		Given I am signed in to Studio
			And I am at the channel editor page
			And I have write access to the channel
			And the channel has had modifications
		When I click the *Publish* button at the top right corner
		Then the *Publish modal* appears
			And I see steps for resolving errors and describing new changes
		When I click *Publish*
		Then I see the *Describe what's new in this channel version* modal
		When I fill in the required fields
			And I click *Publish*
		Then I see the *Publishing channel* progress indicator at the top right
		When the the channel has been published successfully
		Then I see the *Published N seconds ago* text
			And I receive a confirmation email that the channel has been published successfully

	Scenario: Invite collaborators with *Can edit* permissions
		Given I am signed in to Studio
			And I am on the channel editor page
		When I click the *...* (options) button in the topbar
			And select the *Share channel* option
		Then I am at the *Sharing* tab for the channel
		When I type the email of the person I want to invite
			And I don't change the preselected *Can edit* option in the drop-down
			And I click the *Send invitation* button
		Then the collaborator will be notified on their *My Channels* page, where they can accept or reject the pending invitation
			And the collaborator will receive an email allowing them to accept/reject the pending invitation

	Scenario: Sync resources
		Given I am signed in to Studio
			And I am on the channel editor page for <channel_a>
			And there is a resource in the <channel_a> that has been imported from <channel_b>
		  And there is new version of the resource file in the <channel_b>
		When I click on the *···* button in the top-right corner
			And I select the *Sync resources* option
		Then I see *Sync resources* modal window
		When I select any of the available checkboxes
			And I click the *Continue* button
		Then I see the *Confirm sync* modal
		When I click *Sync*
		Then the modal closes
		When I refresh the page
			And click on the updated resource
		Then I can see that it's updated with any changes made to the original resource file

	Scenario: Delete a channel
		Given I am signed in to Studio
			And I have permissions to edit
			And I am on *My Channels* tab
		When I click the *Options* button of a channel #the three dots to the right
		Then I see a *Delete channel* option
		When I click the *Delete channel* option
			And I click the *Delete channel* button
		Then I see a message that the channel is deleted
			And the deleted channel is no longer displayed at *My Channels* page