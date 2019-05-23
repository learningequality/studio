#!/bin/bash

curl -L -o cloudprober.zip https://github.com/google/cloudprober/releases/download/v0.10.2/cloudprober-v0.10.2-linux-x86_64.zip
unzip -p cloudprober.zip > /bin/cloudprober
chmod +x /bin/cloudprober

cloudprober --config_file cloudprober.cfg
