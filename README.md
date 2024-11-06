# PiBitStreamer
Connect a raspberry pi to 4 FPGAs and allow for remote bitstream programming. 

- Enable I2C using the raspi-config tool.

- Run the Setup Pi Bitstreamer script which should set the required rc.local file up to launch the required software at boot

- To keep things up to date you may want to add git pull to the rc.local from within the repo directory