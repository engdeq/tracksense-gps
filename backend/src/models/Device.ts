import { Schema, model, type InferSchemaType } from 'mongoose';

const deviceSchema = new Schema(
  {
    imei: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    deviceModelId: { type: Schema.Types.ObjectId, ref: 'DeviceModel', required: true },
    protocolId: { type: Schema.Types.ObjectId, ref: 'DeviceProtocol', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    simNumber: { type: String, default: '' },
    simIccid: { type: String, default: '' },
    simOperator: { type: String, default: '' },
    connectionStatus: {
      type: String,
      enum: ['online', 'offline'],
      default: 'offline',
    },
    lastCommunicationAt: { type: Date, default: null },
    firmwareVersion: { type: String, default: '' },
    notes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

deviceSchema.index({ customerId: 1 });
deviceSchema.index({ vehicleId: 1 });
deviceSchema.index({ connectionStatus: 1 });
deviceSchema.index({ name: 'text', imei: 'text' });

export type DeviceDocument = InferSchemaType<typeof deviceSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Device = model('Device', deviceSchema);
