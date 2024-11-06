#!/bin/bash

# Your script starts here
echo "Setting up Pi BitStreamer..."

# Add your setup commands below
sudo apt update
sudo apt upgrade -y

# Install required packages for website
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

# Install required packages for small display
python3 -m venv ~/PiBitStreamer/venv
source ~/PiBitStreamer/venv/bin/activate

pip3 install adafruit-circuitpython-ssd1306
pip3 install pillow

sudo apt install i2c-tools
curl -O https://raw.githubusercontent.com/adafruit/Adafruit_CircuitPython_SSD1306/main/examples/ssd1306_stats.py

# Get the current working directory
SCRIPT_DIR=$(pwd)

# Define the lines to be added to rc.local
RC_LINES=$(cat <<EOF
# Start PiBitStreamer server and frontend
cd /home/dmatkin/PiBitStreamer
sudo -u dmatkin /bin/bash -c "source /home/dmatkin/PiBitStreamer/venv/bin/activate && npm run start" &
EOF
)

# Add the PiBitStreamer startup command if it doesn't already exist
if ! grep -Fxq "Start PiBitStreamer server and frontend" /etc/rc.local; then
    # Insert RC_LINES before 'exit 0'
    sudo sed -i "s|exit 0|$RC_LINES\nexit 0|" /etc/rc.local
    echo "Added PiBitStreamer startup command to /etc/rc.local"
else
    echo "Startup command already exists in /etc/rc.local"
fi

sudo reboot