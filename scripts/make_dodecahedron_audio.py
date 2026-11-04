import asyncio
import os
import subprocess
import wave
import math
import struct
import json
import edge_tts

SR = 48000
TOTAL_DURATION = 70.0  # 70 seconds = 2100 frames at 30 fps

SCENES = [
    (
        "scene1_hook",
        "Almost 1,700 years ago, the Romans created something extraordinary. But nobody knows what it was for.",
        0.5
    ),
    (
        "scene2_rome",
        "Across the Roman Empire, craftsmen were making strange objects unlike anything else.",
        7.5
    ),
    (
        "scene3_craftsman",
        "Each one had twelve sides, holes of different sizes, and tiny knobs at every corner.",
        15.5
    ),
    (
        "scene4_spread",
        "More than a hundred have been discovered across former Roman territories. Yet no Roman document explains their purpose.",
        24.5
    ),
    (
        "scene5_theories",
        "Was it a candle holder? A measuring instrument? A ritual object? Or perhaps something used to make gloves? Nobody knows for certain.",
        34.5
    ),
    (
        "scene6_modern",
        "In 2023, archaeologists discovered another remarkably preserved example in Norton Disney, England.",
        50.5
    ),
    (
        "scene7_ending",
        "After nearly seventeen centuries, the Roman dodecahedron remains one of archaeology's strangest unanswered mysteries. What do you think it was actually used for?",
        61.2
    )
]

def make_chime(freq, dur_s, decay=2.5):
    n = int(dur_s * SR)
    samples = [0.0] * n
    for i in range(n):
        t = i / SR
        # Harmonic bell series (crystal clear bronze tone)
        env = math.exp(-decay * t)
        val = (math.sin(2 * math.pi * freq * t) * 0.6 +
               math.sin(2 * math.pi * (freq * 2.76) * t) * 0.22 +
               math.sin(2 * math.pi * (freq * 5.40) * t) * 0.10) * env
        samples[i] = val
    return samples

def make_anvil_clink():
    n = int(0.35 * SR)
    samples = [0.0] * n
    for i in range(n):
        t = i / SR
        env = math.exp(-18.0 * t)
        val = math.sin(2 * math.pi * 2100 * t) * env
        samples[i] = val
    return samples

