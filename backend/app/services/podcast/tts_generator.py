"""Text-to-speech generation for podcast messages."""
import os
import tempfile
import struct
import logging
from typing import Dict, Any, Optional

try:
    from app.services.audio_handler import AudioSegment
except ImportError:
    from pydub import AudioSegment

from ...core.database import db_manager
from ...models.database import Agent, VoiceConnection
from ..voice_assignment import dynamic_voice_assignment_service
from ...services.voice.voice_service import VoiceService
from ...services.voice.domain.entities import VoiceConnection as VoiceConnectionEntity
from ...core.config import settings

logger = logging.getLogger(__name__)


class TTSGenerator:
    """Handles text-to-speech generation for podcast messages."""
    
    def __init__(self, audio_storage_path: str):
        self.voice_service = VoiceService()
        self.audio_storage_path = audio_storage_path
    
    async def generate_for_message(
        self, 
        msg_data: Dict[str, Any], 
        conversation_id: Optional[str] = None, 
        job_id: Optional[str] = None
    ) -> Optional[AudioSegment]:
        """Generate TTS for a single message."""
        voice_connection = msg_data.get("voice_connection")
        agent = msg_data.get("agent")
        
        logger.debug(f"Processing message {msg_data['id']} - Agent: {msg_data.get('speaker')}, Content length: {len(msg_data.get('content', ''))}")
        
        if not agent:
            logger.warning(f"No agent found for message {msg_data['id']}")
            return None
            
        voice_enabled = getattr(agent, 'voice_enabled', False)
        if not voice_enabled:
            logger.warning(f"Voice not enabled for agent {agent.name} (message {msg_data['id']}). Enable voice in agent settings and assign a voice connection.")
            return None
            
        if not voice_connection:
            logger.warning(f"No voice connection configured for agent {agent.name} (message {msg_data['id']}). Please assign a voice connection to this agent.")
            return None
            
        if not voice_connection.is_active:
            logger.warning(f"Voice connection '{voice_connection.name}' is inactive for agent {agent.name} (message {msg_data['id']})")
            return None
        
        try:
            api_key = await self._get_decrypted_api_key(voice_connection)
            if not api_key:
                return None
            
            voice_id = await self._get_voice_assignment(agent, voice_connection, msg_data, conversation_id)
            
            voice_entity = self._create_voice_entity(voice_connection, voice_id, api_key)
            
            tts_result = await self.voice_service.generate_tts(voice_entity, msg_data["content"])
            
            if not tts_result.success:
                logger.error(f"TTS generation failed for message {msg_data['id']}: {tts_result.error_message}")
                return None
            
            if not tts_result.audio_data:
                logger.error(f"TTS generation returned no audio data for message {msg_data['id']}. Provider: {voice_connection.provider}, Voice ID: {voice_id}")
                return None
            
            logger.debug(f"TTS generated {len(tts_result.audio_data)} bytes of audio data for message {msg_data['id']}")
            
            if job_id:
                await self._save_debug_data(tts_result.audio_data, msg_data['id'], job_id)
            
            audio_segment = await self._convert_to_audio_segment(tts_result, msg_data['id'])
            
            return audio_segment
                    
        except Exception as e:
            logger.error(f"Failed to generate TTS for message {msg_data['id']} (Agent: {msg_data.get('speaker')}): {e}", exc_info=True)
            return None
    
    async def update_available_voices_cache(self, provider: str = "google", voice_connection=None):
        """Update the cache of available voices from the provider."""
        try:
            if not voice_connection:
                voice_connection = VoiceConnectionEntity(
                    id="system-cache-update",
                    user_id="system",
                    provider=provider,
                    api_key=settings.chatsparty_default_voice_api_key,
                    base_url=settings.chatsparty_default_voice_base_url,
                    voice_id="en-US-Neural2-A",
                    name=f"{provider.title()} System Connection",
                    is_active=True,
                    is_cloud_proxy=False,
                    created_at=None,
                    updated_at=None
                )
            
            voice_provider = self.voice_service.providers.get(provider.lower())
            
            if voice_provider:
                voices = await voice_provider.get_available_voices(voice_connection)
                
                if voices:
                    dynamic_voice_assignment_service.set_available_voices(provider, voices)
                    logger.info(f"Updated voice cache for {provider} with {len(voices)} voices")
                else:
                    logger.warning(f"No voices found for provider {provider}")
            else:
                logger.warning(f"Voice provider {provider} not found")
        except Exception as e:
            logger.error(f"Failed to update voice cache for {provider}: {e}")
    
    async def _get_decrypted_api_key(self, voice_connection) -> Optional[str]:
        """Get decrypted API key from voice connection."""
        api_key = voice_connection.api_key
        if voice_connection.api_key_encrypted and api_key:
            from ..crypto_service import crypto_service
            try:
                api_key = crypto_service.decrypt(api_key)
            except Exception as e:
                logger.error(f"Failed to decrypt API key for voice connection {voice_connection.id}: {e}")
                return None
        return api_key
    
    async def _get_voice_assignment(self, agent, voice_connection, msg_data: Dict[str, Any], conversation_id: Optional[str]) -> str:
        """Get voice assignment for agent."""
        agent_gender = getattr(agent, 'gender', 'neutral')
        
        message_language = msg_data.get('language', 'en')
        
        provider = voice_connection.provider
        
        if provider not in dynamic_voice_assignment_service.available_voices_cache:
            await self.update_available_voices_cache(provider, voice_connection)
        
        selected_voice_id = dynamic_voice_assignment_service.assign_voice_to_agent(
            agent_id=str(agent.id),
            agent_name=agent.name,
            agent_gender=agent_gender,
            provider=provider,
            conversation_id=conversation_id,
            language_preference=message_language
        )
        logger.info(f"Assigned voice {selected_voice_id} to agent {agent.name} for conversation {conversation_id} (language: {message_language})")
        
        return selected_voice_id
    
    def _create_voice_entity(self, voice_connection, voice_id: str, api_key: str) -> VoiceConnectionEntity:
        """Create voice connection entity from database model."""
        return VoiceConnectionEntity(
            id=voice_connection.id,
            name=voice_connection.name,
            description=voice_connection.description,
            provider=voice_connection.provider,
            provider_type=voice_connection.provider_type,
            voice_id=voice_id,
            speed=voice_connection.speed,
            pitch=voice_connection.pitch,
            stability=voice_connection.stability,
            clarity=voice_connection.clarity,
            style=voice_connection.style,
            api_key=api_key,
            api_key_encrypted=voice_connection.api_key_encrypted,
            base_url=voice_connection.base_url,
            is_active=voice_connection.is_active,
            is_cloud_proxy=voice_connection.is_cloud_proxy,
            user_id=voice_connection.user_id,
            created_at=voice_connection.created_at,
            updated_at=voice_connection.updated_at
        )
    
    async def _save_debug_data(self, audio_data: bytes, message_id: str, job_id: str):
        """Save raw TTS data for debugging."""
        debug_dir = os.path.join(self.audio_storage_path, f"debug_{job_id}")
        if os.path.exists(debug_dir):
            audio_format = "wav"
            if audio_data[:3] == b'ID3' or audio_data[:2] == b'\xff\xfb':
                audio_format = "mp3"
            elif audio_data[:4] == b'OggS':
                audio_format = "ogg"
            
            raw_path = os.path.join(debug_dir, f"raw_tts_msg{message_id}.{audio_format}")
            with open(raw_path, 'wb') as f:
                f.write(audio_data)
            logger.info(f"Saved raw TTS data to {raw_path}")
    
    async def _convert_to_audio_segment(self, tts_result, message_id: str) -> Optional[AudioSegment]:
        """Convert TTS result to AudioSegment."""
        audio_format = tts_result.metadata.get("format", "wav") if tts_result.metadata else "wav"
        suffix = f".{audio_format}"
        
        self._log_audio_data_info(tts_result.audio_data, audio_format)
        
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False, mode='wb') as temp_file:
            bytes_written = temp_file.write(tts_result.audio_data)
            temp_path = temp_file.name
            logger.debug(f"Wrote {bytes_written} bytes to temp file {temp_path}")
        
        try:
            file_size = os.path.getsize(temp_path)
            if file_size == 0:
                logger.error(f"Temp audio file is empty for message {message_id}")
                return None
            
            audio_segment = await self._load_audio_segment(tts_result.audio_data, temp_path, audio_format, message_id)
            
            return audio_segment
                    
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def _log_audio_data_info(self, audio_data: bytes, audio_format: str):
        """Log audio data information for debugging."""
        logger.debug(f"Audio data size: {len(audio_data)} bytes, format: {audio_format}")
        if len(audio_data) > 16:
            header = audio_data[:16]
            logger.debug(f"Audio data header (hex): {header.hex()}")
            if audio_data[:3] == b'ID3' or audio_data[:2] == b'\xff\xfb':
                logger.debug("Audio data appears to be MP3 format")
            elif audio_data[:4] == b'RIFF':
                logger.debug("Audio data appears to be WAV format")
                try:
                    if len(audio_data) > 28:
                        sample_rate = struct.unpack('<I', audio_data[24:28])[0]
                        logger.info(f"WAV file sample rate from header: {sample_rate} Hz")
                        
                        num_channels = struct.unpack('<H', audio_data[22:24])[0]
                        bits_per_sample = struct.unpack('<H', audio_data[34:36])[0]
                        logger.info(f"WAV header: channels={num_channels}, bits_per_sample={bits_per_sample}")
                except Exception as e:
                    logger.warning(f"Could not extract sample rate from WAV header: {e}")
            elif audio_data[:4] == b'OggS':
                logger.debug("Audio data appears to be OGG format")
    
    async def _load_audio_segment(self, audio_data: bytes, temp_path: str, audio_format: str, message_id: str) -> Optional[AudioSegment]:
        """Load audio data into AudioSegment."""
        logger.debug(f"Loading audio file {temp_path} ({len(audio_data)} bytes) with format {audio_format}")
        
        if hasattr(AudioSegment, 'from_bytes') and audio_format == 'wav':
            try:
                detected_sample_rate = None
                if len(audio_data) > 28 and audio_data[:4] == b'RIFF':
                    try:
                        detected_sample_rate = struct.unpack('<I', audio_data[24:28])[0]
                        logger.info(f"Detected sample rate from WAV header: {detected_sample_rate}Hz")
                    except:
                        pass
                
                if detected_sample_rate and hasattr(AudioSegment, 'from_bytes'):
                    audio_segment = AudioSegment.from_bytes(audio_data, format=audio_format, sample_rate=detected_sample_rate)
                else:
                    audio_segment = AudioSegment.from_bytes(audio_data, format=audio_format)
                
                logger.info(f"Successfully loaded audio from bytes: duration={len(audio_segment)/1000:.1f}s, sample_rate={getattr(audio_segment, 'sample_rate', 'unknown')}Hz, frame_rate={getattr(audio_segment, 'frame_rate', 'unknown')}Hz")
                return audio_segment
            except Exception as e:
                logger.warning(f"Failed to load from bytes, falling back to file: {e}")
        
        try:
            audio_segment = AudioSegment.from_file(temp_path, format=audio_format)
            logger.debug(f"Successfully loaded audio segment with format={audio_format}: duration={len(audio_segment)/1000:.1f}s")
            return audio_segment
        except Exception as format_error:
            logger.warning(f"Failed to load audio with format={audio_format}: {format_error}")
            
            try:
                audio_segment = AudioSegment.from_file(temp_path)
                logger.debug(f"Successfully loaded audio segment with auto-detection: duration={len(audio_segment)/1000:.1f}s")
                return audio_segment
            except Exception as auto_error:
                logger.error(f"Failed to load audio with auto-detection: {auto_error}")
                
                for fallback_format in ["mp3", "wav", "ogg"]:
                    if fallback_format != audio_format:
                        try:
                            audio_segment = AudioSegment.from_file(temp_path, format=fallback_format)
                            logger.warning(f"Successfully loaded audio with fallback format={fallback_format}: duration={len(audio_segment)/1000:.1f}s")
                            return audio_segment
                        except Exception:
                            continue
                
                logger.error(f"All attempts to load audio failed for message {message_id}. File size: {os.path.getsize(temp_path)} bytes, Expected format: {audio_format}")
                
                try:
                    with open(temp_path, 'rb') as f:
                        header = f.read(16)
                        logger.error(f"Audio file header (hex): {header.hex()}")
                        logger.error(f"Audio file header (ascii): {repr(header)}")
                except:
                    pass
                
                raise auto_error