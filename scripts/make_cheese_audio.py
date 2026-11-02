import asyncio
import json
import math
import os
import random
import struct
import subprocess
import wave
import edge_tts

SR = 48000

BEATS = [
    ("hook", "A navy captain once won a warship battle by firing stale cheese out of his cannons."),
    ("setting", "It is 1841 off the coast of Uruguay, and Commodore John Coe is locked in a gun duel with a bigger enemy flagship."),
    ("bad_news", "Ten minutes in, the gunner runs up with terrible news: the powder barrels are full, but they are completely out of iron cannonballs."),
    ("white_flag", "The enemy ship is turning in to finish them off, and the crew is ready to wave the white flag."),
    ("idea", "Then the captain remembers the kitchen below deck is stacked with round wheels of Dutch cheese that went stale months ago."),
    ("load", "He orders the crew to roll the cheeses up the stairs and ram them straight down the eighteen-pounder cannons."),
    ("fire", "The whole broadside fires at once, and a dozen yellow wheels scream across the water and smash right through the enemy mast."),
    ("luckily", "Luckily for the enemy crew, they were only getting hit with dairy."),
    ("unluckily", "Unluckily for the enemy crew, that dairy was moving at nine hundred miles an hour."),
    ("yousee", "You see, when round Dutch cheese dries out at sea, the moisture leaves and the proteins lock together like solid oak."),
    ("fridge", "Ever left a block of cheese uncovered in the back of the fridge? You can barely dent it with a knife, and fired from a cannon, it shatters on impact like shrapnel."),
    ("retreat", "The enemy admiral thought they were using a secret new exploding weapon and ordered his entire fleet to retreat."),
    ("ending", "So the next time someone says cheese is not tactical, remind them it is undefeated at sea."),
]


