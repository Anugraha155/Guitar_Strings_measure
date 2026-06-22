import uvicorn, numpy as np ,librosa

from fastapi import FastAPI, WebSocket

app = FastAPI()


STANDARD = {
    "Eh": 82,
    "A": 111,
    "D": 146,
    "G": 196,
    "B": 246,
    "El": 329
}



def nearest_string(clicked_string, played_freq):

    actual_closest = min(
        STANDARD, key=lambda x:
        abs(
            STANDARD[x] - played_freq
        )
    )

    if actual_closest == clicked_string:
        return (
            f"Perfect! "
            f"You played {clicked_string}."
        )

    return (
        f"Instead of "
        f"{clicked_string}, "
        f"you played "
        f"{actual_closest}."
    )


@app.get("/")
def home():
    return{"status": "running"}


@app.websocket("/ws")
async def websocket_ep(ws:WebSocket):
    await ws.accept()

    while True:
        data = await ws.receive_json()
        clicked =data["clicked_string"]
        samples = np.array(data["audio"],dtype=np.float32)

        if len(samples)< 2048:
            continue
        
        freq = librosa.yin(samples,fmin=80,fmax=350)

        detected = float(np.nanmedian(freq))
        string = nearest_string(played_freq= detected,clicked_string=clicked)


        await ws.send_json({
            "status": "ok",
            "frequency": round(detected, 2),
            "string_key": string,
            "string_name": string
        })


        print(
        "clicked:",
            clicked
            )

        print(
        "detected:",
        detected
        )