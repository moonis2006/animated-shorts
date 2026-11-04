import asyncio
import os
import subprocess
import wave
import math
import struct
import json
import edge_tts

SR = 48000
TOTAL_DURATION = 70.0  # Exactly 70 seconds = 2100 frames at 30 fps

SCENES = [
    (
        "scene1_hook",
        "Almost 1,700 years ago, the Romans created something extraordinary. But nobody knows what it was for.",
        0.5,
        6.8
    ),
    (
        "scene2_rome",
        "Across the Roman Empire, craftsmen were making strange objects unlike anything else.",
        7.5,
        14.5
    ),
    (
        "scene3_craftsman",
        "Each one had twelve sides, holes of different sizes, and tiny knobs at every corner.",
        15.5,
        23.5
    ),
    (
        "scene4_spread",
        "More than a hundred have been discovered across former Roman territories. Yet no Roman document explains their purpose.",
        24.5,
        33.5
    ),
    (
        "scene5_theories",
        "Was it a candle holder? A measuring instrument? A ritual object? Or perhaps something used to make gloves? Nobody knows for certain.",
        34.5,
        49.0
    ),
    (
        "scene6_modern",
        "In 2023, archaeologists discovered another remarkably preserved example in Norton Disney, England.",
        50.5,
        60.0
    ),
    (
        "scene7_ending",
        "After nearly seventeen centuries, the Roman dodecahedron remains one of archaeology's strangest unanswered mysteries. What do you think it was actually used for?",
        61.2,
        69.2
    )
]

def make_chime_sample(freq, dur_s, decay=3.0):
    samples = []
    n = int(dur_s * SR)
    for i in range(n):
        t = i / SR
        # Rich bronze harmonic timbre: fundamental + 2.76x + 5.4x
        env = math.exp(-decay * t)
        val = (math.sin(2 * math.pi * freq * t) * 0.6 +
               math.sin(2 * math.pi * freq * 2.76 * t) * 0.25 +
               math.sin(2 * math.pi * freq * 5.4 * t) * 0.15) * env
        samples.append(val)
    return samples

def make_metal_clink():
    return make_chime_sample(1800, 0.45, decay=12.0)

def make_fire_crackle(dur_s):
    samples = []
    n = int(dur_s * SR)
    last = 0.0
    for i in range(n):
        # Pinkish crackle
        white = (os.urandom(1)[0] / 127.5) - 1.0
        last = 0.95 * last + 0.05 * white
        # Pop impulses
        pop = 0.0
        if (i % 2400 == 0) and (os.urandom(1)[0] > 180):
            pop = ((os.urandom(1)[0] / 127.5) - 1.0) * 0.4
        samples.append((last * 0.06 + pop))
    return samples

