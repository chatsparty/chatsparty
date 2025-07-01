"""Audio test endpoints for debugging speed issues."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import tempfile
import os
import logging
import numpy as np
from typing import Optional

from ..services.audio_handler import AudioSegment

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audio-test", tags=["audio-test"])


@router.get("/generate-test-tone")
async def generate_test_tone(
    frequency: int = 440,
    duration_ms: int = 2000,
    sample_rate: int = 24000
):
    """Generate a test tone at specified frequency and sample rate."""
    try:
        # Generate a sine wave
        duration_s = duration_ms / 1000.0
        t = np.linspace(0, duration_s, int(sample_rate * duration_s))
        data = 0.5 * np.sin(2 * np.pi * frequency * t)
        
        # Create audio segment
        audio = AudioSegment(data, sample_rate, channels=1)
        
        # Export to temporary file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            temp_path = tmp_file.name
        
        audio.export(temp_path, format="wav")
        
        logger.info(f"Generated test tone: {frequency}Hz, {duration_ms}ms, {sample_rate}Hz")
        logger.info(f"Expected duration: {duration_s}s")
        
        return FileResponse(
            temp_path,
            media_type="audio/wav",
            filename=f"test_tone_{frequency}hz_{sample_rate}hz.wav",
            headers={
                "X-Sample-Rate": str(sample_rate),
                "X-Duration": str(duration_s),
                "X-Frequency": str(frequency)
            }
        )
    except Exception as e:
        logger.error(f"Error generating test tone: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/generate-speech-test")
async def generate_speech_test(sample_rate: int = 24000):
    """Generate a test speech pattern at specified sample rate."""
    try:
        # Generate a simple speech-like pattern
        duration_s = 3.0
        t = np.linspace(0, duration_s, int(sample_rate * duration_s))
        
        # Create a pattern that sounds like "one two three"
        audio_data = np.zeros_like(t)
        
        # "One" - 0.0 to 0.8s
        audio_data[0:int(0.8*sample_rate)] = 0.3 * np.sin(2 * np.pi * 200 * t[0:int(0.8*sample_rate)])
        
        # Pause - 0.8 to 1.0s
        
        # "Two" - 1.0 to 1.8s
        audio_data[int(1.0*sample_rate):int(1.8*sample_rate)] = 0.3 * np.sin(2 * np.pi * 300 * t[0:int(0.8*sample_rate)])
        
        # Pause - 1.8 to 2.0s
        
        # "Three" - 2.0 to 3.0s
        audio_data[int(2.0*sample_rate):] = 0.3 * np.sin(2 * np.pi * 400 * t[0:int(1.0*sample_rate)])
        
        # Create audio segment
        audio = AudioSegment(audio_data, sample_rate, channels=1)
        
        # Export to temporary file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            temp_path = tmp_file.name
        
        audio.export(temp_path, format="wav")
        
        logger.info(f"Generated speech test at {sample_rate}Hz")
        
        return FileResponse(
            temp_path,
            media_type="audio/wav",
            filename=f"speech_test_{sample_rate}hz.wav",
            headers={
                "X-Sample-Rate": str(sample_rate),
                "X-Duration": str(duration_s),
                "X-Description": "Speech pattern: one (200Hz) - pause - two (300Hz) - pause - three (400Hz)"
            }
        )
    except Exception as e:
        logger.error(f"Error generating speech test: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test-sample-rates")
async def test_sample_rates():
    """Generate test files at different sample rates for comparison."""
    try:
        files_info = []
        sample_rates = [8000, 16000, 24000, 44100, 48000]
        
        for sr in sample_rates:
            # Generate 1 second of 440Hz tone
            duration_s = 1.0
            t = np.linspace(0, duration_s, int(sr * duration_s))
            data = 0.5 * np.sin(2 * np.pi * 440 * t)
            
            audio = AudioSegment(data, sr, channels=1)
            
            # Export
            filename = f"test_440hz_{sr}hz.wav"
            filepath = os.path.join("/tmp", filename)
            audio.export(filepath, format="wav")
            
            files_info.append({
                "filename": filename,
                "sample_rate": sr,
                "duration": duration_s,
                "frequency": 440,
                "path": filepath
            })
        
        return {
            "message": "Test files generated",
            "files": files_info,
            "note": "All files should play the same A440 tone for 1 second. If any sound different in pitch or duration, there's a playback issue."
        }
    except Exception as e:
        logger.error(f"Error generating test files: {e}")
        raise HTTPException(status_code=500, detail=str(e))