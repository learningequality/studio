Feature: Upload files
	Users should be able to upload individual learning resources into their channel

	Background:
		Given I am signed in to Studio
			And I am at the channel editor page

	Scenario: Upload a single supported file
		When I click the *Add* button
			And I select the *Upload files* option
		Then I see the *Upload files* modal
			And I see the *Total storage used: N MB of N MB* progress bar
			And I can see which are the supported file types: mp3, bloompub, bloomd, pdf, epub, h5p, mp4, webm, zip, kpub
		When I click the *Select files* button
		Then I see a file explorer window
		When I select a supported file for upload
			And I click the *Open* button
		Then I see the *Edit files* modal
		When I fill in all the required fields
			And I click the *Finish* button
		Then I am returned to the main topic tree view
			And I can see the uploaded file

	Scenario: Upload multiple supported files
		Given I am at the *Upload files* modal
		When I click the *Select files* button
		Then I see a file explorer window
		When I select several supported files for upload
			And I click the *Open* button
		Then I see the *Edit files* modal
		When I fill in all the required fields for each file
			And I click the *Finish* button
		Then I am returned to the main topic tree view
			And I can see the uploaded files

	Scenario: Upload more files
		Given I am at the *Edit files* modal after having imported some files
		When I click the *Upload more* button
		Then I see a file explorer window
		When I select several supported files for upload
			And I click the *Open* button
		Then I see the *Edit files* modal
		When I fill in all the required fields for each file
			And I click the *Finish* button
		Then I am returned to the main topic tree view
			And I can see the uploaded files

	Scenario: Upload more files by drag and drop
		Given I am at the *Edit files* modal after having imported some files
		When I drag and drop files
		Then I see the *Edit files* modal
		When I fill in all the required fields for each file
			And I click the *Finish* button
		Then I am returned to the main topic tree view
			And I can see the uploaded files

	Scenario: Cancel the file upload
		Given I am at the *Edit files* modal after having imported some files
		When I hover over the title of a file
			And I click the *X* icon
		Then the file is removed
		When I do the same for each uploaded file
		Then I am back at the *Upload files* modal
		When I close the modal
		Then I am returned to the main topic tree view
			And I can see the uploaded files are not present 
