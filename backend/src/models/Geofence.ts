import { Schema, model, type InferSchemaType } from 'mongoose';

const pointSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false },
);

const geofenceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', default: null },
    cityId: { type: Schema.Types.ObjectId, ref: 'City', default: null },
    type: { type: String, enum: ['circle', 'polygon', 'rectangle'], required: true },
    color: { type: String, default: '#5577E8' },
    /** Circle center */
    center: { type: pointSchema, default: null },
    /** Circle radius in meters */
    radiusMeters: { type: Number, default: null },
    /**
     * Polygon / rectangle ring as [lng, lat] pairs (GeoJSON order).
     * First and last point should be equal for a closed ring.
     */
    coordinates: {
      type: [[Number]],
      default: [],
    },
    /** Optional GeoJSON geometry for 2dsphere queries */
    geometry: {
      type: { type: String, enum: ['Point', 'Polygon'], default: undefined },
      coordinates: { type: Schema.Types.Mixed, default: undefined },
    },
    assignedVehicleIds: [{ type: Schema.Types.ObjectId, ref: 'Vehicle' }],
    alertSettings: {
      enabled: { type: Boolean, default: true },
      onEntry: { type: Boolean, default: true },
      onExit: { type: Boolean, default: true },
    },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

geofenceSchema.index({ customerId: 1, isActive: 1 });
geofenceSchema.index({ assignedVehicleIds: 1, isActive: 1 });
geofenceSchema.index({ countryId: 1, cityId: 1 });
/** GeoJSON geometry for geospatial queries when present */
geofenceSchema.index({ geometry: '2dsphere' });
geofenceSchema.index({ name: 'text', description: 'text' });

export type GeofenceDocument = InferSchemaType<typeof geofenceSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Geofence = model('Geofence', geofenceSchema);
