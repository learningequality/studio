# learningequality/studio-webpack:dev
FROM learningequality/studio-webpack:base

# Assume we're mounting a volume in dev
VOLUME /src/contentcuration
EXPOSE 4000
CMD ["yarn", "run", "build:dev:hot"]

# Sources ######################################################################
COPY .eslintrc.js .htmlhintrc.js .huskyrc .prettierrc.js /src/
################################################################################
