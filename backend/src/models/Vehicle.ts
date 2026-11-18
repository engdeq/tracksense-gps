import { Schema, model, type InferSchemaType } from 'mongoose';

const vehicleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    plateNumber: { type: String, required: true, trim: true, uppercase: true },
    brand: { type: String, default: '' },
    model: { type: String, default: '' },
    year: { type: Number, default: null },
    color: { type: String, default: '' },
    vin: { type: String, default: '' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    vehicleTypeId: { type: Schema.Types.ObjectId, ref: 'VehicleType', required: true },
    iconId: { type: Schema.Types.ObjectId, ref: 'VehicleIcon', default: null },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', default: null },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    motionStatus: {
      type: String,
      enum: ['moving', 'stopped', 'offline', 'speeding', 'engine'],
      default: 'offline',
    },
    speedLimitKmh: { type: Number, default: 120 },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

vehicleSchema.index({ customerId: 1, plateNumber: 1 }, { unique: true });
vehicleSchema.index({ deviceId: 1 });
vehicleSchema.index({ motionStatus: 1 });
vehicleSchema.index({ name: 'text', plateNumber: 'text', brand: 'text', model: 'text' });

export type VehicleDocument = InferSchemaType<typeof vehicleSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Vehicle = model('Vehicle', vehicleSchema);
