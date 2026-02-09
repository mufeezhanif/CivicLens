import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const ShareLocation = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState(null);

  const phone = searchParams.get('phone');
  const sessionId = searchParams.get('session');

  const requestLocation = useCallback(() => {
    setStatus('loading');
    setMessage('Requesting your location...');

    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('Geolocation is not supported by your browser. Please update your browser or share location manually in WhatsApp.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        setLocation({ latitude, longitude, accuracy });
        setMessage('Location detected! Sending to CivicLens...');

        try {
          // Send location to backend
          const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/whatsapp/location-callback`, {
            phone,
            sessionId,
            latitude,
            longitude,
            accuracy,
            source: 'web_link',
          });

          if (response.data.success) {
            setStatus('success');
            setMessage('✅ Location shared successfully! You can close this page and return to WhatsApp.');
            
            // Auto-close after 3 seconds
            setTimeout(() => {
              window.close();
            }, 3000);
          } else {
            setStatus('error');
            setMessage('Failed to submit location. Please try again in WhatsApp.');
          }
        } catch (error) {
          console.error('Location submission error:', error);
          setStatus('error');
          setMessage('Failed to submit location. Please try sharing your location directly in WhatsApp.');
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setStatus('error');
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setMessage('Location permission denied. Please enable location access in your browser settings and try again.');
            break;
          case error.POSITION_UNAVAILABLE:
            setMessage('Location information unavailable. Please try sharing your location directly in WhatsApp.');
            break;
          case error.TIMEOUT:
            setMessage('Location request timed out. Please try again or share location in WhatsApp.');
            break;
          default:
            setMessage('Failed to get location. Please share your location directly in WhatsApp.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [phone, sessionId]);

  useEffect(() => {
    // Auto-request location on page load
    if (phone && sessionId) {
      requestLocation();
    } else {
      setStatus('error');
      setMessage('Invalid link. Please use the link sent to your WhatsApp.');
    }
  }, [phone, sessionId, requestLocation]);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
            {status === 'loading' && (
              <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-10 h-10 text-green-600" />
            )}
            {status === 'error' && (
              <AlertCircle className="w-10 h-10 text-red-600" />
            )}
            {status === 'idle' && (
              <MapPin className="w-10 h-10 text-indigo-600" />
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Share Your Location
          </h1>
          <p className="text-gray-600 mb-6">
            CivicLens Complaint System
          </p>

          {/* Status Message */}
          <div className={`p-4 rounded-lg mb-6 ${
            status === 'success' ? 'bg-green-50 text-green-800' :
            status === 'error' ? 'bg-red-50 text-red-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            <p className="text-sm font-medium">{message}</p>
          </div>

          {/* Location Info */}
          {location && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-gray-500 mb-2">Location Details:</p>
              <div className="text-left text-sm space-y-1">
                <p><span className="font-semibold">Latitude:</span> {location.latitude.toFixed(6)}</p>
                <p><span className="font-semibold">Longitude:</span> {location.longitude.toFixed(6)}</p>
                <p><span className="font-semibold">Accuracy:</span> ±{location.accuracy.toFixed(0)}m</p>
              </div>
            </div>
          )}

          {/* Retry Button */}
          {status === 'error' && (
            <button
              onClick={requestLocation}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          )}

          {/* Instructions */}
          {status === 'error' && (
            <div className="mt-6 text-left bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-900 mb-2">Alternative Method:</p>
              <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                <li>Open WhatsApp</li>
                <li>Tap the attachment (+) icon</li>
                <li>Select "Location"</li>
                <li>Choose "Send Your Current Location"</li>
              </ol>
            </div>
          )}

          {/* Footer */}
          <p className="mt-6 text-xs text-gray-500">
            Your location will only be used to process your civic complaint.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareLocation;