async def main():
    out_dir = "out/dodecahedron"
    pub_dir = "public/dodecahedron"
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(pub_dir, exist_ok=True)

    print("Generating pristine voice narration for 7 scenes...")
    total_samples = int(TOTAL_DURATION * SR)
    voice_pcm = bytearray(total_samples * 4)  # 16-bit stereo PCM
    timeline = []

    for sid, text, start_t in SCENES:
        mp3_p = f"{out_dir}/{sid}.mp3"
        wav_p = f"{out_dir}/{sid}.wav"

        # High-quality Edge TTS: clean, authoritative, steady documentary tone
        comm = edge_tts.Communicate(text, "en-US-AndrewNeural", rate="-2%")
        await comm.save(mp3_p)

        # High-pass filter at 85 Hz to remove any sub-bass rumble, gentle compression for warmth
        subprocess.run([
            "ffmpeg", "-y", "-i", mp3_p,
            "-af", "highpass=f=85,silenceremove=start_periods=1:start_silence=0.03:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_silence=0.03:start_threshold=-45dB,areverse",
            "-ar", str(SR), "-ac", "2", wav_p,
            "-loglevel", "error"
        ], check=True)

        with wave.open(wav_p, "rb") as wf:
            n_frames = wf.getnframes()
            dur = n_frames / SR
            raw = wf.readframes(n_frames)

        words = text.split()
        w_dur = dur / max(1, len(words))
        words_timed = [
            {"word": w, "start": round(start_t + i * w_dur, 2), "end": round(start_t + (i + 1) * w_dur, 2)}
            for i, w in enumerate(words)
        ]

        timeline.append({
            "id": sid,
            "text": text,
            "start": start_t,
            "end": round(start_t + dur, 2),
            "startFrame": int(start_t * 30),
            "endFrame": int((start_t + dur) * 30),
            "words": words_timed
        })

        # Copy clean voice samples directly into master voice buffer
        start_idx = int(start_t * SR)
        for i in range(n_frames):
            pos = start_idx + i
            if pos < total_samples:
                # 4 bytes per frame (2 channels * 2 bytes)
                voice_pcm[pos * 4 : pos * 4 + 4] = raw[i * 4 : i * 4 + 4]

    # Save words JSON
    with open(f"{pub_dir}/words.json", "w") as jf:
        json.dump(timeline, jf, indent=2)

    print("Generating clean acoustic music cues & atmospheric SFX...")
    sfx_samples = [0.0] * total_samples

    # Subtle resonant bronze chime accents at scene openings
    cue_times = [
        (0.6, 587.33),   # Scene 1: D5 mysterious bronze bell
        (7.6, 440.00),   # Scene 2: A4 Roman arrival
        (15.6, 392.00),  # Scene 3: G4 forge entry
        (24.6, 523.25),  # Scene 4: C5 map reveal
        (34.6, 659.25),  # Scene 5: E5 theories
        (50.6, 440.00),  # Scene 6: A4 discovery
        (61.4, 587.33)   # Scene 7: D5 closing bell
    ]

    for ct, freq in cue_times:
        chime = make_chime(freq, 4.2, decay=1.5)
        s_idx = int(ct * SR)
        for i, val in enumerate(chime):
            if s_idx + i < total_samples:
                sfx_samples[s_idx + i] += val * 0.18

    # Subtle workshop metal strikes in Scene 3 (16s to 23s)
    workshop_clinks = [16.5, 18.2, 20.0, 21.8]
    for wt in workshop_clinks:
        clink = make_anvil_clink()
        w_idx = int(wt * SR)
        for i, val in enumerate(clink):
            if w_idx + i < total_samples:
                sfx_samples[w_idx + i] += val * 0.12

    # Smooth, warm cinematic string pad (D minor: D3=146.8, F3=174.6, A3=220.0)
    # Filtered and envelope-smoothed with zero buzzing or square-wave switching
    pad_chords = [
        (0.0, 15.0, 146.83, 220.00),  # D3 + A3
        (15.0, 34.0, 130.81, 196.00), # C3 + G3
        (34.0, 50.0, 116.54, 174.61), # Bb2 + F3
        (50.0, 61.0, 146.83, 220.00), # D3 + A3
        (61.0, 70.0, 146.83, 220.00)  # D3 + A3
    ]

    for start_t, end_t, f1, f2 in pad_chords:
        s_i = int(start_t * SR)
        e_i = min(total_samples, int(end_t * SR))
        dur = (e_i - s_i) / SR
        for i in range(s_i, e_i):
            t = (i - s_i) / SR
            # Soft sine envelope (smooth ramp in and out)
            env = math.sin((t / dur) * math.pi) * 0.05
            # Warm analog harmonic pad (pure octaves, no buzz)
            pad_val = (math.sin(2 * math.pi * f1 * t) * 0.6 +
                       math.sin(2 * math.pi * f2 * t) * 0.4) * env
            sfx_samples[i] += pad_val

    # Pure Linear Mix (No clipping, no square-wave modulation buzz!)
    print("Mixing clean voice and sfx into master track...")
    mixed_pcm = bytearray(total_samples * 4)
    for i in range(total_samples):
        vL, vR = struct.unpack_from("<hh", voice_pcm, i * 4)
        s_val = int(sfx_samples[i] * 32767)

        # Clean linear sum with headroom protection
        outL = max(-32700, min(32700, vL + s_val))
        outR = max(-32700, min(32700, vR + s_val))

        struct.pack_into("<hh", mixed_pcm, i * 4, outL, outR)

    final_wav = f"{out_dir}/mix.wav"
    with wave.open(final_wav, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(mixed_pcm)

    final_mp3 = f"{pub_dir}/mix.mp3"
    subprocess.run([
        "ffmpeg", "-y", "-i", final_wav,
        "-codec:a", "libmp3lame", "-b:a", "192k",
        final_mp3, "-loglevel", "error"
    ], check=True)

    print(f"Pristine audio generated successfully: {final_mp3}")

if __name__ == "__main__":
    asyncio.run(main())
