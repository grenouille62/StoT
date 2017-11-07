// set up basic variables for app

var record = document.querySelector('#recordButton');
var audio = document.querySelector('#myaudio');
var canvas = document.querySelector('.visualizer');
var spanmicro = document.querySelector('#spanmicro');

var audioCtx = new (window.AudioContext || webkitAudioContext)();
var canvasCtx = canvas.getContext("2d");
var stopRecord = true;

var ibmSpinner = document.getElementById("ibmSpinner");
var gcsSpinner = document.getElementById("gcsSpinner");
var msbSpinner = document.getElementById("msbSpinner");

var emotionPanel = ["fear", "sadness", "joy", "neutral", "disgust", "anger"]
var ibmSocialTranslation = {
    openness_big5: "Ouverte",
    conscientiousness_big5: "Conciencieuse", extraversion_big5: "Extravertie", agreeableness_big5: "Agréable", emotional_range_big5: "Emotionnelle"
};


if (navigator.mediaDevices.getUserMedia) {
    console.log('getUserMedia supported.');

    var constraints = {audio: true};
    var chunks = [];


    var onSuccess = function (stream) {

        //var mediaRecorder = new MediaRecorder(stream);


        record.onclick = function () {
            var recordimage = document.getElementById("recordimage");
            var actualImg = recordimage.getAttribute("xlink:href");
            if (actualImg.indexOf("images/002-microphone.svg") >= 0) {

                //mediaRecorder.stop();
                //console.log(mediaRecorder.state);
                stopRecording();
                console.log("recorder stopped");
                actualImg = "images/001-muted.svg"
                recordimage.setAttribute("xlink:href", actualImg);
            } else {
                actualImg = "images/002-microphone.svg";
                recordimage.setAttribute("xlink:href", actualImg);

                // Démarrer l'enregistrement
                chunks = [];
                resetResult();
                //mediaRecorder.start();
                startRecording(stream);
                stopRecord = false;
                visualize(stream);
                //console.log(mediaRecorder.state);
                console.log("recorder started");
            }

        };

        // mediaRecorder.onstop = function (e) {
        //   stopRecord = true;
        //   console.log("data available after MediaRecorder.stop() called.");
        //   // Récupérer le résultat de l'enregistrement par mediaRecorder dans 1 blob : le format est OGG
        //   var blob = new Blob(chunks);
        //   console.log("recorder stopped");
        //
        //   // Conversion de l'OGG en WAV :
        //   var readerOgg = new FileReader();
        //   readerOgg.readAsArrayBuffer(blob);
        //   readerOgg.onloadend = function () {
        //     audioBuffer = readerOgg.result;
        //
        //     // Puis utiliser le décodeur de l'audio context pour convertir le blob OGG en audio buffer
        //     // attention le décodage est asynchrone : pour traiter la donnée complètement décodé, il faut
        //     // effectuer le traitement dans le callback.
        //     audioCtx.decodeAudioData(audioBuffer).then(function (decodedData) {
        //       var sourceBuffer = decodedData;
        //       // transformer l'audio buffer en buffer WAV
        //       var wavBuffer = audioBufferToWav(sourceBuffer, {float32: false});
        //       // Creer un blob à partir du buffer WAV pour l'encodage en base 64
        //       var blob2 = new Blob([new Uint8Array(wavBuffer)], {type: 'audio/wav'});
        //
        //       // Mettre le WAV dans le lecteur audio de la page pour la ré écoute
        //       var audioURL = window.URL.createObjectURL(blob2);
        //       audio.src = audioURL;
        //
        //       // Encoder le WAV en base 64
        //       var readerWav = new FileReader();
        //       readerWav.readAsDataURL(blob2);
        //       readerWav.onloadend = function () {
        //         base64data = readerWav.result;
        //         b64 = base64data.split('base64,')[1];
        //         // Envoyer l'enregistrement WAV encodé en base64 au serveur pour la transcription
        //         showTranscript(b64);
        //         chunks = [];
        //       };
        //     });
        //
        //
        //   };
        //
        // }

        // mediaRecorder.ondataavailable = function (e) {
        //   chunks.push(e.data);
        // }
    }

    var onError = function (err) {
        alert('The following error occured: ' + err);
        console.log('The following error occured: ' + err);
    }

    navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);

} else {
    console.log('getUserMedia not supported on your browser!');
}
var recorder;
var input;

