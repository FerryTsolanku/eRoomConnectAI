import { MapPin, Bath, Bed, Heart, Info } from 'lucide-react';
import { Property } from '../types';
import { motion } from 'motion/react';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
}

export default function PropertyCard({ property, onSelect }: PropertyCardProps) {
  const formattedPrice = new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(property.price);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer border border-neutral-100"
      onClick={() => onSelect(property)}
      id={`property-card-${property.id}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={property.images[0] || `https://picsum.photos/seed/${property.id}/800/600`} 
          alt={property.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 p-1 px-3 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-sky-600">
          {property.type}
        </div>
        <button 
          className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-full hover:bg-white text-neutral-400 hover:text-red-500 transition-all shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Toggle favorite
          }}
          id={`fav-btn-${property.id}`}
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <h3 className="font-display text-xl font-bold text-neutral-900 group-hover:text-sky-600 transition-colors leading-tight mb-1">
            {property.title}
          </h3>
          <p className="flex items-center gap-1 text-sm text-neutral-400">
            <MapPin className="w-3.5 h-3.5" />
            {property.address}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <div>
            <p className="text-2xl font-bold text-sky-900 leading-none">
              {formattedPrice}
              {property.type === 'rental' && <span className="text-sm font-normal text-neutral-400">/mo</span>}
            </p>
          </div>
          <div className="flex gap-3 text-neutral-500 font-medium text-sm">
            <div className="flex items-center gap-1">
              <Bed className="w-4 h-4 text-sky-400" /> 3
            </div>
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4 text-sky-400" /> 2
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