async def main():
    out_dir = "out/dodecahedron"
    pub_dir = "public/dodecahedron"
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(pub_dir, exist_ok=True)

    print("Generating voice narration for 7 scenes...")
    scene_words = []

    # Prepare master narration audio buffer (stereo, 16-bit)
    total_samples = int(TOTAL_DURATION * SR)
    voice_left = [0.0] * total_samples
    voice_right = [0.0] * total_samples

    for sid, text, target_start, target_end in SCENES:
        mp3_p = f"{out_dir}/{sid}.mp3"
        wav_p = f"{out_dir}/{sid}.wav"

        # Edge TTS: deep documentary voice
        comm = edge_tts.Communicate(text, "en-US-AndrewNeural", rate="-2%")
        await comm.save(mp3_p)

        # Normalize audio with ffmpeg
        subprocess.run([
            "ffmpeg", "-y", "-i", mp3_p,
            "-af", "silenceremove=start_periods=1:start_silence=0.03:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_silence=0.03:start_threshold=-40dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11",
            "-ar", str(SR), "-ac", "2", wav_p,
            "-loglevel", "error"
        ], check=True)

        with wave.open(wav_p, "rb") as wf:
            n_frames = wf.getnframes()
            dur = n_frames / SR
            raw = wf.readframes(n_frames)
            unpacked = struct.unpack(f"<{n_frames * 2}h", raw)

        # Calculate word timestamps
        words = text.split()
        word_dur = dur / max(1, len(words))
        words_timed = []
        for idx, w in enumerate(words):
            words_timed.append({
                "word": w,
                "start": round(target_start + idx * word_dur, 2),
                "end": round(target_start + (idx + 1) * word_dur, 2)
            })

        scene_words.append({
            "id": sid,
            "text": text,
            "start": target_start,
            "end": round(target_start + dur, 2),
            "startFrame": int(target_start * 30),
            "endFrame": int((target_start + dur) * 30),
            "words": words_timed
        })

        # Place into master buffer at target_start
        start_idx = int(target_start * SR)
        for i in range(n_frames):
            pos = start_idx + i
            if pos < total_samples:
                voice_left[pos] = unpacked[i * 2] / 32768.0
                voice_right[pos] = unpacked[i * 2 + 1] / 32768.0

    print("Synthesizing cinematic score and sound effects...")
    music_left = [0.0] * total_samples
    music_right = [0.0] * total_samples

    # 1. Atmospheric Mystery Drone in D minor (D2: 73.4Hz, A2: 110Hz, F3: 174.6Hz)
    chords = [
        (0.0, 15.0, 73.41, 110.0),    # D minor low
        (15.0, 34.0, 65.41, 98.0),    # C suspended
        (34.0, 50.0, 58.27, 87.3),    # Bb major mystery
        (50.0, 61.0, 73.41, 110.0),   # D minor resolve
        (61.0, 70.0, 55.0, 82.41)     # Low A to deep D mystery ending
    ]

    for start_t, end_t, f1, f2 in chords:
        s_idx = int(start_t * SR)
        e_idx = min(total_samples, int(end_t * SR))
        dur_chord = (e_idx - s_idx) / SR
        for idx in range(s_idx, e_idx):
            t = (idx - s_idx) / SR
            # Fade in and fade out
            env = math.sin((t / dur_chord) * math.pi)
            sub = (math.sin(2 * math.pi * f1 * t) * 0.16 +
                   math.sin(2 * math.pi * f2 * t) * 0.12 +
                   math.sin(2 * math.pi * (f1 * 2) * t) * 0.06) * env
            music_left[idx] += sub
            music_right[idx] += sub

    # 2. Bronze Chimes on Key Moments (0.5s, 7.0s, 15.0s, 24.0s, 34.0s, 50.0s, 61.0s)
    chime_times = [0.6, 7.2, 15.2, 24.2, 34.2, 50.2, 61.2]
    for ct in chime_times:
        chime = make_chime_sample(587.33, 4.0, decay=1.2) # D5 chime
        c_start = int(ct * SR)
        for i, val in enumerate(chime):
            pos = c_start + i
            if pos < total_samples:
                music_left[pos] += val * 0.22
                music_right[pos] += val * 0.25

    # 3. Bronze workshop hammer & fire sounds in Scene 3 (15s to 24s)
    forge_start = int(15.0 * SR)
    forge_end = int(24.0 * SR)
    for idx in range(forge_start, forge_end):
        t = (idx - forge_start) / SR
        crackle = ((os.urandom(1)[0] / 127.5) - 1.0) * 0.02
        music_left[idx] += crackle
        music_right[idx] += crackle

    hammer_times = [16.2, 17.8, 19.5, 21.1, 22.7]
    for ht in hammer_times:
        clink = make_metal_clink()
        h_start = int(ht * SR)
        for i, val in enumerate(clink):
            pos = h_start + i
            if pos < total_samples:
                music_left[pos] += val * 0.18
                music_right[pos] += val * 0.14

    # 4. Final Mix: Combine Voice (0 dB) + Music & SFX (-6 dB)
    print("Exporting final mix...")
    mixed_raw = bytearray(total_samples * 4)
    for i in range(total_samples):
        # Duck music under voice
        voice_amp = abs(voice_left[i])
        duck = 0.45 if voice_amp > 0.05 else 0.85

        l_val = voice_left[i] + music_left[i] * duck
        r_val = voice_right[i] + music_right[i] * duck

        # Soft limiter
        l_val = max(-0.98, min(0.98, l_val))
        r_val = max(-0.98, min(0.98, r_val))

        l_int = int(l_val * 32767)
        r_int = int(r_val * 32767)

        struct.pack_into("<hh", mixed_raw, i * 4, l_int, r_int)

    final_wav = f"{out_dir}/mix.wav"
    with wave.open(final_wav, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(bytes(mixed_raw))

    final_mp3 = f"{pub_dir}/mix.mp3"
    subprocess.run([
        "ffmpeg", "-y", "-i", final_wav,
        "-codec:a", "libmp3lame", "-b:a", "192k",
        final_mp3, "-loglevel", "error"
    ], check=True)

    # Save words and cues JSON
    with open(f"{out_dir}/words.json", "w") as jf:
        json.dump(scene_words, jf, indent=2)
    with open(f"{pub_dir}/words.json", "w") as jf:
        json.dump(scene_words, jf, indent=2)

    print(f"Audio generation complete! Master audio saved to {final_mp3}")
    print(f"Timeline cues saved to {pub_dir}/words.json")

if __name__ == "__main__":
    asyncio.run(main())
