import logging
from typing import Dict, Any, List, Tuple
from .config import GoogleCloudConfig
from ....domain.entities import VoiceConnection

logger = logging.getLogger(__name__)


class VoiceMapper:
    """Handles voice mapping and parameter transformation for Google Cloud TTS"""
    
    def __init__(self):
        self.config = GoogleCloudConfig()
    
    def map_voice_id(self, voice_id: str) -> Tuple[str, str]:
        """
        Map voice ID to language code and name
        
        Args:
            voice_id: Voice ID in format 'language-Country-Type-Letter'
            
        Returns:
            Tuple of (language_code, voice_name)
        """
        parts = voice_id.split("-")
        if len(parts) >= 3:
            language_code = f"{parts[0]}-{parts[1]}"
            voice_name = voice_id
            return language_code, voice_name
        else:
            return "en-US", voice_id
    
    def map_parameters(self, voice_connection: VoiceConnection) -> Dict[str, Any]:
        """
        Map voice connection parameters to Google Cloud TTS parameters
        
        Args:
            voice_connection: Voice connection configuration
            
        Returns:
            Dictionary of Google Cloud TTS parameters
        """
        params = {}
        
        if voice_connection.speed is not None:
            params["speakingRate"] = self.config.clamp_speaking_rate(voice_connection.speed)
        else:
            params["speakingRate"] = self.config.DEFAULT_SPEAKING_RATE
        
        if voice_connection.pitch is not None:
            params["pitch"] = self.config.clamp_pitch((voice_connection.pitch - 1) * 20)
        
        params["volumeGainDb"] = self.config.DEFAULT_VOLUME_GAIN
        
        params["audioEncoding"] = self.config.DEFAULT_AUDIO_ENCODING
        params["sampleRateHertz"] = self.config.DEFAULT_SAMPLE_RATE
        
        
        return params
    
    def process_voices_response(self, voices_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Process and filter voices from Google Cloud TTS response
        
        Args:
            voices_data: Raw voices response from API
            
        Returns:
            List of processed voice dictionaries
        """
        logger.info(f"Google Cloud TTS returned {len(voices_data.get('voices', []))} voices")
        
        if voices_data.get("voices"):
            logger.debug("DEBUG - First 5 voices raw data:")
            for i, voice in enumerate(voices_data.get("voices", [])[:5]):
                logger.debug(f"DEBUG - Voice {i}: {voice}")
        
        voices = []
        
        for voice in voices_data.get("voices", []):
            language_codes = voice.get("languageCodes", [])
            ssml_gender = voice.get("ssmlGender", "NEUTRAL")
            name = voice.get("name", "")
            
            logger.debug(f"DEBUG - Voice name: {name}, languageCodes: {language_codes}, gender: {ssml_gender}")
            
            voice_type = self._determine_voice_type(name)
            if not voice_type:
                continue
            
            logger.info(f"DEBUG - Found {voice_type} voice: {name}")
            
            display_name = self._create_display_name(name, language_codes, ssml_gender, voice_type)
            
            voices.append({
                "id": name,
                "name": display_name,
                "description": f"Google Cloud {voice_type} voice - High quality speech synthesis",
                "language_codes": language_codes,
                "gender": ssml_gender,
                "voice_type": voice_type,
                "natural_sample_rate_hertz": voice.get("naturalSampleRateHertz", 24000)
            })
        
        voices.sort(key=lambda v: (v.get("language_codes", [""])[0], v.get("voice_type", ""), v.get("gender", "")))
        
        logger.info(f"Filtered to {len(voices)} high-quality voices from {len(voices_data.get('voices', []))} total voices")
        
        if voices:
            voice_types_found = {}
            for v in voices:
                vtype = v.get("voice_type", "Unknown")
                voice_types_found[vtype] = voice_types_found.get(vtype, 0) + 1
            logger.info(f"DEBUG - Voice types found: {voice_types_found}")
            
            logger.info(f"DEBUG - Example voice IDs: {[v['id'] for v in voices[:5]]}")
        else:
            logger.warning("DEBUG - No high-quality voices found! Check if Google changed their naming.")
        
        return voices
    
    def _determine_voice_type(self, name: str) -> str:
        """
        Determine the voice type based on the voice name
        
        Args:
            name: Voice name from Google Cloud TTS
            
        Returns:
            Voice type string or empty string if not supported
        """
        if "Chirp3-HD" in name:
            return "Chirp"
        elif "Chirp" in name or "chirp" in name.lower():
            return "Chirp"
        elif "Journey" in name:
            return "Journey"
        else:
            return ""
    
    def _create_display_name(self, name: str, language_codes: List[str], ssml_gender: str, voice_type: str) -> str:
        """
        Create a user-friendly display name for a voice
        
        Args:
            name: Original voice name
            language_codes: List of supported language codes
            ssml_gender: SSML gender (MALE, FEMALE, NEUTRAL)
            voice_type: Voice type (Chirp, Journey, etc.)
            
        Returns:
            User-friendly display name
        """
        display_name = name
        if language_codes:
            lang_code = language_codes[0]
            gender_label = "Female" if ssml_gender == "FEMALE" else "Male" if ssml_gender == "MALE" else "Neutral"
            voice_variant = name.split("-")[-1] if "-" in name else ""
            display_name = f"{lang_code} - {voice_type} {voice_variant} - {gender_label}"
        
        return display_name