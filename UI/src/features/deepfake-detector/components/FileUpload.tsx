import React, { useState, useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        onFileSelect(file);
      } else {
        alert('Please upload a video or image file');
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidFile(file)) {
        onFileSelect(file);
      } else {
        alert('Please upload a video or image file');
      }
    }
  };

  const isValidFile = (file: File) => {
    return file.type.startsWith('video/') || file.type.startsWith('image/');
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className='w-full max-w-2xl mx-auto'>
      <div
        className={`
          border-2 border-dashed border-blue-400 rounded-xl p-12 text-center
          cursor-pointer transition-all duration-300 bg-gray-800 bg-opacity-60
          backdrop-blur-sm hover:scale-105 hover:shadow-2xl hover:shadow-blue-400/50
          ${isDragOver ? 'scale-105 shadow-2xl shadow-blue-400/50 bg-gray-700' : ''}
        `}
        onClick={triggerFileUpload}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className='text-4xl mb-4'>📤</div>
        <p className='text-xl text-gray-300 mb-2'>Drop your video here or click to upload</p>
        <p className='text-gray-500'>Supports video and image files</p>
      </div>

      <input ref={fileInputRef} type='file' accept='video/*,image/*' onChange={handleFileInput} className='hidden' />
    </div>
  );
};

export default FileUpload;