async def main():
    os.makedirs("out/cheese", exist_ok=True)
    os.makedirs("public/cheese", exist_ok=True)
    timeline = []
    cur_t = 0.1
    all_pcm = bytearray(int(0.1 * SR) * 4)

    for bid, txt in BEATS:
        mp3_p = f"out/cheese/b_{bid}.mp3"
        wav_p = f"out/cheese/b_{bid}.wav"
        comm = edge_tts.Communicate(txt, "en-US-ChristopherNeural", rate="+22%")
        await comm.save(mp3_p)
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                mp3_p,
                "-af",
                "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_silence=0.08:start_threshold=-45dB,areverse",
                "-ar",
                str(SR),
                "-ac",
                "2",
                wav_p,
                "-loglevel",
                "error",
            ],
            check=True,
        )
        with wave.open(wav_p, "rb") as w:
            frames = w.readframes(w.getnframes())
            dur = w.getnframes() / SR
        t_start = cur_t
        t_end = cur_t + dur
        words_list = txt.split()
        w_dur = dur / len(words_list)
        timeline.append(
            {
                "id": bid,
                "text": txt,
                "start": round(t_start, 3),
                "end": round(t_end, 3),
                "startFrame": round(t_start * 30),
                "endFrame": round(t_end * 30),
                "words": [
                    {
                        "word": w,
                        "start": round(t_start + i * w_dur, 3),
                        "end": round(t_start + (i + 1) * w_dur, 3),
                    }
                    for i, w in enumerate(words_list)
                ],
            }
        )
        all_pcm.extend(frames)
        gap = 0.08
        all_pcm.extend(b"\x00" * (int(gap * SR) * 4))
        cur_t = t_end + gap

    all_pcm.extend(b"\x00" * (int(0.4 * SR) * 4))
    total_dur = len(all_pcm) / (SR * 4)
    total_samples = int(len(all_pcm) // 4)

    with wave.open("out/cheese/voice.wav", "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(bytes(all_pcm))

    with open("out/cheese/words.json", "w") as jf:
        json.dump(
            {
                "totalDuration": round(total_dur, 3),
                "totalFrames": math.ceil(total_dur * 30),
                "beats": timeline,
            },
            jf,
            indent=2,
        )

    # Synthesize naval march bed + cannon / cheese / mast-shatter SFX
    random.seed(1841)
    sfx = [0.0] * total_samples

    # Steady naval snare & low brass pulse under narration
    beat_interval = 0.52
    t_beat = 0.1
    step_idx = 0
    while t_beat < total_dur - 0.3:
        idx0 = int(t_beat * SR)
        notes = [110.0, 130.81, 146.83, 164.81]
        freq = notes[step_idx % len(notes)]
        for i in range(int(0.28 * SR)):
            if idx0 + i < total_samples:
                t = i / SR
                # drum + warm bass note
                drum = math.sin(2 * math.pi * (95 * math.exp(-t * 18)) * t) * math.exp(-t * 25) * 0.14
                snare = (random.random() * 2 - 1) * math.exp(-t * 38) * (0.07 if step_idx % 2 == 1 else 0.03)
                brass = (math.sin(2 * math.pi * freq * t) + 0.5 * math.sin(4 * math.pi * freq * t)) * math.exp(-t * 6) * 0.06
                sfx[idx0 + i] += drum + snare + brass
        t_beat += beat_interval
        step_idx += 1

    # Add cannon blasts + whistle + wooden mast shatter at key beats
    beat_map = {b["id"]: b for b in timeline}

    def add_cannon(t_sec, gain=0.65):
        i0 = int(t_sec * SR)
        for i in range(int(0.65 * SR)):
            if 0 <= i0 + i < total_samples:
                t = i / SR
                boom = math.sin(2 * math.pi * (68 * math.exp(-t * 6)) * t) * math.exp(-t * 7) * 0.65
                crack = (random.random() * 2 - 1) * math.exp(-t * 22) * 0.45
                sfx[i0 + i] += (boom + crack) * gain

    def add_whistle_and_crash(t_sec):
        i0 = int(t_sec * SR)
        for i in range(int(0.9 * SR)):
            if 0 <= i0 + i < total_samples:
                t = i / SR
                if t < 0.45:
                    # screaming cheese wheel whistle
                    w = math.sin(2 * math.pi * (980 - 620 * t) * t) * 0.18
                    sfx[i0 + i] += w
                else:
                    # wooden mast shatter & shrapnel
                    tc = t - 0.45
                    crunch = (random.random() * 2 - 1) * math.exp(-tc * 9) * 0.55
                    wood = math.sin(2 * math.pi * 240 * tc) * math.exp(-tc * 14) * 0.35
                    sfx[i0 + i] += crunch + wood

    add_cannon(beat_map["hook"]["start"] + 1.8, 0.45)
    add_cannon(beat_map["setting"]["start"] + 2.2, 0.40)
    add_cannon(beat_map["fire"]["start"] + 0.3, 0.75)
    add_cannon(beat_map["fire"]["start"] + 0.45, 0.70)
    add_whistle_and_crash(beat_map["fire"]["start"] + 1.6)
    add_cannon(beat_map["unluckily"]["start"] + 1.2, 0.55)
    add_whistle_and_crash(beat_map["fridge"]["start"] + 3.2)

    # Mix voice + sfx into public/cheese/mix.wav and mix.mp3
    mix_pcm = bytearray()
    for i in range(total_samples):
        vL, vR = struct.unpack_from("<hh", all_pcm, i * 4)
        s_val = int(sfx[i] * 24000)
        outL = max(-32700, min(32700, int(vL * 1.05) + s_val))
        outR = max(-32700, min(32700, int(vR * 1.05) + s_val))
        mix_pcm.extend(struct.pack("<hh", outL, outR))

    with wave.open("out/cheese/mix.wav", "wb") as mf:
        mf.setnchannels(2)
        mf.setsampwidth(2)
        mf.setframerate(SR)
        mf.writeframes(bytes(mix_pcm))

    subprocess.run(
        ["ffmpeg", "-y", "-i", "out/cheese/mix.wav", "-b:a", "192k", "public/cheese/mix.mp3", "-loglevel", "error"],
        check=True,
    )

    print(f"Voice & Mix ready: {total_dur:.2f}s ({math.ceil(total_dur * 30)} frames)")
    for b in timeline:
        print(f"{b['id']:10s}: {b['start']:5.2f}s - {b['end']:5.2f}s (frames {b['startFrame']:4d} - {b['endFrame']:4d})")


if __name__ == "__main__":
    asyncio.run(main())
