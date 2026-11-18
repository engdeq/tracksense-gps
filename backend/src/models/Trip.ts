import { Schema, model, type InferSchemaType } from 'mongoose';

const tripSchema = new Schema(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', default: null },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    startLatitude: { type: Number, required: true },
    startLongitude: { type: Number, required: true },
    endLatitude: { type: Number, default: null },
    endLongitude: { type: Number, default: null },
    startAddress: { type: String, default: '' },
    endAddress: { type: String, default: '' },
    distanceKm: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
    avgSpeedKmh: { type: Number, default: 0 },
    maxSpeedKmh: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
  },
  { timestamps: true },
);

tripSchema.index({ vehicleId: 1, startTime: -1 });
tripSchema.index({ customerId: 1, startTime: -1 });
tripSchema.index({ status: 1 });

export type TripDocument = InferSchemaType<typeof tripSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Trip = model('Trip', tripSchema);
