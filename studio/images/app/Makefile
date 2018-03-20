COMMIT := `git rev-parse HEAD`

imagebuild:
	docker build ../../../ -f $$PWD/Dockerfile -t gcr.io/github-learningequality-studio/app:$(COMMIT)
