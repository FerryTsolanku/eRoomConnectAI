import React, { useState, useRef } from 'react';
import { X, Upload, Home, MapPin, Coins, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Property } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (property: Partial<Property>) => Promise<void>;
}

export default function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    type: 'rental' as 'rental' | 'sale',
    address: '',
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    // Check file size (e.g. limit to 2MB to keep Base64 document payloads friendly in Firestore)
    if (file.size > 2 * 1024 * 1024) {
      alert("Please upload an image smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setImagePreview(e.target.result);
        setImageBase64(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUpload({
        ...formData,
        price: Number(formData.price),
        images: [imageBase64 || `https://picsum.photos/seed/${Math.random()}/1000/800`],
        location: { lat: 0, lng: 0 }, // Placeholder
      });
      // Reset state
      setFormData({
        title: '',
        description: '',
        price: '',
        type: 'rental',
        address: '',
      });
      setImagePreview('');
      setImageBase64('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-xl bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-display text-2xl font-bold text-neutral-900">Upload Room</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-neutral-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-500 px-1">Room Title</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. Modern Minimalist Penthouse" 
                  className="w-full input-field py-3 text-lg"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  id="upload-title"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-500 px-1">Monthly Rental Price (R)</label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input 
                      required
                      type="number" 
                      placeholder="0.00" 
                      className="w-full input-field pl-9 py-3"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      id="upload-price"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-500 px-1">Location Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input 
                    required
                    type="text" 
                    placeholder="123 Sky St, Cloud City" 
                    className="w-full input-field pl-9 py-3"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    id="upload-address"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-500 px-1">Description</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Tell us about the room..." 
                  className="w-full input-field py-3 resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  id="upload-description"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-sm font-semibold text-neutral-500">Room Image</label>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-sky-500">Required</span>
                </div>
                
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  accept="image/*"
                  className="hidden"
                  id="upload-image-file"
                />

                {imagePreview ? (
                  <div className="relative group rounded-3xl overflow-hidden border border-neutral-200 shadow-sm aspect-video bg-neutral-100">
                    <img 
                      src={imagePreview} 
                      alt="Room Preview" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview('');
                          setImageBase64('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-3 bg-red-500 hover:bg-red-600 rounded-full text-white shadow-lg font-bold transition-all transform scale-90 group-hover:scale-100"
                        id="remove-image-btn"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[160px]
                      ${isDragging 
                        ? 'border-sky-500 bg-sky-50/50 scale-[0.99]' 
                        : 'border-neutral-200 hover:border-sky-300 hover:bg-sky-50/10'}`}
                    id="dropzone"
                  >
                    <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 shadow-inner overflow-hidden">
                      <Upload className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-700">Drag and drop your image here</p>
                      <p className="text-xs text-neutral-400 mt-1">or click to browse from files (Max 2MB)</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-4 text-lg mt-4 shadow-lg shadow-sky-500/25 active:shadow-none"
                id="submit-upload"
              >
                {loading ? 'Publishing...' : 'Publish Listing'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
