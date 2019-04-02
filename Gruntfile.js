module.exports = function(grunt) {

  grunt.initConfig({
    download: {
      'safe_app-mock': {
        url: 'https://s3.eu-west-2.amazonaws.com/safe-client-libs/',
        version: '0.9.1',
        ext: 'x64.zip'
      },
      'system_uri': {
        url: 'https://s3.eu-west-2.amazonaws.com/system-uri/',
        version: 'v0.4.0',
        ext: 'x64.zip'
      }
    }
  });

  grunt.task.registerMultiTask('download', 'Log stuff.', function() {
    let os;
    switch (process.platform) {
      case 'linux':
        os = 'linux';
        break;
      case 'win32':
        os = 'win';
        break;
      case 'darwin':
        os = 'osx';
        break;
    }

    let url = this.data.url + this.target + '-' + this.data.version + '-' + os + '-' + this.data.ext;
    grunt.log.writeln('Downloading native lib for platform ' + os + ', ' + this.target + ' version ' + this.data.version + ' from: ' + url);

    const path = require('path');
    const https = require('https');
    const fs = require('fs');

    let done = this.async();

    https.get(url, (res) => {
      if (res.statusCode !== 200) {
          grunt.log.warn('Got response code ' + res.statusCode + ' while trying to copy ' + url);
      }

      //grunt.file.mkdir(path.dirname('download'));
      let zipFilePath = this.target + '.zip';
      const wstream = fs.createWriteStream(zipFilePath);

      res.on('data', function(chunk) {
          grunt.log.write('+');
          wstream.write(chunk);
      });

      res.on('end', function () {
          grunt.log.writeln('Copying....');
          wstream.end();
          grunt.log.writeln('Copied ');

          var extract = require('extract-zip')
          let outputPath = path.resolve(__dirname, 'src/native/mock');
          grunt.log.writeln(outputPath);
          extract(zipFilePath, { dir: outputPath }, function (err) {
            if (err) {
              grunt.fail.warn('Got error: ' + err);
              done(false);
            }
            done();
          })

      });

      res.on('error', function (e) {
          grunt.fail.warn('Got error: ' + e.message);
          done(false);
      });

    }).on('error', (e) => {
      grunt.fail.warn('Got error: ' + e.message);
    });


  });
};
