"""
Voice module for AI Scrum Master.
Provides text-to-speech and speech recognition capabilities.
"""
import os
import tempfile
import threading
import speech_recognition as sr
from gtts import gTTS
import pyttsx3
import time
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VoiceAssistant:
    """Voice assistant for AI Scrum Master."""
    
    def __init__(self, use_gtts=False):
        """Initialize voice assistant.
        
        Args:
            use_gtts (bool): If True, use Google TTS (online). If False, use pyttsx3 (offline).
        """
        self.recognizer = sr.Recognizer()
        self.use_gtts = use_gtts
        
        # Configure offline TTS engine
        if not use_gtts:
            self.engine = pyttsx3.init()
            # Set properties
            self.engine.setProperty('rate', 180)  # Speed of speech
            voices = self.engine.getProperty('voices')
            # Try to find a female voice for Alex
            female_voice = None
            for voice in voices:
                if 'female' in voice.name.lower():
                    female_voice = voice.id
                    break
            
            # Set voice to female if found, otherwise use default
            if female_voice:
                self.engine.setProperty('voice', female_voice)
    
    def text_to_speech(self, text, callback=None):
        """Convert text to speech.
        
        Args:
            text (str): Text to convert to speech.
            callback (function): Function to call after speech is complete.
        
        Returns:
            threading.Thread: Thread handling the speech synthesis.
        """
        def speak_text():
            try:
                if self.use_gtts:
                    # Online TTS using Google
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as temp_file:
                        tts = gTTS(text=text, lang='en', slow=False)
                        temp_filename = temp_file.name
                    
                    tts.save(temp_filename)
                    
                    # Play the audio
                    os.system(f'start {temp_filename}')
                    
                    # Wait for audio to complete (approximate)
                    words = len(text.split())
                    wait_time = max(3, words * 0.3)  # Rough estimate
                    time.sleep(wait_time)
                    
                    # Clean up temp file
                    try:
                        os.unlink(temp_filename)
                    except Exception as e:
                        logger.error(f"Error removing temp file: {e}")
                else:
                    # Offline TTS using pyttsx3
                    self.engine.say(text)
                    self.engine.runAndWait()
                
                # Call callback if provided
                if callback:
                    callback()
            except Exception as e:
                logger.error(f"Error in text-to-speech: {e}")
                if callback:
                    callback()
        
        # Run in a separate thread to avoid blocking
        thread = threading.Thread(target=speak_text)
        thread.daemon = True
        thread.start()
        return thread
    
    def speech_to_text(self, timeout=5):
        """Convert speech to text.
        
        Args:
            timeout (int): Maximum time to listen for, in seconds.
        
        Returns:
            str: Recognized text, or empty string if recognition failed.
        """
        with sr.Microphone() as source:
            logger.info("Listening...")
            # Adjust for ambient noise
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            try:
                # Listen for user's input
                audio = self.recognizer.listen(source, timeout=timeout)
                
                # Recognize speech using Google Speech Recognition
                text = self.recognizer.recognize_google(audio)
                logger.info(f"Recognized: {text}")
                return text
            except sr.WaitTimeoutError:
                logger.info("Listening timed out")
                return ""
            except sr.UnknownValueError:
                logger.info("Could not understand audio")
                return ""
            except sr.RequestError as e:
                logger.error(f"Could not request results; {e}")
                return ""
            except Exception as e:
                logger.error(f"Error in speech recognition: {e}")
                return ""

# Simple test function
def test_voice():
    """Test voice functionality."""
    voice = VoiceAssistant(use_gtts=False)
    voice.text_to_speech("Hello! I'm Alex, your Scrum Master. How can I help you today?")
    time.sleep(3)
    print("Please speak now...")
    text = voice.speech_to_text()
    print(f"You said: {text}")
    if text:
        voice.text_to_speech(f"You said: {text}")

if __name__ == "__main__":
    test_voice()
