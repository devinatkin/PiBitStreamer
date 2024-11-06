#!/bin/bash

# Take a number from 1 to 4 from the script arguments
# Use lsusb to get all USB devices with the ID 0403:6010 Future Technology Devices International, Ltd FT2232C/D/H Dual UART/FIFO IC
# Use grep to filter the devices with the ID 0403:6010

# Take a bitstream file from the script arguments
# Use openFPGALoader to load the bitstream file to the FPGA board
# Use the device number from 1 to 4 to specify the device to load the bitstream file

# Take the board name from the script arguments

# Use the following command to load the bitstream file to the FPGA board
# openFPGALoader --busdev-num 001:002 -b basys3 bitstream.bit

# Check if the required number of arguments is provided
if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <device_number (1-4)> <bitstream_file> <board_name>"
    exit 1
fi

# Assign arguments to variables
device_number="$1"
bitstream_file="$2"
board_name="$3"

# Validate that the device number is between 1 and 4
if ! [[ "$device_number" =~ ^[1-4]$ ]]; then
    echo "Error: Device number must be between 1 and 4."
    exit 1
fi

# Check if the bitstream file exists
if [ ! -f "$bitstream_file" ]; then
    echo "Error: Bitstream file '$bitstream_file' does not exist."
    exit 1
fi

# Use lsusb to get the USB devices with the specific ID
usb_devices=$(lsusb | grep '0403:6010')

# Check if any matching USB devices were found
if [ -z "$usb_devices" ]; then
    echo "Error: No devices with ID 0403:6010 (FT2232C/D/H) found."
    exit 1
fi

# Display the USB devices and select the device based on device_number
selected_device=$(echo "$usb_devices" | sed -n "${device_number}p")

if [ -z "$selected_device" ]; then
    echo "Error: Device number $device_number does not correspond to a connected FT2232 device."
    exit 1
fi

# Extract the bus and device numbers for openFPGALoader
bus_num=$(echo "$selected_device" | awk '{print $2}')
device_num=$(echo "$selected_device" | awk '{print $4}' | tr -d ':')

# Use openFPGALoader to load the bitstream file to the FPGA board
echo "Loading bitstream '$bitstream_file' to device $bus_num:$device_num on board '$board_name'..."
openFPGALoader --busdev-num "$bus_num:$device_num" -b "$board_name" "$bitstream_file"

# Check if openFPGALoader command was successful
if [ $? -eq 0 ]; then
    echo "Bitstream loaded successfully."
else
    echo "Error: Failed to load bitstream."
    exit 1
fi
