import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Settings, FileImage, Trash2, Play, Pause } from 'lucide-react';

interface FileData {
  id: string;
  file: File;
  size: number;
  preview: string;
}

interface ConversionResult {
  original: File;
  converted: File;
  originalSize: number;
  convertedSize: number;
  compressionRatio: string;
}

interface Stats {
  totalFiles: number;
  totalOriginalSize: number;
  totalConvertedSize: number;
  totalSavings: number;
  compressionRatio: string;
}

const WebPConverter = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [converting, setConverting] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<ConversionResult[]>([]);
  const [quality, setQuality] = useState(95);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일을 WebP로 변환하는 함수
  const convertToWebP = useCallback((file: File, quality: number) => {
    return new Promise<{
      original: File;
      converted: File;
      originalSize: number;
      convertedSize: number;
      compressionRatio: string;
    }>((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (!blob) return;
          
          const convertedFile = new File([blob], 
            file.name.replace(/\.[^/.]+$/, '.webp'), 
            { type: 'image/webp' }
          );
          
          resolve({
            original: file,
            converted: convertedFile,
            originalSize: file.size,
            convertedSize: blob.size,
            compressionRatio: ((file.size - blob.size) / file.size * 100).toFixed(1)
          });
        }, 'image/webp', quality / 100);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // 파일 선택 처리
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    
    const imageFiles = Array.from(selectedFiles).filter((file: File) => 
      file.type.startsWith('image/') && !file.name.toLowerCase().endsWith('.webp')
    );
    
    const fileData = imageFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      size: file.size,
      preview: URL.createObjectURL(file)
    }));
    
    setFiles(prev => [...prev, ...fileData]);
  }, []);

  // 드래그앤드롭 처리
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    handleFileSelect(droppedFiles);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // 파일 삭제
  const removeFile = useCallback((fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // 모든 파일 변환
  const convertAllFiles = useCallback(async () => {
    if (files.length === 0) return;
    
    setConverting(true);
    setProgress(0);
    setConvertedFiles([]);
    
    const results = [];
    let totalOriginalSize = 0;
    let totalConvertedSize = 0;
    
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await convertToWebP(files[i].file, quality);
        results.push(result);
        totalOriginalSize += result.originalSize;
        totalConvertedSize += result.convertedSize;
        
        setProgress(((i + 1) / files.length) * 100);
        setConvertedFiles(prev => [...prev, result]);
      } catch (error) {
        console.error('변환 실패:', error);
      }
    }
    
    setStats({
      totalFiles: files.length,
      totalOriginalSize,
      totalConvertedSize,
      totalSavings: totalOriginalSize - totalConvertedSize,
      compressionRatio: ((totalOriginalSize - totalConvertedSize) / totalOriginalSize * 100).toFixed(1)
    });
    
    setConverting(false);
  }, [files, quality, convertToWebP]);

  // 모든 변환된 파일 다운로드
  const downloadAllFiles = useCallback(async () => {
    if (convertedFiles.length === 0) return;
    
    // JSZip 라이브러리가 없으므로 개별 다운로드
    convertedFiles.forEach((result, index) => {
      setTimeout(() => {
        const url = URL.createObjectURL(result.converted);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.converted.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, index * 100); // 100ms 간격으로 다운로드
    });
  }, [convertedFiles]);

  // 파일 크기 포맷팅
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🖼️ MFC WebP 변환기
          </h1>
          <p className="text-gray-600">
            이미지를 고품질 WebP 형식으로 변환하여 용량을 줄여보세요
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* 설정 패널 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <Settings className="w-5 h-5 mr-2 text-gray-600" />
                <h2 className="text-lg font-semibold">변환 설정</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    품질 설정: {quality}%
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>낮은 품질</span>
                    <span>높은 품질</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="font-medium text-sm text-gray-700 mb-2">품질 가이드</h3>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>• 95%: 최고 품질 (권장)</div>
                    <div>• 85%: 고품질</div>
                    <div>• 75%: 일반 품질</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 통계 */}
            {stats && (
              <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">변환 결과</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 파일:</span>
                    <span className="font-medium">{stats.totalFiles}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">원본 크기:</span>
                    <span className="font-medium">{formatFileSize(stats.totalOriginalSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">변환 크기:</span>
                    <span className="font-medium">{formatFileSize(stats.totalConvertedSize)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span className="font-medium">절약된 용량:</span>
                    <span className="font-bold">{formatFileSize(stats.totalSavings)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span className="font-medium">압축률:</span>
                    <span className="font-bold">{stats.compressionRatio}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 메인 패널 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 파일 업로드 영역 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  이미지 파일을 여기에 끌어다 놓으세요
                </p>
                <p className="text-gray-500 mb-4">
                  또는 클릭하여 파일을 선택하세요
                </p>
                <p className="text-sm text-gray-400">
                  지원 형식: JPG, PNG, BMP, TIFF
                </p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>

            {/* 파일 목록 */}
            {files.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    선택된 파일 ({files.length}개)
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={convertAllFiles}
                      disabled={converting}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {converting ? (
                        <>
                          <Pause className="w-4 h-4" />
                          변환 중...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          변환 시작
                        </>
                      )}
                    </button>
                    {convertedFiles.length > 0 && (
                      <button
                        onClick={downloadAllFiles}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        모두 다운로드
                      </button>
                    )}
                  </div>
                </div>

                {/* 진행률 */}
                {converting && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>변환 진행률</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* 파일 리스트 */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {files.map((fileData) => {
                    const converted = convertedFiles.find(c => c.original === fileData.file);
                    
                    return (
                      <div key={fileData.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileImage className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="font-medium text-sm">{fileData.file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(fileData.size)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {converted && (
                            <div className="text-right">
                              <p className="text-xs text-green-600 font-medium">
                                {converted.compressionRatio}% 절약
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(converted.convertedSize)}
                              </p>
                            </div>
                          )}
                          
                          <button
                            onClick={() => removeFile(fileData.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebPConverter;
