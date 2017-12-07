FROM 32bit/ubuntu:16.04
RUN apt-get update && apt-get install -y \
        build-essential \
	curl \
	git

RUN curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
RUN apt-get install -y nodejs
RUN /bin/bash -c "npm install -g yarn"
RUN /bin/bash -c "git clone https://github.com/maidsafe/safe_app_nodejs.git"
WORKDIR /safe_app_nodejs
RUN /bin/bash -c "NODE_ENV=dev yarn"