function startRecording(stream) {
    stopRecord = false;
    input = audioCtx.createMediaStreamSource(stream);
    recorder = new Recorder(input);
    recorder && recorder.record();
}

function stopRecording() {
    stopRecord = true;
    recorder && recorder.stop(input);
    recorder && recorder.exportWAV(function (blob) {
        var url = URL.createObjectURL(blob);
        audio.src = url;

        // Encoder le WAV en base 64
        var readerWav = new FileReader();
        readerWav.readAsDataURL(blob);
        readerWav.onloadend = function () {
            base64data = readerWav.result;
            b64 = base64data.split('base64,')[1];
            // Envoyer l'enregistrement WAV encodé en base64 au serveur pour la transcription
            showTranscript(b64);
        }
    });


    recorder.clear();
    //
    //
    //
    // var sourceBuffer = {numChannels: 1, sampleRate: sampleRate, getChannelData: mergeBuffers(chunks, chunkLength)};
    // // transformer l'audio buffer en buffer WAV
    // var wavBuffer = audioBufferToWav(sourceBuffer, {float32: false});
    // // Creer un blob à partir du buffer WAV pour l'encodage en base 64
    // var blob2 = new Blob([new Uint16Array(wavBuffer)], {type: 'audio/wav'});
    //
    // // Mettre le WAV dans le lecteur audio de la page pour la ré écoute
    // var audioURL = window.URL.createObjectURL(blob2);
    // audio.src = audioURL;
    //
    // // Encoder le WAV en base 64
    // var readerWav = new FileReader();
    // readerWav.readAsDataURL(blob2);
    // readerWav.onloadend = function () {
    //   base64data = readerWav.result;
    //   b64 = base64data.split('base64,')[1];
    //   // Envoyer l'enregistrement WAV encodé en base64 au serveur pour la transcription
    //   //showTranscript(b64);
    //   chunks = [];
    // };
}

