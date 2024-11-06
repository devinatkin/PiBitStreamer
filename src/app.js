const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/process-file', upload.single('file'), (req, res) => {
  const { option } = req.body;
  const filePath = req.file.path;

  // Determine the correct command based on the option selected
  let command = '';
  switch (option) {
    case '1':
      command = `./load_bitstream_file_w_openfpgaloader.sh 1 ${filePath} basys3`;
      break;
    case '2':
      command = `./load_bitstream_file_w_openfpgaloader.sh 2 ${filePath} basys3`;
      break;
    case '3':
      command = `./load_bitstream_file_w_openfpgaloader.sh 3 ${filePath} basys3`;
      break;
    case '4':
      command = `./load_bitstream_file_w_openfpgaloader.sh 4 ${filePath} basys3`;
      break;
    default:
      return res.status(400).send('Invalid option selected.');
  }

  // Execute the script with the constructed command
  child_process.exec(command, (error, stdout, stderr) => {
    // Clean up the uploaded file after processing
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      }
    });

    // Handle script execution errors
    if (error) {
      console.error('Error running script:', error);
      console.error('stderr:', stderr);
      return res.status(500).send('Error processing file.');
    }

    console.log('Script output:', stdout);
    res.send('File processing successful!');
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
