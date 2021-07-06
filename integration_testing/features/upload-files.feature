Feature: Upload files
	Users should be able to upload individual learning resources into their channel

	Background: 
		Given I am signed in to Studio
			And I am on the channel editor page

	Scenario: Upload files
		When I click the *Add* button
			And I select the *Upload files* option
		Then I see the *Upload files* modal
			And I see the *Total storage used* value
			And I can see which are the supported file types: mp3, pdf, epub, mp4, webm, zip
		When I click the *Select files* button
		Then I see a file explorer window
			And I can select one or several supported files for upload
		When I click the *Open* button
		Then I see the *Edit files* modal
		When I fill in all the required fields
			And I click the *Finish* button
		Then I am returned to the main topic tree view
			And I can see the uploaded files
