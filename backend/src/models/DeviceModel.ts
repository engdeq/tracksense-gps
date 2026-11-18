import { Schema, model, type InferSchemaType } from 'mongoose';

const deviceModelSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    manufacturer: { type: String, required: true, trim: true },
    protocolId: { type: Schema.Types.ObjectId, ref: 'DeviceProtocol', default: null },
    /** Legacy string key kept for compatibility with existing devices/seed. */
    protocolKey: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

deviceModelSchema.index({ manufacturer: 1, isActive: 1 });

export type DeviceModelDocument = InferSchemaType<typeof deviceModelSchema> & {
  _id: Schema.Types.ObjectId;
};
export const DeviceModel = model('DeviceModel', deviceModelSchema);
