# learningequality/studio-app:dev
FROM learningequality/studio-app:base

VOLUME /src/contentcuration
ENTRYPOINT ["/usr/local/bin/python", "entrypoint.py"]

# [DEV] Python packages ########################################################
COPY requirements-dev.txt /src/
RUN pip install \
    --isolated \
    --no-cache-dir \
    --ignore-installed \
    -r requirements-dev.txt
################################################################################

# Files ########################################################################
COPY entrypoint.py flake.lock flake.nix pytest.ini setup.cfg /src/
################################################################################
