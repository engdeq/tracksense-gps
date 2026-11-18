import { Schema, model, type InferSchemaType } from 'mongoose';

/** Tracks whether a vehicle is currently inside a geofence for transition detection. */
const geofencePresenceSchema = new Schema(
  {
    geofenceId: { type: Schema.Types.ObjectId, ref: 'Geofence', required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    inside: { type: Boolean, required: true },
    lastEvaluatedAt: { type: Date, required: true },
    lastLatitude: { type: Number, default: null },
    lastLongitude: { type: Number, default: null },
  },
  { timestamps: true },
);

geofencePresenceSchema.index({ geofenceId: 1, vehicleId: 1 }, { unique: true });
geofencePresenceSchema.index({ vehicleId: 1 });

export type GeofencePresenceDocument = InferSchemaType<typeof geofencePresenceSchema> & {
  _id: Schema.Types.ObjectId;
};
export const GeofencePresence = model('GeofencePresence', geofencePresenceSchema);
