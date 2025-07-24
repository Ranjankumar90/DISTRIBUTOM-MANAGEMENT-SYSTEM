import React from 'react';
import { MapPin, Phone, Mail, Globe, CreditCard, Building } from 'lucide-react';
import { businessProfile } from '../../data/businessProfile';
import BusinessLogo from './BusinessLogo';

const BusinessCard: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-6">
        <BusinessLogo size="lg" />
        <div className="text-right">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {businessProfile.businessType}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-gray-900">{businessProfile.address.street}</p>
                <p className="text-gray-600">{businessProfile.address.city}, {businessProfile.address.district}</p>
                <p className="text-gray-600">{businessProfile.address.state} - {businessProfile.address.pincode}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-900">{businessProfile.contactNumber}</span>
            </div>

            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-900">{businessProfile.email}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <div className="text-sm">
                <p className="text-gray-600">GST: {businessProfile.gstNumber}</p>
                <p className="text-gray-600">PAN: {businessProfile.panNumber}</p>
                <p className="text-gray-600">FSSAI: {businessProfile.fssaiNumber}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-gray-400" />
              <div className="text-sm">
                <p className="text-gray-600">WS Code: {businessProfile.wsCode}</p>
                <p className="text-gray-600">State Code: {businessProfile.address.stateCode}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">Business Hours</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Mon-Fri</p>
              <p className="font-medium">{businessProfile.businessHours.weekdays}</p>
            </div>
            <div>
              <p className="text-gray-600">Saturday</p>
              <p className="font-medium">{businessProfile.businessHours.saturday}</p>
            </div>
            <div>
              <p className="text-gray-600">Sunday</p>
              <p className="font-medium">{businessProfile.businessHours.sunday}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">Service Categories</h4>
          <div className="flex flex-wrap gap-2">
            {businessProfile.categories.map((category, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessCard;