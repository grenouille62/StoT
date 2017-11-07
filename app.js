'use strict';

// simple express server
var fs = require('fs');
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var app = express.createServer();


//Change Express view folder based on where is the file that res.render() is called
app.set('views', path.join(__dirname, '/app'));

app.use(express.static(__dirname + '/app'));
app.use(express.bodyParser());
app.get('/', function (req, res) {
    res.render('index', {
        title: "My Title",
    });
});


var gcs = require(__dirname + '/app' + '/scripts/gcsRecognition');
var IbmRecognition = require(__dirname + '/app' + '/scripts/ibmRecognition');
var msb = require(__dirname + '/app' + '/scripts/msbRecognition');
var HINT_VOCAB = require(__dirname + '/app' + '/conf/hintVocab').hintVocab;

app.post('/recognize/gcs', function (req, res) {
    var datareceive = req.body.voice;
    var language = req.body.language;

    // voicedataArray is b64 encoded - as watson API need audio Stream
    // we need to convert b64 back to binary before wrapping with ReadStream
    var buffer;
    if (typeof Buffer.from === "function") {
        // Node 5.10+
        buffer = Buffer.from(datareceive, 'base64');
    } else {
        // older Node versions
        buffer = new Buffer(datareceive, 'base64');
    }

    // GG needs b64 dataEncoded
    gcs.recognition(buffer, language, HINT_VOCAB, function(response) {
            res.json(response);
        });
});

app.post('/recognize/ibm', function (req, res) {

    var datareceive = req.body.voice;
    var language = req.body.language;

    // voicedataArray is b64 encoded - as watson API need audio Stream
    // we need to convert b64 back to binary before wrapping with ReadStream
    var buffer;
    if (typeof Buffer.from === "function") {
        // Node 5.10+
        buffer = Buffer.from(datareceive, 'base64');
    } else {
        // older Node versions
        buffer = new Buffer(datareceive, 'base64');
    }
    // IBM Watson needs buffer
    var ibm = new IbmRecognition();
    ibm.recognition(buffer, language, HINT_VOCAB, function(response) {
        res.json(response);
    });

});

app.post('/recognize/msb', function (req, res) {
    var datareceive = req.body.voice;
    var language = req.body.language;

    // voicedataArray is b64 encoded - as watson API need audio Stream
    // we need to convert b64 back to binary before wrapping with ReadStream
    var buffer;
    if (typeof Buffer.from === "function") {
        // Node 5.10+
        buffer = Buffer.from(datareceive, 'base64');
    } else {
        // older Node versions
        buffer = new Buffer(datareceive, 'base64');
    }
    // MS Speech Bing needs buffer
    msb.recognition(buffer, language, HINT_VOCAB, function(response) {
            res.json(response);
        })
});

app.post('/textAnalyse/ibm', function (req, res) {
    fs.readFile(req.files.file.path,{encoding: 'utf8'}, (err, data) => {
      if (err) {
          throw err;
      } else {
        var datareceive = data;
        var language = req.body.language;
        var ibm = new IbmRecognition();
        ibm.nluAnalyze(datareceive, language, function(response) {
                res.json(response);
            });
    }});
});

app.post('/textAnalyse/gcs', function (req, res) {
    fs.readFile(req.files.file.path,{encoding: 'utf8'}, (err, data) => {
      if (err) {
          throw err;
      } else {
        var datareceive = data;
        var language = req.body.language;
        gcs.nluAnalyze(datareceive, language, function(response) {
                res.json(response);
            });
    }});
});

app.post('/textAnalyse/msb', function (req, res) {
    fs.readFile(req.files.file.path,{encoding: 'utf8'}, (err, data) => {
      if (err) {
          throw err;
      } else {
        var datareceive = data;
        var language = req.body.language;
        msb.nluAnalyze(datareceive, language, function(response) {
                res.json(response);
            });
    }});
});

app.post('/textAnalyseText/ibm', function (req, res) {
    var datareceive = req.body.texte;
    var language = req.body.language;
    var ibm = new IbmRecognition();
    ibm.nluAnalyze(datareceive, language, function (response) {
        res.json(response);
    });
});

app.post('/textAnalyseText/gcs', function (req, res) {
    var datareceive = req.body.texte;
    var language = req.body.language;
    gcs.nluAnalyze(datareceive, language, function (response) {
        res.json(response);
    });
});

app.post('/textAnalyseText/msb', function (req, res) {
    var datareceive = req.body.texte;
    var language = req.body.language;
    msb.nluAnalyze(datareceive, language, function (response) {
        res.json(response);
    });
});

// your express configuration here

app.listen(3000, function () {
    console.log('Server started up and listening on port 3000')
})




