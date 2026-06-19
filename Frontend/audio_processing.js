let audioContext;
let socket;
let expectedString = null; // the backend string_key the user clicked, e.g. "B3"

function selectString(stringKey) {
    expectedString = stringKey;

    const status = document.getElementById("status");
    if (status) status.textContent = `Selected ${stringKey}. Play it now...`;


    startListening();
}

async function startListening() {
    if (audioContext) return; // already listening, don't open a second stream

    audioContext = new AudioContext({ sampleRate: 44100 });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    socket = new WebSocket("ws://localhost:8000/ws/listen");
    socket.binaryType = "arraybuffer";

    socket.onmessage = (event) => {
        const result = JSON.parse(event.data);
        if (result.status === "ok") {
            updateUI(result);
        }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0); // Float32Array, 1 channel
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(input.buffer);
        }
    };
}

function stopListening() {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (socket) {
        socket.close();
        socket = null;
    }
}

function updateUI(result) {
    const detectedKey = result.string_key;     // compare against this
    const detectedLabel = result.string_name;  //show this to the user

    document.getElementById("detected-note").textContent = detectedLabel;
    document.getElementById("frequency").textContent = `${result.frequency} Hz`;

    const statusEl = document.getElementById("status");
    if (!statusEl || !expectedString) return;

    if (detectedKey === expectedString) {
        statusEl.textContent = `Correct! You played ${detectedLabel}.`;
    } else {
        statusEl.textContent = `You played ${detectedLabel} instead.`;
    }
}

// Wire up every string button once the page has loaded
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".strings button").forEach((btn) => {
        btn.addEventListener("click", () => {
            selectString(btn.dataset.string);
        });
    });

    const stopBtn = document.getElementById("stop");
    if (stopBtn) stopBtn.addEventListener("click", stopListening);
});