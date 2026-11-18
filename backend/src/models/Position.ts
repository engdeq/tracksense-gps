import { Schema, model, type InferSchemaType } from 'mongoose';

const positionSchema = new Schema(
  {
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    imei: { type: String, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    altitude: { type: Number, default: 0 },
    speedKmh: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    satellites: { type: Number, default: 0 },
    ignition: { type: Boolean, default: false },
    address: { type: String, default: '' },
    recordedAt: { type: Date, required: true },
    receivedAt: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ['device', 'import', 'manual'],
      default: 'device',
    },
  },
  { timestamps: false },
);

positionSchema.index({ vehicleId: 1, recordedAt: -1 });
positionSchema.index({ deviceId: 1, recordedAt: -1 });
positionSchema.index({ customerId: 1, recordedAt: -1 });
positionSchema.index({ recordedAt: -1 });

export type PositionDocument = InferSchemaType<typeof positionSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Position = model('Position', positionSchema);
