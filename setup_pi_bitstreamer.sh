#!/bin/bash

# Your script starts here
echo "Setting up Pi BitStreamer..."

# Add your setup commands below
sudo apt update
sudo apt upgrade -y

# Install required packages
sudo apt install -y git
sudo apt install -y npm

sudo apt install -y git
sudo apt install -y gzip
sudo apt install -y libftdi1-2
sudo apt install -y libftdi1-dev
sudo apt install -y libhidapi-hidraw0
sudo apt install -y libhidapi-dev
sudo apt install -y libudev-dev
sudo apt install -y zlib1g-dev
sudo apt install -y cmake
sudo apt install -y pkg-config
sudo apt install -y make
sudo apt install -y g++

git clone https://github.com/trabucayre/openFPGALoader.git
cd openFPGALoader
mkdir build
cd build
cmake ..
cmake --build .

sudo make install

npm install
npm run start