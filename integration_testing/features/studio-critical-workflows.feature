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
			And I can filter the search results by keyword, language, license, format, resources for coach, available captions and subtitles
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
		Then I see a *Change language* modal window with the available languages
		When I click on a language which is not currently selected
			And I click the *Confirm* button
		Then the interface language changes to the selected language

	Scenario: Open and close the sidebar menu
    When I click the hamburger menu button in the upper left screen corner
    Then I see the sidebar menu
    	And I can see the following options: *Channels*, *Settings*, *Change language*, *Help and support*, *Sign out*, the LE logo,  *© 2025 Learning Equality", *Give feedback*
	    And I can click any of the options inside
    When I click the *X* button, or anywhere on the browser screen
    Then I don't see the sidebar menu anymore

  Scenario: Open and close the user menu
    When I click the user menu button in the upper right screen corner
    Then I see the user menu
    	And I can see the following options: *Settings*, *Change language*, *Help and support*, *Sign out*
	    And I can click any of the options inside
    When I click the user menu button again, or anywhere on the browser screen
    Then I don't see the user menu anymore

	Scenario: Create a new channel
		Given I am signed in to Studio
			And I am at *My Channels* tab
		When I click the *New channel* button
		Then I see the *New channel* page
		When I enter a channel name
			And I select a language
			And I enter channel description (optional)
			And I fill in the default copyright fields (optional)
			And I upload an image file as a channel thumbnail (optional)
			And I click the *Create* button
		Then I am at the channel editor view

	Scenario: Edit channel details
		Given I am signed in to Studio
			And I am at the channel editor view
		When I click the pencil icon next to the channel name
		Then I see a modal window with the channel details
			And I see the details for the channel - channel name, language, channel description etc.
		When I modify any of the details
			And I click the *Save changes* button
		Then I see a message: *Changes saved*
			And I can close the modal window

	Scenario: Create a new folder
		Given I am signed in to Studio
			And I am at the channel editor page
		When I click the *Add* button at the top right corner
			And I click the *New folder* option
		Then I see the *New folder* modal
		When I fill in the required field *Title*
			And I fill in any of the other optional fields
			And I add a thumbnail image (optional)
			And I click the *Finish* button
		Then I am on the channel editor page
			And I can see the newly created folder

	Scenario: Upload all supported files
		When I click the *Add* button
			And I select the *Upload files* option
		Then I see the *Upload files* modal
			And I see the *Total storage used* indicator at the top
			And I can see which are the supported file types: mp3, bloompub, bloomd, pdf, epub, h5p, mp4, webm, zip, kpub
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
			And the channel contains unpublished resources or edits
		When I click the *Publish* button at the top right corner
		Then the *Publish modal* appears
			And I see the *Describe what's new in this channel version* field and the *Language* drop-down
		When I fill in the required fields
			And I click *Publish*
		Then I see the *Publishing channel* progress indicator at the top right
		When the the channel has been published successfully
		Then I see the *Published N seconds ago* text
			And I receive a confirmation email that the channel has been published successfully

	Scenario: Invite collaborators with *Can edit* permissions
		Given I am signed in to Studio
			And I am at the channel editor page
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
			And I am at the channel editor page for <channel_a>
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
		When I after a period of time I refresh the page
			And click on the updated resource
		Then I can see that it's updated with any changes made to the original resource file

	Scenario: Quick edit the fields of multiple resources
		Given I am signed in to Studio
			And I am at the channel editor page
			And there are available resources of different types
		When I select at least two resources
		Then I see a toolbar with the available editing options
		When I click the *Edit language* icon
		Then I see the *Edit language* modal
		When I select a new language
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*
		When I click on any of the other available editing icons such as *Edit categories* or *Edit levels*
		Then I also see a modal with options
		When I select one or several options
			And I click the *Save* button
		Then I am back at the page with the resources
			And I see a message: *Changes saved*

	Scenario: Remove folders and resources by using the toolbar
		Given I am signed in to Studio
			And I am at the channel editor page
			And there are available resources of different types
		When I check a folder's checkbox
		Then I see the toolbar options for the selected folder
		When I click the *Remove* button
		Then I can see the *Sent to trash* snackbar notification
			And I see the *Undo* button
			And I no longer see the folder
		When I check the checkbox of a resource
		Then I see the toolbar options for the resource
		When I click the *Remove* button
		Then I can see the *Sent to trash* snackbar notification
			And I see the *Undo* button
			And I no longer see the resource

	Scenario: Copy multiple resources
		Given I am signed in to Studio
			And I am at the channel editor page
			And there are available resources of different types
		When I select multiple items via checkboxes
		Then I see that the select bar has changed to an actions bar
		When I click the *Make a copy* button in the actions bar
		Then I see a snackbar appears with a *Copying...* message
		When the copy creation process is finished
		Then the snackbar disappears
			And a snackbar *Copy operation complete* appears
			And I see that copies are created

	Scenario: Move resources into a new destination
		When I click on a checkbox(s) and make a resource selection
			And I click the move button
		Then I am navigated to a screen that allows me to navigate and choose a destination to move the resource
		When I navigate to an appropriate destination
			And click the *Move here* button
		Then I am redirected to the channel editor
			And I see a snackbar confirmation that my resources are moved
			And the resources are no longer in my original directory

	Scenario: Apply details from folder after adding a resource
		Given I have created a folder with multiple metadata details such as categories, levels, requirements, language
		When I attempt to import, copy or move a resource into that folder
		Then I see the *Apply details from the folder <folder name>* modal
			And I see that all of the checkboxes for the available metadata are selected
		When I click the *Continue* button
		Then I see that the selected metadata is filled in
		When I click the *Finish* button
		Then I see that the resource is added in the folder

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

	Feature: View and edit account information
		Given I am signed in to Studio
		When I go to the *Settings > Account* page
		Then I can see the following sections with account information: *Basic information*, *API token*, *Export account data*, *Delete account*
		When I click on the *Change password* hyperlink
			And I make changes to my password
			And I press *Save changes* button in the modal
		Then I see a snackbar appears to confirm my password was updated
			And the modal is dismissed
		When I click the *Edit* hyperlink near my username
			And I make changes to my full name
			And I click *Save changes* button in the modal
		Then I see a snackbar appears to confirm changes are saved
			And the modal is dismissed
		When I go to *Settings > Account>Storage*
		Then I can see the percentage of storage used
			And I can see the size of each resource types
			And I can see the *Request more space* section

	Scenario: Submit more space request
		When I fill in all the space request text fields
			And I click the *Send request* submit button
		Then I see all the text fields clear
			And a snackbar appears to confirm the submission

	Scenario: Create a collection by selecting channels
		Given I am signed in to Studio
			And I am on the *Collections* tab
		When I type a collection name in the *Collection name* field
			And I click the *New collection* button
			And I click the *Select channels* button
		Then I see the *Select channels* page
			And I am on the *Content library* tab # alternatively I can select the *My channels* or *View-only* tab
		When I select one or several channels
			And I click the *Finish* button
		Then I see the the *New collection* screen with the selected channels
			When I click the *Create* button
		Then I see the *Collections* tab
			And I see the newly created collection
			And I see the number of channels in that collection

	Scenario: Explore the content library
		Given I am signed in to Studio
		When I go to the *Content library*
		Then I see a page with the available public channels
			And I can filter the search results by keyword, language, license, format, starred status, resources for coaches, captions or subtitles
			And I can view or download the channel summary
		When I click on a channel card
		Then I can see all of the channel's resources in *View-only* format
