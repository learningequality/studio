Feature: View channel details

	Background:
		Given I am signed in to Studio
			And I am in any of the tabs (*My Channels*, *Starred*, *View only*, or *Content Library*)

		Scenario: Open channel details
			When I click the *i* button for the desired channel
			Then I see a new page with the channel details
				And I see the detailed information for the channel (token, size and resources, language, etc.)

		Scenario: Copy channel token
			Given I am at the channel details page
				And I see the channel token
				And I see the token *Copy* button
			When I click the *Copy* button
			Then I see the snackbar notification that the token is copied in to the clipboard
			When I use the paste feature (Ctrl+V)
			Then I see the channel token pasted

		Scenario: Download files with the channel summary
			Given I am at the channel details page
				And I see the *Download channel summary* button
			When I click the *Download channel summary* button
			Then I see the options to download the summary as a PDF or a CSV file
			When I select the option to download as PDF
			Then I can save and open the PDF file in my default system PDF reader application
			When I select the option to download CSV
			Then I can save and open the CSV file in my default system CSV application

		Scenario: Close channel details page
			When I click the *X* button in the top bar
			Then I don't see the channel details page any more
				And I see the channel list in the tab where I initially opened it