function visualize(stream) {
    var source = audioCtx.createMediaStreamSource(stream);

    var analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    input.connect(analyser);
    //analyser.connect(audioCtx.destination);

    draw()

    function draw() {
        if (stopRecord) {
            input.disconnect();
            return;
        }
        WIDTH = canvas.width;
        HEIGHT = canvas.height;

        requestAnimationFrame(draw);

        analyser.getByteTimeDomainData(dataArray);

        //canvasCtx.fillStyle = "rgba(255, 255, 255, 0.5)";
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = 'rgb(0, 0, 255)';

        canvasCtx.beginPath();

        var sliceWidth = WIDTH * 1.0 / bufferLength;
        var x = 10;


        for (var i = 0; i < bufferLength; i++) {

            var v = dataArray[i] / 128.0;
            var y = v * HEIGHT / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();

    }
}

window.onresize = function () {
    canvas.width = spanmicro.offsetWidth - 10;
}

window.onresize();

function showTranscript(vdata) {

    ibmSpinner.setAttribute("style", "visibility: visible");
    gcsSpinner.setAttribute("style", "visibility: visible");
    msbSpinner.setAttribute("style", "visibility: visible");

    var e = document.getElementById("language");
    var language = e.options[e.selectedIndex].value;
    callRecognitionService('ibm', vdata, language);
    callRecognitionService('gcs', vdata, language);
    callRecognitionService('msb', vdata, language);
}

function showNluAnalyze(option) {

    ibmSpinner.setAttribute("style", "visibility: visible");
    gcsSpinner.setAttribute("style", "visibility: visible");
    msbSpinner.setAttribute("style", "visibility: visible");

    if (option == "file") {
        callNlUServiceFile('ibm');
        callNlUServiceFile('gcs');
        callNlUServiceFile('msb');
    } else {
        callNlUServiceTexte('ibm');
        callNlUServiceTexte('gcs');
        callNlUServiceTexte('msb');
    }
}

function callRecognitionService(challenger, vdata, languageCode) {
    //Send data to server
    $.ajax({
        type: "POST",
        url: '/recognize/' + challenger,
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(
            {voice: vdata, language: languageCode}),
        success: function (data) {
            showResult(challenger, data)
        },
        error: function (xhr, status, error) {
            showError(challenger, xhr, status, error);
        }
    });
}

function callNlUServiceFile(challenger) {
    resetResult();
    var e = document.getElementById("language");
        var language = e.options[e.selectedIndex].value;
    var formData = new FormData();

    // add assoc key values, this will be posts values
    formData.append("file", document.getElementById('document').files[0], document.getElementById('document').files[0].name);
    formData.append("upload_file", true);
    formData.append("language", language);

    $.ajax({
        type: "POST",
        url: "/textAnalyse/" + challenger,
        enctype: 'multipart/form-data',
        success: function (data) {
            showResult(challenger, data)
        },
        error: function (xhr, status, error) {
                    showError(challenger, xhr, status, error);
                },
        async: true,
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        timeout: 60000
    });
}

function callNlUServiceTexte(challenger) {
    resetResult();
    var e = document.getElementById("language");
    var language = e.options[e.selectedIndex].value;
    var vdata = document.getElementById("textNLUinput").value;

    $.ajax({
        type: "POST",
        url: "/textAnalyseText/" + challenger,
        data: JSON.stringify(
            {texte: vdata, language: language}),
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function (data) {
            showResult(challenger, data)
        },
        error: function (xhr, status, error) {
            showError(challenger, xhr, status, error);
        }
    });
}

// Reset stars, rating value & result text before new recognition
function resetResult() {
    var challengers = ['ibm', 'gcs', 'msb'];
    var originalIconSize = 32;
    for (var j = 0; j < challengers.length; j++) {
        document.getElementById(challengers[j] + "Transcript").value = "";
        document.getElementById(challengers[j] + "ConfidentValue").innerHTML = '';
        document.getElementById(challengers[j] + "RatingBloc").setAttribute("class", "acidjs-rating-stars acidjs-rating-disabled")
        for (var i = 1; i <= 5; i++) {
            document.getElementById(challengers[j] + "-group-" + i).removeAttribute("checked");
        }
        for (var i = 0; i < emotionPanel.length; i++) {
            if (document.getElementById(challengers[j] + emotionPanel[i] + "Icon") != null) {
                document.getElementById(challengers[j] + emotionPanel[i] + "Icon").setAttribute("style", "display: none")
                document.getElementById(challengers[j] + emotionPanel[i] + "Icon").setAttribute("width", originalIconSize)
                document.getElementById(challengers[j] + emotionPanel[i] + "Icon").setAttribute("height", originalIconSize)
                document.getElementById(challengers[j] + emotionPanel[i] + "Svg").setAttribute("width", originalIconSize);
                document.getElementById(challengers[j] + emotionPanel[i] + "Svg").setAttribute("height", originalIconSize);
            }
        }
        if (document.getElementById(challengers[j] + "Emotion") != null) {
            document.getElementById(challengers[j] + "Emotion").setAttribute("style", "visibility: hidden")
        }
        if (document.getElementById(challengers[j] + "DivAttitude") != null) {
            document.getElementById(challengers[j] + "DivAttitude").setAttribute("style", "visibility: hidden");
        }

    }
}

function showResult(challenger, data) {
    var nbstars = 0;
    var confidentValue = 0;
    if (data.confidence > 0) {
        // Calculer le nombre d'étoile en fonction de la valeur de confiance
        nbstars = Math.floor((data.confidence * 100) / 20);
        confidentValue = ((data.confidence * 100) / 20.0).toFixed(1);
    }
    document.getElementById(challenger + "RatingBloc").setAttribute("class", "acidjs-rating-stars")
    for (var i = 1; i <= 5; i++) {
        if (i == nbstars) {
            document.getElementById(challenger + "-group-" + i).setAttribute("checked", "checked");
        } else {
            document.getElementById(challenger + "-group-" + i).removeAttribute("checked");
        }
    }

    // Affichage de valeur de confiance
    // Calculer la valeur en rapportant à l'échelle de 5
    document.getElementById(challenger + 'ConfidentValue').innerHTML = confidentValue + '/5';
    // Cacher le spinner et afficher le bloc de confiance
    document.getElementById(challenger + 'Spinner').setAttribute("style", "visibility: hidden");
    document.getElementById(challenger + "Transcript").value = data.transcript;

    showEmotions(challenger, data.tone)
}

function showEmotions(challenger, tone) {
    if (tone !=null && tone.emotions != null) {
        if (Object.keys(tone.emotions).length == 0) {
            document.getElementById(challenger + "neutral" + "Icon").setAttribute("style", "display: inherit")
        }
        var refsize = Object.values(tone.emotions)[0]==0?1:Object.values(tone.emotions)[0];
        for (var i = 0; i < Object.keys(tone.emotions).length; i++) {
            document.getElementById(challenger + Object.keys(tone.emotions)[i] + "Icon").setAttribute("style", "display: inherit");
            var resizeSvg= Math.max(Object.values(tone.emotions)[i]/refsize, 0.2);
            var widthSvg = document.getElementById(challenger + Object.keys(tone.emotions)[i] + "Icon").getAttribute("width") * resizeSvg;
            var heightSvg = document.getElementById(challenger + Object.keys(tone.emotions)[i] + "Icon").getAttribute("height") * resizeSvg;
            document.getElementById(challenger + Object.keys(tone.emotions)[i] + "Svg").setAttribute("width", widthSvg);
            document.getElementById(challenger + Object.keys(tone.emotions)[i] + "Svg").setAttribute("height", heightSvg);
            document.getElementById(challenger + Object.keys(tone.emotions)[i] + "Icon").setAttribute("width", widthSvg);
            document.getElementById(challenger + Object.keys(tone.emotions)[i] + "Icon").setAttribute("height", heightSvg);
        }
        document.getElementById(challenger + "Emotion").setAttribute("style", "visibility: visible")
    }
    // Don't show attitude because only IBM implements this feature at this time
    // if (tone != null && tone.attitudes != null) {
    //     if (Object.keys(tone.attitudes).length == 0) {
    //         document.getElementById(challenger + "AttitudeText").innerHTML = "neutre"
    //     }
    //     var att = '';
    //     var nbrAtt = Object.keys(tone.attitudes).length;
    //     for (var i = 0; i < nbrAtt; i++) {
    //         att += (ibmSocialTranslation[Object.keys(tone.attitudes)[i]]==null?"neutre":ibmSocialTranslation[Object.keys(tone.attitudes)[i]]) + (i==nbrAtt-1?"":", ");
    //     }
    //     document.getElementById(challenger + "AttitudeText").innerHTML = att;
    //     document.getElementById(challenger + "DivAttitude").setAttribute("style", "visibility: visible");
    // }
}

function showError(challenger, xhr, status, error) {
    // Cacher le spinner et afficher le bloc de confiance
    document.getElementById(challenger + 'Spinner').setAttribute("style", "visibility: hidden");
    var message = "";
    if (xhr.readyState == 4) {
        message = status;
    }
    else if (xhr.readyState == 0) {
        message = "Erreur de connexion au serveur SToT";
    }
    else {
        message = "Une erreur est survenue - Code = " + xhr.readyState;
    }
    document.getElementById(challenger + "Transcript").value = message;
}



