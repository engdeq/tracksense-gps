import { Schema, model, type InferSchemaType } from 'mongoose';

const mapSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    provider: { type: String, enum: ['osm', 'google'], default: 'google' },
    mapStyle: { type: String, default: 'normal' },
    defaultLat: { type: Number, default: 24.7136 },
    defaultLng: { type: Number, default: 46.6753 },
    defaultZoom: { type: Number, default: 6 },
    minZoom: { type: Number, default: 3 },
    maxZoom: { type: Number, default: 19 },
    tileProvider: { type: String, default: 'osm' },
    clusteringEnabled: { type: Boolean, default: true },
    showVehicleLabels: { type: Boolean, default: true },
    refreshIntervalSeconds: { type: Number, default: 20 },
    offlineThresholdMinutes: { type: Number, default: 10 },
    googleMapsApiKey: { type: String, default: '' },
  },
  { timestamps: true },
);

export type MapSettingsDocument = InferSchemaType<typeof mapSettingsSchema> & {
  _id: Schema.Types.ObjectId;
};
export const MapSettings = model('MapSettings', mapSettingsSchema);
