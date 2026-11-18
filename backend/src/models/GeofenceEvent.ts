import { Schema, model, type InferSchemaType } from 'mongoose';

const geofenceEventSchema = new Schema(
  {
    geofenceId: { type: Schema.Types.ObjectId, ref: 'Geofence', required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', default: null },
    eventType: { type: String, enum: ['entry', 'exit'], required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speedKmh: { type: Number, default: 0 },
    recordedAt: { type: Date, required: true },
    positionSource: { type: String, default: 'device' },
    positionId: { type: Schema.Types.ObjectId, ref: 'Position', default: null },
    alertId: { type: Schema.Types.ObjectId, ref: 'Alert', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

geofenceEventSchema.index({ geofenceId: 1, recordedAt: -1 });
geofenceEventSchema.index({ vehicleId: 1, recordedAt: -1 });
geofenceEventSchema.index({ customerId: 1, recordedAt: -1 });
geofenceEventSchema.index({ eventType: 1, recordedAt: -1 });
/** Dedup guard: same vehicle+geofence+type within a short window handled in service; also unique-ish lookup */
geofenceEventSchema.index({ geofenceId: 1, vehicleId: 1, eventType: 1, recordedAt: -1 });

export type GeofenceEventDocument = InferSchemaType<typeof geofenceEventSchema> & {
  _id: Schema.Types.ObjectId;
};
export const GeofenceEvent = model('GeofenceEvent', geofenceEventSchema);
