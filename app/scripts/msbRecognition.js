var BingSpeechClient = require('bingspeech-api-client').BingSpeechClient;
var https = require('https');
var bingSpeechClient = new BingSpeechClient("45f15ceb25c34b6b93857412cb3d969f");
var textAnalyseConnectParam = {endpoint: "westus.api.cognitive.microsoft.com", apiKey: "4cc42187bdf64e52ae5cc41cd93bc3e3"};
module.exports = {
    recognition: function msbRecognition(buffer, languageCode, hintVocab, callback) {
        bingSpeechClient.recognize(buffer, languageCode)
            .then(response => {
                    if (response.results != null && response.results.length > 0) {
                        console.log("<Microsoft Speecg Bing> Transcription : " + response.results[0].name);
                        var lang = languageCode.split('-')[0];
                        const docs = {
                            documents: [
                                {
                                    language: lang,
                                    id: "1",
                                    text: response.results[0].name
                                }
                            ]
                        };

                        callSentimentAnalyze(textAnalyseConnectParam.endpoint, textAnalyseConnectParam.apiKey, docs, function (sentimentResult) {
                            var sent = interpretSentiment(sentimentResult.documents[0]);
                            callback({
                                transcript: response.results[0].name,
                                confidence: response.results[0].confidence,
                                words: response.results[0].lexical,
                                tone: sent
                            });
                        })
                    } else {
                        callback({transcript: "<Microsoft Speecg Bing> : Je ne sais pas transcrire"});
                    }
                }
            )
            .catch((err) => {
                console.error('<Microsoft Speecg Bing> : ERROR:', err);
                callback({transcript: "<Microsoft Speecg Bing> : Je ne sais pas transcrire (Erreur = " + err + ")"});
            });
    },
    nluAnalyze: function nluAnalyze(document, languageCode, callback) {
        var lang = languageCode.split('-')[0];
        const docs = {
            documents: [
                {
                    language: lang,
                    id: "1",
                    text: document
                }
            ]
        };
        callSentimentAnalyze(textAnalyseConnectParam.endpoint, textAnalyseConnectParam.apiKey, docs, function (sentimentResult) {
            var sent = interpretSentiment(sentimentResult.documents[0]);
            callback({
                transcript: document,
                tone: sent
            });
        })
    }

}

function interpretSentiment(sentiment) {
    if (sentiment == null) {
        return {emotions: {neutral: 0.1}}
    }
    var score = sentiment.score;

    if (score > 0) {
        if (score <= 0.3) {
            // colère
            return {emotions: {anger: 0.9}}
        } else if (score <= 0.45) {
            // dégoûté
            return {emotions: {disgust: 0.9}}
        } else if (score <= 0.55) {
            // peur
            return {emotions: {fear: 0.9}}
        } else if (score <= 0.7) {
            // maussade
            return {emotions: {sadness: 0.9}}
        } else {
            // neutre
            return {emotions: {joy: 0.9}}
        }
    }
    else {
        // neutre
        return {emotions: {neutral: 0.9}}
    }
}

function callSentimentAnalyze(endPoint, apiKey, documents, callback) {
    var accessKey = apiKey;
    var uri = endPoint;
    var path = '/text/analytics/v2.0/sentiment';

    var response_handler = function (response) {
        let body = '';
        response.on('data', function (d) {
            body += d;
        });
        response.on('end', function () {
            let body_ = JSON.parse(body);
            let body__ = JSON.stringify(body_, null, '  ');
            console.log(body__);
            callback(body_);
        });
        response.on('error', function (e) {
            console.log('Error: ' + e.message);
        });
    };

    var get_sentiments = function (documents) {
        let body = JSON.stringify(documents);

        let request_params = {
            method: 'POST',
            hostname: uri,
            path: path,
            headers: {
                'Ocp-Apim-Subscription-Key': accessKey,
            }
        };

        let req = https.request(request_params, response_handler);
        req.write(body);
        req.end();
    }

    get_sentiments(documents);

}

