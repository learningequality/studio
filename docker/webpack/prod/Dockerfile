# learningequality/studio-webpack:prod
FROM learningequality/studio-webpack:base

# Build frontend assets ########################################################
COPY contentcuration/frontend /src/contentcuration/contentcuration/frontend/
RUN yarn run build --env.docker
################################################################################
