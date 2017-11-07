const Speech = require('@google-cloud/speech');
const Language = require('@google-cloud/language');

module.exports = {
    recognition: function gcsRecognition(voicedataArray, languageCode, hintVocab, callback) {
//  return res.json({transcript: 'blala', confident: '0.6966666', words: [{startTime: '1s', endTime: '1.6s', word:'emploi'}, {startTime: '1s', endTime: '1.6s', word:'travail'}]});
        // Imports the Google Cloud client library

        // Instantiates a client
        const speech = Speech();
        const language = Language();
        const request = {
            config: {
                languageCode: languageCode,
                enableWordTimeOffsets: true,
                speechContexts: [{phrases: hintVocab}]
            },
            audio: {content: voicedataArray}
        };

        // Stream the audio to the Google Cloud Speech API
        speech.recognize(request)
            .then((results) => {
                if (results[0].results != null && results[0].results[0] != null && results[0].results[0].alternatives != null && results[0].results[0].alternatives[0] != null) {
                    const transcription = results[0].results[0].alternatives[0].transcript;
                    console.log(`<Google Cloud Platform> Transcription: ${transcription}`);
                    var words = '';
                    if (results[0].results[0].alternatives[0].words != null) {
                        for (var i = 0; i < results[0].results[0].alternatives[0].words.length; i++) {
                            words += results[0].results[0].alternatives[0].words[i].word;
                        }
                    }
                    const document = {
                        'content': transcription,
                        type: 'PLAIN_TEXT'
                    };

                    language.analyzeSentiment({'document': document})
                        .then((sentimentResult) => {
                            const sentiment = sentimentResult[0].documentSentiment;
                            console.log('Sentiment' + JSON.stringify(sentiment));
                            var sent = interpretSentiment(sentiment);
                            callback({
                                transcript: results[0].results[0].alternatives[0].transcript,
                                confidence: results[0].results[0].alternatives[0].confidence,
                                words: words,
                                tone: sent
                            });
                        })
                        .catch((err) => {
                            console.error('ERROR:', err);
                            callback({transcript: "<Google Cloud Platform> : Je ne sais pas transcrire"});
                        });
                } else {
                    callback({transcript: "<Google Cloud Platform> : Je ne sais pas transcrire"});
                }
            })
            .catch((err) => {
                console.error('<Google Cloud Platform> : ERROR:', err);
                callback({transcript: "<Google Cloud Platform> : Je ne sais pas transcrire (Erreur = " + err + ")"});
            });

        // [END speech_streaming_recognize]
    },
    nluAnalyze: function nluAnalyze(uploadedDocument, languageCode, callback) {
        const language = Language();
        const document = {
            'content': uploadedDocument,
            type: 'PLAIN_TEXT'
        };
        language.analyzeSentiment({'document': document})
            .then((sentimentResult) => {
            // Scroring selon les statistiques de phrases :
                // nombre de phrases à score négatif / posifif / neutre
                // si le négatif domine, classer les sentiments pour déduire quel sentiment négatif
            var sentences = sentimentResult[0].sentences;
                var negativeCount = 0;
                var posiviveCount = 0;
                var neutralCount=0;
                var negativeSentiments = [{count: 0, score: 0},{count: 0, score: 0},{count: 0, score: 0},{count: 0, score: 0}];
                var sentimentArray=['anger', 'disgust', 'fear','sadness'];
                var j;
            for (var i=0; i< sentences.length; i++) {
                var s={emotions:{}};
                s=interpretSentiment(sentences[i].sentiment);
                if (s.emotions.anger || s.emotions.disgust || s.emotions.fear || s.emotions.sadness) {
                    negativeCount++;
                    j = s.emotions.anger?0:s.emotions.disgust?1:s.emotions.fear?2:3
                    negativeSentiments[j] = {count: negativeSentiments[j].count+1, score: negativeSentiments[j].score+s.emotions[sentimentArray[j]]}
                } else if (s.emotions.joy) {
                   posiviveCount++
                } else {
                    neutralCount++
                }
            }
                var sent={emotions: {}};
            if (neutralCount > posiviveCount && neutralCount > negativeCount) {
                sent = {emotions: {neutral: 0.1}};
            } else if (posiviveCount > neutralCount && posiviveCount > negativeCount) {
                sent = {emotions: {joy: 0.9}};
            } else {
                // déterminer quel est le sntiment négatif dominant
                var dominantEmotion=0;
                var indiceDominantEmotion;
                for (var i=0; i<negativeSentiments.length; i++) {
                    if (Math.abs(negativeSentiments[i].count*negativeSentiments[i].score) > dominantEmotion) {
                        dominantEmotion = Math.abs(negativeSentiments[i].count*negativeSentiments[i].score);
                        indiceDominantEmotion = i;
                    }
                }
                
                sent.emotions[sentimentArray[indiceDominantEmotion]] = dominantEmotion;
            }
                console.log('Sentiment' + JSON.stringify(sent));
                callback({
                    transcript: uploadedDocument,
                    tone: sent
                });
            })
            .catch((err) => {
                console.error('ERROR:', err);
                callback({transcript: "<Google Cloud Platform> : Je ne sais pas analyser ce document"});
            });
    }
}

function interpretSentiment(sentiment) {
    if (sentiment == null) {
        return {emotions: {neutral: 0.1}}
    }
    var magnitude = sentiment.magnitude;
    var score = sentiment.score;

    if (score < -0.3) {
        if (magnitude >= 0.3) {
            // colère
            return {emotions: {anger: score*magnitude}}
        } else if (magnitude >= 0.2) {
            // dégoûté
            return {emotions: {disgust: score*magnitude}}
        } else if (magnitude >= 0.1) {
            // peur
            return {emotions: {sadness: score*magnitude}}
        } else {
            // neutre
            return {emotions: {neutral: score*magnitude}}
        }
    }
    else if (score <= 0.15) {
        if (magnitude >= 0.1) {
            // peur
            return {emotions: {neutral: score*magnitude}}
        } else {
            // neutre
            return {emotions: {neutral: score*magnitude}}
        }

    } else {
        if (magnitude >= 0.3) {
            // joie
            return {emotions: {joy: score*magnitude}}
        } else {
            // neutre
            return {emotions: {neutral: score*magnitude}}
        }
    }
}
