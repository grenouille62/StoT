'use strict';
var SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1')
var streamBuffer = require('simple-bufferstream');

var MAX_EMOTION = 1;
var MAX_ATTITUDE = 2;
var EMOTION_THRESHOLD = 0.2;
var ATTITUDE_THRESHOLD = 0.2;

class IbmRecognition {
    constructor() {
        this.recognizer = initSpeech({username: "d13a4c6b-4208-4653-b40c-0b918380840e", password: "P0Cm4TbMuXcE", version_date: '2016-05-19'});
        this.analyser = initTone({username: '522a1af0-27d3-4f34-aefe-f8a7791dabca', password: 'HYVvL0cait7Y', version_date: '2016-05-19'});
        this.nlu = initNLU({
            username: '00bf3e19-6918-43fc-b289-a3748e3b989f',
            password: 'M3vwreXQTWyO',
            version_date: NaturalLanguageUnderstandingV1.VERSION_DATE_2017_02_27
        })
    }

    recognition(buffer, languageCode, hintVocab, callback) {
        var speechToTextV1 = this.recognizer
        var toneAnalyserV3 = this.analyser

        var param = {
            audio: streamBuffer(buffer),
            model: languageCode + '_BroadbandModel',
            content_type: "audio/wav",
            word_alternatives_threshold: 0,
            keywords: hintVocab,
            keywords_threshold: 0
        }
        speechToTextV1.recognize(param, function (err, results) {
            if (err) {
                console.error('<IBM Watson> ERROR:', err);
                return {transcript: "<IBM Watson> : Je ne sais pas transcrire (Erreur = " + err + ")"};
            }
            else {
                var words = '';
                if (results.results[0] != null && results.results[0].word_alternatives != null) {
                    for (var i = 0; i < results.results[0].word_alternatives.length; i++) {
                        if (results.results[0].word_alternatives[i].alternatives[i] != null) {
                            words += results.results[0].word_alternatives[i].alternatives[i].word;
                        }
                    }
                    console.log("<IBM Watson> Transcription : " + results.results[0].alternatives[0].transcript) //JSON.stringify(results, null, 2));
                    toneAnalyze(toneAnalyserV3, results.results[0].alternatives[0].transcript, languageCode,
                        function (response) {
                            callback({
                                transcript: results.results[0].alternatives[0].transcript,
                                confidence: results.results[0].alternatives[0].confidence,
                                words: words,
                                tone: response
                            });
                        }
                    )
                } else {
                    callback({transcript: "<IBM Watson> : Je ne sais pas transcrire"});
                }
            }
        });
    };

    nluAnalyze(document, languageCode, callback) {
        var param = {text: document, language: languageCode.split('-')[0], features: {sentiment: {}}};
        this.nlu.analyze(param, function (err, response) {
            if (err) {
                callback({transcript: "<IBM Watson> : Je ne sais pas anlyser (Erreur = " + err + ")"});
                console.log('error:', err);
            }
            else {
                var sent = interpretDocument(response.sentiment.document);
                callback({
                    transcript: document,
                    words: {},
                    tone: sent
                });
            }
        });
    }
}

function initSpeech(credential) {
    return new SpeechToTextV1(
        credential);
}

function initTone(credential) {
    return new ToneAnalyzerV3(
        credential);
};

function initNLU(credential) {
    return new NaturalLanguageUnderstandingV1(
        credential);
};

function toneAnalyze(analyser, texte, languageCode, returnTranscript) {
    var emotionPanel = {emotions: {}, attitudes: {}};
    var emotionScore = [];
    var socialScore = [];

    analyser.tone({text: texte, language: languageCode.split('-')[0]},
        function (err, toneResult) {
            if (err || toneResult == null || toneResult.document_tone == null || toneResult.document_tone.tone_categories == null) {
                console.log(err);
                emotionPanel.emotions["neutral"] = 0.1;
                emotionPanel.attitudes["neutral"] = 0.1;
            }
            else {
                console.log("<IBM Watson tone analyze> :" + JSON.stringify(toneResult, 2, null));
                var tc = toneResult.document_tone.tone_categories[0].tones; // 0=emotion; 1=social (attitude); 2=langage ; on retient que l'émotion et l'attitude dans ce POC
                var social = toneResult.document_tone.tone_categories[2].tones;
                // Sélectionner les MAX_EMOTION meilleurs émotions
                for (var i = 0; i < tc.length; i++) {
                    if (tc[i].score > 0 && tc[i].score >= EMOTION_THRESHOLD) {
                        emotionScore.push(tc[i].score);
                    }
                }
                emotionScore.sort(function (a, b) {
                    return b - a;
                });
                for (var i = 0; i < MAX_EMOTION; i++) {
                    for (var k = 0; k < tc.length; k++) {
                        if (emotionScore[i] == tc[k].score) {
                            emotionPanel.emotions[tc[k].tone_id] = tc[k].score;
                            break;
                        }
                    }
                }
                // Sélectionner MAX_ATTITUDE meilleures attitudes
                for (var i = 0; i < social.length; i++) {
                    if (social[i].score > 0 && social[i].score >= ATTITUDE_THRESHOLD) {
                        socialScore.push(social[i].score);
                    }
                }
                socialScore.sort(function (a, b) {
                    return b - a;
                });
                for (var i = 0; i < MAX_ATTITUDE; i++) {
                    for (var k = 0; k < social.length; k++) {
                        if (socialScore[i] == social[k].score) {
                            emotionPanel.attitudes[social[k].tone_id] = social[k].score;
                            break;
                        }
                    }
                }
            }
            returnTranscript(emotionPanel);
        })
};

function interpretDocument(sentiment) {
    if (sentiment == null) {
        return {emotions: {neutral: 0.1}}
    }
    var score = sentiment.score;

    if (score < 0) {
        if (score <= -0.7) {
            // colère
            return {emotions: {anger: 0.9}}
        } else if (score <= -0.55) {
            // dégoûté
            return {emotions: {disgust: 0.9}}
        } else if (score <= -0.45) {
            // peur
            return {emotions: {fear: 0.9}}
        } else if (score <= 0.3) {
            // maussade
            return {emotions: {sadness: 0.9}}
        } else {
            return {emotions: {neutral: 0.9}}
        }
    }
    else if (score > 0) {
        if (score >= 0.3) {
            return {emotions: {joy: 0.9}}
        } else {
            return {emotions: {neutral: 0.9}}
        }
    } else {
        // neutre
        return {emotions: {neutral: 0.9}}
    }
}

module.exports = IbmRecognition;


