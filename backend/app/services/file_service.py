import os
import tempfile
import uuid
from pathlib import Path
import aiofiles
from fastapi import UploadFile, HTTPException
import PyPDF2
import docx
from io import BytesIO
from typing import Optional, Dict, Any

from .ai_service import AIServiceFacade
from .storage.storage_factory import get_storage_provider


class FileService:
    def __init__(self, upload_dir: str = None):
        self.upload_dir = upload_dir or os.path.join(tempfile.gettempdir(), "wisty_uploads")
        self.allowed_extensions = {'.pdf', '.txt', '.doc', '.docx'}
        self.max_file_size = 10 * 1024 * 1024
        self.storage_provider = get_storage_provider()
        
        os.makedirs(self.upload_dir, exist_ok=True)
    
    def _validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file"""
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file selected")
        
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in self.allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"File type {file_extension} not supported. Allowed types: {', '.join(self.allowed_extensions)}"
            )
        
        if file.size and file.size > self.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File size {file.size} exceeds maximum allowed size of {self.max_file_size} bytes"
            )
    
    async def save_file(self, file: UploadFile) -> str:
        """Save uploaded file temporarily and return file path"""
        self._validate_file(file)
        
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix.lower()
        saved_filename = f"{file_id}{file_extension}"
        file_path = os.path.join(self.upload_dir, saved_filename)
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        return file_path
    
    async def save_file_to_storage(self, file: UploadFile, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
        """Save uploaded file to configured storage provider and return file info"""
        self._validate_file(file)
        
        try:
            file_content = await file.read()
            file_stream = BytesIO(file_content)
            
            stored_path = await self.storage_provider.upload_file(
                file_content=file_stream,
                filename=file.filename,
                content_type=file.content_type,
                metadata=metadata
            )
            
            file_url = await self.storage_provider.get_file_url(stored_path)
            
            return {
                "stored_path": stored_path,
                "file_url": file_url,
                "filename": file.filename,
                "content_type": file.content_type or "application/octet-stream",
                "size": len(file_content),
                "provider": self.storage_provider.get_provider_name()
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file to storage: {str(e)}")
    
    async def delete_file_from_storage(self, stored_path: str) -> bool:
        """Delete file from storage provider"""
        try:
            return await self.storage_provider.delete_file(stored_path)
        except Exception as e:
            print(f"Warning: Failed to delete file from storage: {str(e)}")
            return False
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text content from PDF file"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error extracting text from PDF: {str(e)}")
    
    def extract_text_from_docx(self, file_path: str) -> str:
        """Extract text content from DOCX file"""
        try:
            doc = docx.Document(file_path)
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            return text.strip()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error extracting text from DOCX: {str(e)}")
    
    def extract_text_from_txt(self, file_path: str) -> str:
        """Extract text content from TXT file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read().strip()
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as file:
                    return file.read().strip()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error reading text file: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error extracting text from TXT: {str(e)}")
    
    def extract_text_from_file(self, file_path: str) -> str:
        """Extract text content based on file extension"""
        file_extension = Path(file_path).suffix.lower()
        
        if file_extension == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_extension == '.docx':
            return self.extract_text_from_docx(file_path)
        elif file_extension == '.txt':
            return self.extract_text_from_txt(file_path)
        elif file_extension == '.doc':
            try:
                return self.extract_text_from_docx(file_path)
            except:
                raise HTTPException(status_code=400, detail="DOC files are not fully supported. Please convert to DOCX format.")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_extension}")
    
    async def extract_content_with_ai(self, file_path: str, user_id: str, ai_service: AIServiceFacade) -> str:
        """Extract and enhance content using AI models"""
        try:
            raw_text = self.extract_text_from_file(file_path)
            
            if not raw_text.strip():
                raise HTTPException(status_code=400, detail="No text content found in the file")
            
            enhancement_prompt = f"""
            Please analyze and enhance the following extracted text from a document. 
            Clean up any extraction artifacts, improve formatting, and provide a clear, structured summary.
            Also identify key topics and main points that would be useful for a conversation context.
            
            Original text:
            {raw_text[:4000]}  # Limit to avoid token limits
            
            Please provide:
            1. A cleaned and structured version of the text
            2. A brief summary of key points
            3. Main topics covered
            """
            
            enhanced_content = await ai_service.simple_chat(enhancement_prompt, user_id)
            
            final_content = f"=== DOCUMENT CONTENT ===\n{raw_text}\n\n=== AI ENHANCED SUMMARY ===\n{enhanced_content}"
            
            return final_content
            
        except HTTPException:
            raise
        except Exception as e:
            try:
                return self.extract_text_from_file(file_path)
            except:
                raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
    
    def cleanup_file(self, file_path: str) -> None:
        """Remove temporary file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Warning: Could not remove temporary file {file_path}: {str(e)}")


file_service = FileService()


def get_file_service() -> FileService:
    """Dependency injection for file service"""
    return file_service